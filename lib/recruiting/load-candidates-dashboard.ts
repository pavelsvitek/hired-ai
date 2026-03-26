import { and, asc, desc, eq } from "drizzle-orm";

import {
  candidate,
  candidateApplication,
  job,
  pipelineStage,
} from "@/db/schema";
import { DEFAULT_PIPELINE_ID } from "@/lib/recruiting/constants";
import { backfillMissingApplicationsForOrg } from "@/lib/recruiting/backfill-applications";
import type { CandidateListRow } from "@/models/candidate/types";
import { db } from "@/lib/db";

export async function loadCandidatesForDashboard(
  organizationId: string,
): Promise<CandidateListRow[]> {
  await backfillMissingApplicationsForOrg(organizationId);

  const stages = await db
    .select({
      id: pipelineStage.id,
      name: pipelineStage.name,
      sortOrder: pipelineStage.sortOrder,
    })
    .from(pipelineStage)
    .where(eq(pipelineStage.pipelineId, DEFAULT_PIPELINE_ID))
    .orderBy(asc(pipelineStage.sortOrder));

  const stageBriefs = stages.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
  }));

  const rows = await db
    .select({
      candidate,
      jobId: job.id,
      jobTitle: job.title,
      stageId: pipelineStage.id,
      stageName: pipelineStage.name,
      stageOrder: pipelineStage.sortOrder,
    })
    .from(candidate)
    .innerJoin(
      job,
      and(
        eq(job.organizationId, candidate.organizationId),
        eq(job.isDefault, true),
      ),
    )
    .innerJoin(
      candidateApplication,
      and(
        eq(candidateApplication.candidateId, candidate.id),
        eq(candidateApplication.jobId, job.id),
      ),
    )
    .innerJoin(
      pipelineStage,
      eq(pipelineStage.id, candidateApplication.pipelineStageId),
    )
    .where(eq(candidate.organizationId, organizationId))
    .orderBy(desc(candidate.updatedAt));

  return rows.map((r) => ({
    ...r.candidate,
    recruitment: {
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      stage: {
        id: r.stageId,
        name: r.stageName,
        sortOrder: r.stageOrder,
      },
      stages: stageBriefs,
    },
  }));
}
