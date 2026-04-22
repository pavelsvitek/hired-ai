import { and, eq } from "drizzle-orm";

import { job, organization, pipeline } from "@/db/schema";
import { db } from "@/lib/db";
import type { JobDetail } from "@/models/job/types";

export async function loadJobForDashboard(
  organizationId: string,
  jobId: string,
): Promise<JobDetail | null> {
  const [row] = await db
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
      summary: job.summary,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      payPeriod: job.payPeriod,
      publishedAt: job.publishedAt,
      pipelineName: pipeline.name,
      organizationSlug: organization.slug,
    })
    .from(job)
    .innerJoin(pipeline, eq(pipeline.id, job.pipelineId))
    .innerJoin(organization, eq(organization.id, job.organizationId))
    .where(and(eq(job.id, jobId), eq(job.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}
