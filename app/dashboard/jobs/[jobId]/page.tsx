import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { JobDetailHeaderActions } from "@/components/job-detail-header-actions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  publicOriginFromHeaders,
  requireUserAndOrg,
} from "@/lib/dashboard-org";
import { loadJobForDashboard } from "@/lib/recruiting/load-job-for-dashboard";
import { formatWorkplaceLabel } from "@/lib/recruiting/workplace-types";

function formatCell(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return value;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const { organizationId } = await requireUserAndOrg();

  const hdrs = await headers();
  const origin = publicOriginFromHeaders(hdrs);

  if (!organizationId) {
    return (
      <DashboardShell
        organizationId={null}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Job</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      >
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-muted-foreground">
            <p className="text-sm">
              You need an organization membership to view this job.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const job = await loadJobForDashboard(organizationId, jobId);
  if (!job) {
    notFound();
  }

  const publicUrl =
    job.externalSlug != null && job.externalSlug !== ""
      ? `${origin}/o/${job.organizationSlug}/careers/${job.externalSlug}`
      : "";

  const salaryParts: string[] = [];
  if (job.salaryMin != null || job.salaryMax != null) {
    const cur = job.salaryCurrency ?? "";
    const min = job.salaryMin != null ? job.salaryMin.toLocaleString() : "—";
    const max = job.salaryMax != null ? job.salaryMax.toLocaleString() : "—";
    salaryParts.push(
      cur ? `${cur} ${min} – ${max}` : `${min} – ${max}`,
    );
    if (job.payPeriod) {
      salaryParts.push(job.payPeriod.replaceAll("_", " "));
    }
  }

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
              <BreadcrumbPage className="max-w-[16rem] truncate md:max-w-[28rem]">
                {job.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {job.title}
            </h1>
            {job.isDefault ? (
              <p className="mt-1 text-xs font-medium text-primary">
                Default job for this organization
              </p>
            ) : null}
          </div>
          <div className="sm:ml-4">
            <JobDetailHeaderActions
              jobId={job.id}
              organizationId={organizationId}
              status={job.status}
              externalSlug={job.externalSlug}
              publicUrl={publicUrl}
            />
          </div>
        </div>

        <div className="grid gap-6 rounded-xl border bg-card p-6 text-sm md:grid-cols-2">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd className="mt-0.5 capitalize text-foreground">
                {formatCell(job.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pipeline
              </dt>
              <dd className="mt-0.5 text-foreground">{job.pipelineName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Workplace
              </dt>
              <dd className="mt-0.5 text-foreground">
                {job.workplaceType
                  ? formatWorkplaceLabel(job.workplaceType)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Location
              </dt>
              <dd className="mt-0.5 text-foreground">
                {formatCell(job.locationLabel)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Employment
              </dt>
              <dd className="mt-0.5 text-foreground">
                {formatCell(job.employmentType)}
              </dd>
            </div>
          </dl>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Public slug
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-foreground">
                {formatCell(job.externalSlug)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Compensation
              </dt>
              <dd className="mt-0.5 capitalize text-foreground">
                {salaryParts.length > 0 ? salaryParts.join(" · ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Published
              </dt>
              <dd className="mt-0.5 text-foreground">
                {job.publishedAt
                  ? new Date(job.publishedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last updated
              </dt>
              <dd className="mt-0.5 text-foreground">
                {new Date(job.updatedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {job.summary ? (
          <section className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {job.summary}
            </p>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
