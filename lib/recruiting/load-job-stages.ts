import { asc, eq } from "drizzle-orm";

import { job, pipelineStage } from "@/db/schema";
import type { PipelineStageBrief } from "@/models/candidate/types";
import { db } from "@/lib/db";

/**
 * Ordered pipeline stages for a job's pipeline (for kanban / move validation).
 */
export async function loadPipelineStagesForJob(
  organizationId: string,
  jobId: string,
): Promise<PipelineStageBrief[] | null> {
  const [jobRow] = await db
    .select({
      pipelineId: job.pipelineId,
      organizationId: job.organizationId,
    })
    .from(job)
    .where(eq(job.id, jobId))
    .limit(1);

  if (!jobRow || jobRow.organizationId !== organizationId) {
    return null;
  }

  return loadPipelineStagesForPipelineId(jobRow.pipelineId);
}

export async function loadPipelineStagesForPipelineId(
  pipelineId: string,
): Promise<PipelineStageBrief[]> {
  const stages = await db
    .select({
      id: pipelineStage.id,
      name: pipelineStage.name,
      sortOrder: pipelineStage.sortOrder,
    })
    .from(pipelineStage)
    .where(eq(pipelineStage.pipelineId, pipelineId))
    .orderBy(asc(pipelineStage.sortOrder));

  return stages.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
  }));
}
