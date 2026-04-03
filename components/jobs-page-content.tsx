import Link from "next/link";

import { CopyCareersLinkButton } from "@/components/copy-careers-link-button";
import { cn } from "@/lib/utils";
import { formatWorkplaceLabel } from "@/lib/recruiting/workplace-types";
import type { JobListRow } from "@/models/job/types";

function formatCell(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return value;
}

function formatUpdatedAt(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function JobsPageContent({
  organizationId,
  jobs,
  origin,
}: {
  organizationId: string | null;
  jobs: JobListRow[];
  origin: string;
}) {
  if (!organizationId) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-muted-foreground">
        <p className="text-sm">
          You need an organization membership to view jobs. Create or join an
          organization in settings, then refresh this page.
        </p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-muted-foreground">
        <p className="text-sm">
          No jobs yet for this organization. Default roles may still appear
          after candidates are added.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Pipeline</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Workplace</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Employment</th>
            <th className="px-4 py-3 font-medium">Share</th>
            <th className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/60 last:border-b-0"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/jobs/${row.id}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {row.title}
                </Link>
                {row.isDefault ? (
                  <span
                    className={cn(
                      "ml-2 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary",
                    )}
                  >
                    Default
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.pipelineName}
              </td>
              <td className="px-4 py-3 capitalize">{formatCell(row.status)}</td>
              <td className="px-4 py-3">
                {formatWorkplaceLabel(row.workplaceType)}
              </td>
              <td className="px-4 py-3">{formatCell(row.locationLabel)}</td>
              <td className="px-4 py-3">{formatCell(row.employmentType)}</td>
              <td className="px-4 py-3">
                {row.status === "published" && row.externalSlug ? (
                  <CopyCareersLinkButton
                    url={`${origin}/o/${row.organizationSlug}/careers/${row.externalSlug}`}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatUpdatedAt(row.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
