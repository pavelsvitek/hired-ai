import Link from "next/link";
import { headers } from "next/headers";

import { DashboardShell } from "@/components/dashboard-shell";
import { JobsPageContent } from "@/components/jobs-page-content";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  publicOriginFromHeaders,
  requireUserAndOrg,
} from "@/lib/dashboard-org";
import { loadJobsForDashboard } from "@/lib/recruiting/load-jobs-dashboard";

export default async function JobsPage() {
  const { organizationId } = await requireUserAndOrg();

  const jobs =
    organizationId != null
      ? await loadJobsForDashboard(organizationId)
      : [];

  const hdrs = await headers();
  const origin = publicOriginFromHeaders(hdrs);

  return (
    <DashboardShell
      organizationId={organizationId}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Jobs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      headerAction={
        organizationId ? (
          <Button size="sm" asChild>
            <Link href="/dashboard/jobs/new">New job</Link>
          </Button>
        ) : null
      }
    >
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <JobsPageContent
          organizationId={organizationId}
          jobs={jobs}
          origin={origin}
        />
      </div>
    </DashboardShell>
  );
}
