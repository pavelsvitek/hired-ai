"use client";

import * as React from "react";
import { FileTextIcon, Loader2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileDropzone } from "@/components/ui/file-dropzone";
import {
  BULK_CV_UPLOAD_MAX_FILES,
  useBulkUploadCandidatesMutation,
  type BulkUploadCvsProgress,
  type BulkUploadCvsResult,
} from "@/models/candidate/mutations";

export type CvBulkUploadDialogProps = {
  organizationId: string | null;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onComplete?: (payload: { candidateIds: string[] }) => void;
};

export function CvBulkUploadDialog({
  organizationId,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  trigger,
  onComplete,
}: CvBulkUploadDialogProps) {
  const bulkMutation = useBulkUploadCandidatesMutation(organizationId);

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!next && bulkMutation.isPending) return;
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [bulkMutation.isPending, isControlled, onOpenChange],
  );

  const [files, setFiles] = React.useState<File[]>([]);
  const [rejectMessage, setRejectMessage] = React.useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<BulkUploadCvsProgress | null>(
    null,
  );
  const [summary, setSummary] = React.useState<BulkUploadCvsResult | null>(
    null,
  );

  const canUpload = Boolean(organizationId);
  const isSubmitting = bulkMutation.isPending;

  React.useEffect(() => {
    if (!open) {
      setFiles([]);
      setRejectMessage(null);
      setSubmitError(null);
      setProgress(null);
      setSummary(null);
    }
  }, [open]);

  const removeAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearQueue = () => {
    setFiles([]);
    setRejectMessage(null);
    setSummary(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setSubmitError(null);
    setSummary(null);
    setProgress(null);

    if (!organizationId) {
      setSubmitError("No organization selected.");
      return;
    }

    try {
      const result = await bulkMutation.mutateAsync({
        files,
        onProgress: setProgress,
      });
      setProgress(null);
      setSummary(result);
      setFiles([]);
      onComplete?.({ candidateIds: result.candidateIds });
    } catch (err) {
      setProgress(null);
      setSubmitError(
        err instanceof Error ? err.message : "Bulk upload failed.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={!isSubmitting}
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <div className="p-4 pb-0">
          <DialogHeader>
            <DialogTitle>Bulk upload CVs</DialogTitle>
            <DialogDescription>
              Drop up to {BULK_CV_UPLOAD_MAX_FILES} PDF resumes. Each file is
              parsed with Gemini and saved as a candidate for your organization.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(70vh,36rem)] space-y-3 overflow-y-auto p-4 pt-3">
          {summary ? (
            <div
              className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
              role="status"
            >
              <p className="font-medium text-foreground">
                {summary.candidateIds.length} imported
                {summary.failures.length > 0
                  ? `, ${summary.failures.length} failed`
                  : ""}
                .
              </p>
              {summary.failures.length > 0 ? (
                <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-destructive">
                  {summary.failures.map((f, i) => (
                    <li key={`${f.fileName}-${i}`}>
                      <span className="font-medium">{f.fileName}</span>:{" "}
                      {f.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {!canUpload ? (
            <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
              Join an organization to upload CVs.
            </p>
          ) : (
            <FileDropzone
              maxFiles={BULK_CV_UPLOAD_MAX_FILES}
              className="[&_label]:min-h-80"
              onFilesAccepted={(accepted) => {
                setRejectMessage(null);
                setSummary(null);
                setFiles(accepted);
              }}
              onFilesRejected={(msg) => {
                setRejectMessage(msg);
                setFiles([]);
              }}
              disabled={isSubmitting}
            />
          )}

          {rejectMessage ? (
            <p className="text-xs text-destructive" role="alert">
              {rejectMessage}
            </p>
          ) : null}
          {submitError ? (
            <p className="text-xs text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}

          {isSubmitting && progress ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-4 shrink-0 animate-spin" />
              <span className="min-w-0 truncate">
                Parsing {progress.index} / {progress.total}:{" "}
                <span className="font-medium text-foreground">
                  {progress.fileName}
                </span>
              </span>
            </div>
          ) : null}

          {files.length > 0 && !isSubmitting ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {files.length} file{files.length === 1 ? "" : "s"} queued
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearQueue}
                >
                  Clear
                </Button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2">
                {files.map((file, idx) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                    className="flex items-center gap-2 rounded bg-background/80 px-2 py-1.5 text-xs"
                  >
                    <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 shrink-0"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeAt(idx)}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="-mx-0 -mb-0 rounded-none border-t sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              files.length === 0 || isSubmitting || !canUpload
            }
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "Parsing…" : "Parse & save all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
