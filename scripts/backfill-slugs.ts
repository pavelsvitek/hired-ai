import "dotenv/config";

import { eq, sql } from "drizzle-orm";

import { job, organization } from "@/db/schema";
import { db } from "@/lib/db";

const SLUG_MAX_ORG = 80;
const SLUG_MAX_JOB = 120;

function slugify(raw: string, maxLen: number): string {
  const t = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!t) return "";
  return t.length > maxLen ? t.slice(0, maxLen).replace(/-+$/g, "") : t;
}

async function orgSlugTaken(slug: string, exceptOrgId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  return row != null && row.id !== exceptOrgId;
}

async function allocateOrgSlug(base: string, orgId: string): Promise<string> {
  let candidate = base || `org-${orgId.slice(0, 8)}`;
  candidate = slugify(candidate, SLUG_MAX_ORG) || `org-${orgId.slice(0, 8)}`;
  let suffix = 0;
  for (;;) {
    const trySlug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    if (!(await orgSlugTaken(trySlug, orgId))) {
      return trySlug;
    }
    suffix += 1;
  }
}

async function jobExternalSlugTaken(
  slug: string,
  exceptJobId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: job.id })
    .from(job)
    .where(eq(job.externalSlug, slug))
    .limit(1);
  return row != null && row.id !== exceptJobId;
}

async function allocateJobExternalSlug(
  base: string,
  jobId: string,
): Promise<string> {
  let candidate = slugify(base, SLUG_MAX_JOB) || `job-${jobId.slice(0, 8)}`;
  let suffix = 0;
  for (;;) {
    const trySlug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const finalSlug =
      trySlug.length > SLUG_MAX_JOB
        ? trySlug.slice(0, SLUG_MAX_JOB).replace(/-+$/g, "")
        : trySlug;
    if (!(await jobExternalSlugTaken(finalSlug, jobId))) {
      return finalSlug;
    }
    suffix += 1;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const emptyOrgSlugCondition = sql`trim(${organization.slug}) = ''`;

  const orgsToFix = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(emptyOrgSlugCondition);

  let orgUpdated = 0;
  for (const org of orgsToFix) {
    const base = slugify(org.name, SLUG_MAX_ORG) || `org-${org.id.slice(0, 8)}`;
    const newSlug = await allocateOrgSlug(base, org.id);
    await db
      .update(organization)
      .set({ slug: newSlug })
      .where(eq(organization.id, org.id));
    console.log(`Organization ${org.id}: slug "${org.slug || ""}" → "${newSlug}"`);
    orgUpdated += 1;
  }

  const emptyJobSlugCondition = sql`( ${job.externalSlug} is null or trim(${job.externalSlug}) = '' )`;

  const jobsToFix = await db
    .select({
      id: job.id,
      organizationId: job.organizationId,
      title: job.title,
    })
    .from(job)
    .where(emptyJobSlugCondition);

  const orgSlugById = new Map(
    (await db.select({ id: organization.id, slug: organization.slug }).from(organization)).map(
      (r) => [r.id, r.slug] as const,
    ),
  );

  let jobUpdated = 0;
  for (const j of jobsToFix) {
    const orgSlug = orgSlugById.get(j.organizationId) ?? "org";
    const titlePart = slugify(j.title, 60);
    const base =
      titlePart.length > 0
        ? `${orgSlug}-${titlePart}`.slice(0, SLUG_MAX_JOB)
        : `${orgSlug}-job-${j.id.slice(0, 8)}`.slice(0, SLUG_MAX_JOB);
    const newSlug = await allocateJobExternalSlug(base, j.id);
    await db
      .update(job)
      .set({ externalSlug: newSlug, updatedAt: new Date() })
      .where(eq(job.id, j.id));
    console.log(`Job ${j.id}: external slug set to "${newSlug}"`);
    jobUpdated += 1;
  }

  console.log(
    `Done. Updated ${orgUpdated} organization(s), ${jobUpdated} job(s).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
