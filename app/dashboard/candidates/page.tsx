import { headers } from "next/headers";

import { CandidatesPageClient } from "@/components/candidates-page-client";
import {
  publicOriginFromHeaders,
  requireUserAndOrg,
} from "@/lib/dashboard-org";
import {
  getDefaultJobIdForOrganization,
  jobBelongsToOrganization,
} from "@/lib/recruiting/get-default-job-id-for-org";
import { loadCandidatesForDashboard } from "@/lib/recruiting/load-candidates-dashboard";
import { loadJobsForDashboard } from "@/lib/recruiting/load-jobs-dashboard";

type PageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function CandidatesPage({ searchParams }: PageProps) {
  const { organizationId } = await requireUserAndOrg();

  const sp = (await searchParams) ?? {};
  const requested = typeof sp.jobId === "string" ? sp.jobId : undefined;

  let defaultJobId = "";
  let serverJobId = "";
  let rows = [] as Awaited<ReturnType<typeof loadCandidatesForDashboard>>;
  let jobChoices: { id: string; title: string }[] = [];

  if (organizationId) {
    defaultJobId = await getDefaultJobIdForOrganization(organizationId);
    serverJobId = defaultJobId;
    if (
      requested &&
      (await jobBelongsToOrganization(requested, organizationId))
    ) {
      serverJobId = requested;
    }
    const [candidates, jobs] = await Promise.all([
      loadCandidatesForDashboard(organizationId, serverJobId),
      loadJobsForDashboard(organizationId),
    ]);
    rows = candidates;
    jobChoices = jobs.map((j) => ({ id: j.id, title: j.title }));
  }

  const hdrs = await headers();
  const origin = publicOriginFromHeaders(hdrs);

  return (
    <CandidatesPageClient
      organizationId={organizationId}
      origin={origin}
      rows={rows}
      defaultJobId={defaultJobId}
      serverJobId={serverJobId}
      jobChoices={jobChoices}
    />
  );
}
