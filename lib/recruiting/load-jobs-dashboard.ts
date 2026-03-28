import { desc, eq } from "drizzle-orm";

import { job, pipeline } from "@/db/schema";
import { db } from "@/lib/db";
import type { JobListRow } from "@/models/job/types";

export async function loadJobsForDashboard(
  organizationId: string,
): Promise<JobListRow[]> {
  const rows = await db
    .select({
      id: job.id,
      title: job.title,
      status: job.status,
      workplaceType: job.workplaceType,
      locationLabel: job.locationLabel,
      employmentType: job.employmentType,
      isDefault: job.isDefault,
      externalSlug: job.externalSlug,
      updatedAt: job.updatedAt,
      pipelineName: pipeline.name,
    })
    .from(job)
    .innerJoin(pipeline, eq(pipeline.id, job.pipelineId))
    .where(eq(job.organizationId, organizationId))
    .orderBy(desc(job.updatedAt));

  return rows;
}
