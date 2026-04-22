import { and, eq } from "drizzle-orm";

import { job } from "@/db/schema";
import { db } from "@/lib/db";
import { ensureDefaultJobForOrganization } from "@/lib/recruiting/ensure-defaults";

/** Resolves the org default job id, creating default pipeline/job when needed. */
export async function getDefaultJobIdForOrganization(
  organizationId: string,
): Promise<string> {
  return ensureDefaultJobForOrganization(organizationId);
}

/** Whether a job belongs to the organization (for member-scoped API checks). */
export async function jobBelongsToOrganization(
  jobId: string,
  organizationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: job.id })
    .from(job)
    .where(and(eq(job.id, jobId), eq(job.organizationId, organizationId)))
    .limit(1);
  return row != null;
}
