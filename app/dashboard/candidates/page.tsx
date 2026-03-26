import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";

import { CandidatesPageClient } from "@/components/candidates-page-client";
import { candidate } from "@/db/schema";
import {
  publicOriginFromHeaders,
  requireUserAndOrg,
} from "@/lib/dashboard-org";
import { db } from "@/lib/db";

export default async function CandidatesPage() {
  const { organizationId } = await requireUserAndOrg();

  const rows = organizationId
    ? await db
        .select()
        .from(candidate)
        .where(eq(candidate.organizationId, organizationId))
        .orderBy(desc(candidate.updatedAt))
    : [];

  const hdrs = await headers();
  const origin = publicOriginFromHeaders(hdrs);

  return (
    <CandidatesPageClient
      organizationId={organizationId}
      origin={origin}
      rows={rows}
    />
  );
}
