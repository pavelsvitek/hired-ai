import Link from "next/link";

import { JobCreateForm } from "@/components/job-create-form";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { requireUserAndOrg } from "@/lib/dashboard-org";
import { DEFAULT_PIPELINE_ID } from "@/lib/recruiting/constants";
import { loadPipelineOptions } from "@/lib/recruiting/load-pipeline-options";

export default async function NewJobPage() {
  const { organizationId } = await requireUserAndOrg();

  const pipelines =
    organizationId != null ? await loadPipelineOptions() : [];

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
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard/jobs">Jobs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>New job</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {organizationId == null ? (
          <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-muted-foreground">
            <p className="text-sm">
              You need an organization membership to create a job.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                Create job
              </h1>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/jobs">Back to jobs</Link>
              </Button>
            </div>
            <JobCreateForm
              organizationId={organizationId}
              pipelines={pipelines}
              defaultPipelineId={DEFAULT_PIPELINE_ID}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
