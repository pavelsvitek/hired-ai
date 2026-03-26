import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import {
  candidateApplication,
  job,
  pipeline,
  pipelineStage,
} from "@/db/schema";
import {
  DEFAULT_APPLIED_STAGE_ID,
  DEFAULT_JOB_TITLE,
  DEFAULT_PIPELINE_ID,
  DEFAULT_PIPELINE_SLUG,
  DEFAULT_PIPELINE_STAGE_IDS,
  DEFAULT_STAGE_NAMES,
} from "@/lib/recruiting/constants";
import { db } from "@/lib/db";

export async function ensureDefaultPipeline(): Promise<void> {
  const [existing] = await db
    .select({ id: pipeline.id })
    .from(pipeline)
    .where(eq(pipeline.slug, DEFAULT_PIPELINE_SLUG))
    .limit(1);

  if (existing) return;

  await db.insert(pipeline).values({
    id: DEFAULT_PIPELINE_ID,
    slug: DEFAULT_PIPELINE_SLUG,
    name: "Default pipeline",
    createdAt: new Date(),
  });

  await db.insert(pipelineStage).values(
    DEFAULT_STAGE_NAMES.map((name, i) => ({
      id: DEFAULT_PIPELINE_STAGE_IDS[i],
      pipelineId: DEFAULT_PIPELINE_ID,
      sortOrder: i,
      name,
    })),
  );
}

export async function ensureDefaultJobForOrganization(
  organizationId: string,
): Promise<string> {
  await ensureDefaultPipeline();

  const [row] = await db
    .select({ id: job.id })
    .from(job)
    .where(and(eq(job.organizationId, organizationId), eq(job.isDefault, true)))
    .limit(1);

  if (row) return row.id;

  const id = randomUUID();
  await db.insert(job).values({
    id,
    organizationId,
    title: DEFAULT_JOB_TITLE,
    pipelineId: DEFAULT_PIPELINE_ID,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return id;
}

/** Links candidate to org default job at "Applied" if missing. */
export async function ensureDefaultApplicationForCandidate(
  candidateId: string,
  organizationId: string,
): Promise<void> {
  const jobId = await ensureDefaultJobForOrganization(organizationId);

  const [existing] = await db
    .select({ id: candidateApplication.id })
    .from(candidateApplication)
    .where(
      and(
        eq(candidateApplication.candidateId, candidateId),
        eq(candidateApplication.jobId, jobId),
      ),
    )
    .limit(1);

  if (existing) return;

  await db.insert(candidateApplication).values({
    id: randomUUID(),
    candidateId,
    jobId,
    pipelineStageId: DEFAULT_APPLIED_STAGE_ID,
    updatedAt: new Date(),
  });
}
