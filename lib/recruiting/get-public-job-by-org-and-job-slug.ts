import { and, eq, type InferSelectModel } from "drizzle-orm";

import { job, organization, type JobRowSelect } from "@/db/schema";
import { db } from "@/lib/db";

export type PublicJobPayload = {
  job: JobRowSelect;
  organization: Pick<
    InferSelectModel<typeof organization>,
    "id" | "name" | "slug"
  >;
};

export async function getPublicPublishedJobByOrgAndJobSlug(
  orgSlug: string,
  jobSlug: string,
): Promise<PublicJobPayload | null> {
  const [row] = await db
    .select({
      job,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    })
    .from(organization)
    .innerJoin(
      job,
      and(
        eq(job.organizationId, organization.id),
        eq(job.externalSlug, jobSlug),
        eq(job.status, "published"),
      ),
    )
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!row) return null;
  return { job: row.job, organization: row.organization };
}
