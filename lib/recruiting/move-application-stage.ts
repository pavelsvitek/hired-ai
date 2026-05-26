import { and, eq } from "drizzle-orm";

import { candidate, candidateApplication, job, pipelineStage } from "@/db/schema";
import { db } from "@/lib/db";

export type MoveApplicationErrorCode =
  | "candidate_not_found"
  | "wrong_organization"
  | "job_not_found"
  | "invalid_stage"
  | "application_not_found";

export type MoveApplicationResult =
  | { ok: true }
  | { ok: false; code: MoveApplicationErrorCode; message: string };

/**
 * Updates a candidate's application to a new pipeline stage (same invariants as
 * PATCH /api/candidates/:id/application/stage), scoped by explicit organization.
 */
export async function moveApplicationToStage(params: {
  organizationId: string;
  candidateId: string;
  jobId: string;
  pipelineStageId: string;
}): Promise<MoveApplicationResult> {
  const { organizationId, candidateId, jobId, pipelineStageId } = params;

  const [cand] = await db
    .select({
      organizationId: candidate.organizationId,
    })
    .from(candidate)
    .where(eq(candidate.id, candidateId))
    .limit(1);

  if (!cand) {
    return {
      ok: false,
      code: "candidate_not_found",
      message: "Candidate not found",
    };
  }

  if (cand.organizationId !== organizationId) {
    return {
      ok: false,
      code: "wrong_organization",
      message: "Candidate does not belong to this organization",
    };
  }

  const [jobRow] = await db
    .select({
      id: job.id,
      pipelineId: job.pipelineId,
      organizationId: job.organizationId,
    })
    .from(job)
    .where(eq(job.id, jobId))
    .limit(1);

  if (!jobRow || jobRow.organizationId !== organizationId) {
    return {
      ok: false,
      code: "job_not_found",
      message: "Job not found",
    };
  }

  const [stageRow] = await db
    .select({ id: pipelineStage.id })
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.id, pipelineStageId),
        eq(pipelineStage.pipelineId, jobRow.pipelineId),
      ),
    )
    .limit(1);

  if (!stageRow) {
    return {
      ok: false,
      code: "invalid_stage",
      message: "Stage is not part of this job's pipeline",
    };
  }

  const [updated] = await db
    .update(candidateApplication)
    .set({
      pipelineStageId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(candidateApplication.candidateId, candidateId),
        eq(candidateApplication.jobId, jobId),
      ),
    )
    .returning({ id: candidateApplication.id });

  if (!updated) {
    return {
      ok: false,
      code: "application_not_found",
      message: "Application not found",
    };
  }

  return { ok: true };
}
