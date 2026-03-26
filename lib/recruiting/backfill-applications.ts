import { sql } from "drizzle-orm";

import { DEFAULT_APPLIED_STAGE_ID } from "@/lib/recruiting/constants";
import { ensureDefaultJobForOrganization } from "@/lib/recruiting/ensure-defaults";
import { db } from "@/lib/db";

/** Bulk-creates default-job applications for candidates in the org that have none. */
export async function backfillMissingApplicationsForOrg(
  organizationId: string,
): Promise<void> {
  await ensureDefaultJobForOrganization(organizationId);

  await db.execute(sql`
    INSERT INTO "candidate_application" ("id", "candidate_id", "job_id", "pipeline_stage_id", "updated_at")
    SELECT gen_random_uuid()::text, c."id", j."id", ${DEFAULT_APPLIED_STAGE_ID}, now()
    FROM "candidate" c
    INNER JOIN "job" j ON j."organization_id" = c."organization_id" AND j."is_default" = true
    WHERE c."organization_id" = ${organizationId}
    AND NOT EXISTS (
      SELECT 1 FROM "candidate_application" ca WHERE ca."candidate_id" = c."id"
    )
  `);
}
