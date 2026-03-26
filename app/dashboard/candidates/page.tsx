import { headers } from "next/headers";

import { CandidatesPageClient } from "@/components/candidates-page-client";
import {
  publicOriginFromHeaders,
  requireUserAndOrg,
} from "@/lib/dashboard-org";
import { loadCandidatesForDashboard } from "@/lib/recruiting/load-candidates-dashboard";

export default async function CandidatesPage() {
  const { organizationId } = await requireUserAndOrg();

  const rows = organizationId
    ? await loadCandidatesForDashboard(organizationId)
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
