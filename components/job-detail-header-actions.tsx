"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { CopyCareersLinkButton } from "@/components/copy-careers-link-button";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePatchJobStatusMutation } from "@/models/job/mutations";

export function JobDetailHeaderActions({
  jobId,
  organizationId,
  status,
  externalSlug,
  publicUrl,
}: {
  jobId: string;
  organizationId: string;
  status: string;
  externalSlug: string | null;
  publicUrl: string;
}) {
  const router = useRouter();
  const mutation = usePatchJobStatusMutation(organizationId);

  const isPublished = status === "published";
  const hasSlug = Boolean(externalSlug?.trim());
  const busy = mutation.isPending;

  const unpublish = () => {
    mutation.reset();
    mutation.mutate(
      { jobId, status: "draft" },
      {
        onSuccess: () => router.refresh(),
      },
    );
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {!isPublished ? (
          <Button
            type="button"
            size="lg"
            className="min-w-[7.5rem] px-4 text-base"
            disabled={busy || !hasSlug}
            onClick={() => {
              mutation.mutate(
                { jobId, status: "published" },
                {
                  onSuccess: () => router.refresh(),
                },
              );
            }}
          >
            Publish
          </Button>
        ) : (
          <ButtonGroup
            aria-label="Careers link and job listing actions"
            className="max-w-full min-w-0 self-end"
          >
            <CopyCareersLinkButton
              url={publicUrl}
              variant="default"
              size="lg"
              className="min-w-0 max-w-full flex-1 text-base"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  disabled={busy}
                  aria-label="More job actions"
                >
                  <MoreVerticalIcon className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled={busy}
                  className="text-destructive focus:text-destructive"
                  onClick={() => unpublish()}
                >
                  Unpublish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        )}
      </div>
      {mutation.isError ? (
        <p className="max-w-[16rem] text-right text-xs text-destructive">
          {mutation.error.message}
        </p>
      ) : null}
      {!isPublished && !hasSlug ? (
        <p className="max-w-[16rem] text-right text-xs text-muted-foreground">
          Add a public slug for this job on the jobs list before publishing.
        </p>
      ) : null}
    </div>
  );
}
