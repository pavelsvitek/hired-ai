import "dotenv/config";
import crypto from "node:crypto";

import { eq } from "drizzle-orm";

import { organization, organizationDomain } from "@/db/schema";
import { db } from "@/lib/db";

async function main() {
  const domain = "pavelsvitek.com";

  const [existingOrg] = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, "pavel-inc"))
    .limit(1);

  if (existingOrg) {
    console.log("Seed skipped: organization slug `pavel-inc` already exists.");
    return;
  }

  const orgId = crypto.randomUUID();

  await db.insert(organization).values({
    id: orgId,
    name: "Pavel INC",
    slug: "pavel-inc",
    logo: null,
    createdAt: new Date(),
    metadata: null,
  });

  await db.insert(organizationDomain).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    domain,
  });

  console.log(
    `Seeded organization ${orgId} with email domain @${domain} (e.g. you@${domain}).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
