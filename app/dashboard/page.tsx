import { FilesIcon, UploadCloudIcon } from "lucide-react";
import Link from "next/link";

import { CvBulkUploadDialog } from "@/components/cv-bulk-upload-dialog";
import { CvUploadDialog } from "@/components/cv-upload-dialog";
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

export default async function Page() {
  const { organizationId } = await requireUserAndOrg();

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
              <BreadcrumbPage>Overview</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      headerAction={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/candidates">Candidates</Link>
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
          <CvBulkUploadDialog
            organizationId={organizationId}
            trigger={
              <Button size="sm" variant="outline">
                <FilesIcon data-icon="inline-start" />
                Bulk upload
              </Button>
            }
          />
        </>
      }
    >
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
        </div>
        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </DashboardShell>
  );
}
