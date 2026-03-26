import "dotenv/config";

import { organization } from "@/db/schema";
import { backfillMissingApplicationsForOrg } from "@/lib/recruiting/backfill-applications";
import { ensureDefaultPipeline } from "@/lib/recruiting/ensure-defaults";
import { db } from "@/lib/db";

async function main() {
  await ensureDefaultPipeline();

  const orgs = await db.select({ id: organization.id }).from(organization);

  if (orgs.length === 0) {
    console.log("No organizations found; nothing to backfill.");
    return;
  }

  for (const { id } of orgs) {
    await backfillMissingApplicationsForOrg(id);
    console.log(`Backfilled applications for organization ${id}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
