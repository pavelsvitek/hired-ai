import { and, asc, eq } from "drizzle-orm";

import {
  candidate,
  candidateApplication,
  job,
  pipelineStage,
} from "@/db/schema";
import { loadPipelineStagesForPipelineId } from "@/lib/recruiting/load-job-stages";
import type { CandidateRowSelect } from "@/db/schema/candidate";
import type { PipelineStageBrief } from "@/models/candidate/types";
import { db } from "@/lib/db";

export type CandidateApplicationSummary = {
  jobId: string;
  jobTitle: string;
  stage: PipelineStageBrief;
  stages: PipelineStageBrief[];
};

export type CandidateDetailPayload = {
  candidate: CandidateRowSelect;
  /** Relative URL for authenticated download of the CV (no bytes in MCP). */
  cvUrl: string;
  applications: CandidateApplicationSummary[];
};

/**
 * Full candidate row for an org, plus per-job application + stage context.
 * Does not read CV file contents.
 */
export async function loadCandidateDetail(
  organizationId: string,
  candidateId: string,
): Promise<CandidateDetailPayload | null> {
  const [cand] = await db
    .select()
    .from(candidate)
    .where(
      and(
        eq(candidate.id, candidateId),
        eq(candidate.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!cand) {
    return null;
  }

  const applicationRows = await db
    .select({
      jobId: job.id,
      jobTitle: job.title,
      pipelineId: job.pipelineId,
      stageId: pipelineStage.id,
      stageName: pipelineStage.name,
      stageOrder: pipelineStage.sortOrder,
    })
    .from(candidateApplication)
    .innerJoin(job, eq(job.id, candidateApplication.jobId))
    .innerJoin(
      pipelineStage,
      eq(pipelineStage.id, candidateApplication.pipelineStageId),
    )
    .where(
      and(
        eq(candidateApplication.candidateId, candidateId),
        eq(job.organizationId, organizationId),
      ),
    )
    .orderBy(asc(job.title));

  const applications: CandidateApplicationSummary[] = [];
  for (const row of applicationRows) {
    const stages = await loadPipelineStagesForPipelineId(row.pipelineId);
    applications.push({
      jobId: row.jobId,
      jobTitle: row.jobTitle,
      stage: {
        id: row.stageId,
        name: row.stageName,
        sortOrder: row.stageOrder,
      },
      stages,
    });
  }

  return {
    candidate: cand,
    cvUrl: `/api/candidates/${candidateId}/cv`,
    applications,
  };
}
