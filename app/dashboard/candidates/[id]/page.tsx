import { headers } from "next/headers";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowLeftIcon, UploadCloudIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { CandidateCvViewer } from "@/components/candidate-cv-viewer";
import { CandidateDetailEscapeToList } from "@/components/candidate-detail-escape-to-list";
import { CandidateProfilePanel } from "@/components/candidate-profile-panel";
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
import {
  publicOriginFromHeaders,
  requireUserAndOrg,
} from "@/lib/dashboard-org";
import { db } from "@/lib/db";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await requireUserAndOrg();
  const { id: candidateId } = await params;

  if (!organizationId) {
    notFound();
  }

  const [row] = await db
    .select()
    .from(candidate)
    .where(
      and(
        eq(candidate.id, candidateId),
        eq(candidate.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!row) {
    notFound();
  }

  const hdrs = await headers();
  const origin = publicOriginFromHeaders(hdrs);
  const cvUrl = `${origin}/api/candidates/${candidateId}/cv`;

  const displayName =
    row.fullName?.trim() ||
    row.email?.trim() ||
    row.cvOriginalFilename?.trim() ||
    "Candidate";

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
              <BreadcrumbLink href="/dashboard/candidates">
                Candidates
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[12rem] truncate md:max-w-[24rem]">
                {displayName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      headerAction={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/candidates">
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Link>
          </Button>
          <CvUploadDialog
            organizationId={organizationId}
            trigger={
              <Button size="sm" variant="outline">
                <UploadCloudIcon data-icon="inline-start" />
                Upload CV
              </Button>
            }
          />
        </>
      }
    >
      <CandidateDetailEscapeToList />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0 lg:flex-row">
        <div className="flex min-w-0 flex-[0.65] flex-col gap-2">
          <p className="sr-only" id="pdf-preview-label">
            Candidate CV preview
          </p>
          <CandidateCvViewer cvUrl={cvUrl} mimeType={row.cvMimeType} />
        </div>
        <aside
          className="flex max-h-none min-w-0 flex-[0.35] flex-col overflow-y-auto border-t border-border lg:max-h-[calc(100dvh-4.5rem)] lg:border-l lg:border-t-0 lg:pl-6"
          aria-labelledby="profile-panel-heading"
        >
          <h1
            id="profile-panel-heading"
            className="mb-4 text-lg font-semibold leading-tight"
          >
            {displayName}
          </h1>
          <CandidateProfilePanel row={row} />
        </aside>
      </div>
    </DashboardShell>
  );
}
