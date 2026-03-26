import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { UploadCloudIcon } from "lucide-react";

import { CvUploadDialog } from "@/components/cv-upload-dialog";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { candidate } from "@/db/schema";
import { requireUserAndOrg } from "@/lib/dashboard-org";
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

  const listTitle = (r: (typeof rows)[0]) =>
    r.fullName?.trim() ||
    r.email?.trim() ||
    r.cvOriginalFilename?.trim() ||
    "Untitled candidate";

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
              <BreadcrumbPage>Candidates</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      headerAction={
        <CvUploadDialog
          organizationId={organizationId}
          trigger={
            <Button size="sm" variant="outline">
              <UploadCloudIcon data-icon="inline-start" />
              Upload CV
            </Button>
          }
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {!organizationId ? (
          <p className="text-sm text-muted-foreground">
            You are not a member of an organization yet. Join or create one to
            see candidates.
          </p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-8">
            <p className="text-sm text-muted-foreground">
              No candidates yet. Upload a CV to add your first profile.
            </p>
            <CvUploadDialog
              organizationId={organizationId}
              trigger={<Button>Upload CV</Button>}
            />
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/candidates/${r.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{listTitle(r)}</p>
                    {r.email ? (
                      <p className="text-sm text-muted-foreground">{r.email}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className="text-xs text-muted-foreground">
                      Extracted{" "}
                      {r.extractedAt
                        ? r.extractedAt.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                    {r.technicalFocus && r.technicalFocus.length > 0 ? (
                      <div className="flex max-w-full flex-wrap justify-end gap-1">
                        {r.technicalFocus.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
                          >
                            {tag.replaceAll("_", " ")}
                          </span>
                        ))}
                        {r.technicalFocus.length > 5 ? (
                          <span className="text-[10px] text-muted-foreground">
                            +{r.technicalFocus.length - 5}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
