import { and, desc, eq } from "drizzle-orm";

import {
  candidate,
  candidateApplication,
  job,
  pipelineStage,
} from "@/db/schema";
import { backfillMissingApplicationsForOrg } from "@/lib/recruiting/backfill-applications";
import { loadPipelineStagesForPipelineId } from "@/lib/recruiting/load-job-stages";
import type { CandidateListRow } from "@/models/candidate/types";
import { db } from "@/lib/db";

export type LoadCandidatesForDashboardOptions = {
  /** When true, skip the org backfill write (e.g. MCP read tools). */
  skipBackfill?: boolean;
};

export async function loadCandidatesForDashboard(
  organizationId: string,
  jobId: string,
  options?: LoadCandidatesForDashboardOptions,
): Promise<CandidateListRow[]> {
  if (!options?.skipBackfill) {
    await backfillMissingApplicationsForOrg(organizationId);
  }

  const [jobRow] = await db
    .select({
      id: job.id,
      title: job.title,
      pipelineId: job.pipelineId,
    })
    .from(job)
    .where(and(eq(job.id, jobId), eq(job.organizationId, organizationId)))
    .limit(1);

  if (!jobRow) {
    return [];
  }

  const stageBriefs = await loadPipelineStagesForPipelineId(jobRow.pipelineId);

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
      candidateApplication,
      and(
        eq(candidateApplication.candidateId, candidate.id),
        eq(candidateApplication.jobId, jobId),
      ),
    )
    .innerJoin(
      job,
      and(
        eq(job.id, jobId),
        eq(job.organizationId, candidate.organizationId),
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
