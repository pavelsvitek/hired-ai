import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicCareerApplyForm } from "@/components/public-career-apply-form";
import { formatWorkplaceLabel } from "@/lib/recruiting/workplace-types";
import { getPublicPublishedJobByOrgAndJobSlug } from "@/lib/recruiting/get-public-job-by-org-and-job-slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, jobSlug } = await params;
  const data = await getPublicPublishedJobByOrgAndJobSlug(orgSlug, jobSlug);
  if (!data) {
    return { title: "Job not found" };
  }
  const title = `${data.job.title} · ${data.organization.name}`;
  const desc =
    data.job.summary?.trim() ||
    `${data.job.title} at ${data.organization.name}`;
  return {
    title,
    description: desc.slice(0, 160),
    openGraph: { title, description: desc.slice(0, 160) },
  };
}

export default async function PublicCareerJobPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;
  const data = await getPublicPublishedJobByOrgAndJobSlug(orgSlug, jobSlug);
  if (!data) {
    notFound();
  }

  const { job, organization } = data;
  const salaryParts: string[] = [];
  if (job.salaryMin != null || job.salaryMax != null) {
    const cur = job.salaryCurrency ?? "";
    const min = job.salaryMin != null ? job.salaryMin.toLocaleString() : "—";
    const max = job.salaryMax != null ? job.salaryMax.toLocaleString() : "—";
    salaryParts.push(
      cur ? `${cur} ${min} – ${max}` : `${min} – ${max}`,
    );
    if (job.payPeriod) salaryParts.push(job.payPeriod.replaceAll("_", " "));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm font-medium text-muted-foreground">
            {organization.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {job.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.workplaceType ? (
              <span>{formatWorkplaceLabel(job.workplaceType)}</span>
            ) : null}
            {job.locationLabel ? <span>{job.locationLabel}</span> : null}
            {job.employmentType ? <span>{job.employmentType}</span> : null}
            {salaryParts.length > 0 ? (
              <span className="capitalize">{salaryParts.join(" · ")}</span>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        {job.summary ? (
          <section aria-labelledby="job-summary-heading">
            <h2
              id="job-summary-heading"
              className="mb-3 text-lg font-semibold text-foreground"
            >
              About this role
            </h2>
            <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {job.summary}
            </div>
          </section>
        ) : null}

        <section
          aria-labelledby="apply-heading"
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <h2 id="apply-heading" className="mb-4 text-lg font-semibold">
            Apply
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload your résumé as a PDF. We use it to create your candidate
            profile for this opening.
          </p>
          <PublicCareerApplyForm orgSlug={orgSlug} jobSlug={jobSlug} />
        </section>
      </main>
    </div>
  );
}
