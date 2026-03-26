"use client";

import * as React from "react";

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
import { useUploadCandidateMutation } from "@/models/candidate/mutations";
import { FileTextIcon } from "lucide-react";

export type CvUploadDialogProps = {
  /** Active organization for upload + DB row (required unless onUpload handles storage). */
  organizationId: string | null
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  /** If set, called instead of the default API upload. */
  onUpload?: (file: File) => void | Promise<void>
  onSuccess?: (candidateId: string) => void
}

export function CvUploadDialog({
  organizationId,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  trigger,
  onUpload,
  onSuccess,
}: CvUploadDialogProps) {
  const uploadMutation = useUploadCandidateMutation(organizationId);

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  );

  const [file, setFile] = React.useState<File | null>(null);
  const [rejectMessage, setRejectMessage] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [customUploadBusy, setCustomUploadBusy] = React.useState(false);

  const canUpload =
    Boolean(organizationId) || Boolean(onUpload);

  const isSubmitting = onUpload ? customUploadBusy : uploadMutation.isPending;

  React.useEffect(() => {
    if (!open) {
      setFile(null)
      setRejectMessage(null)
      setSubmitError(null)
      setCustomUploadBusy(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitError(null);

    if (onUpload) {
      setCustomUploadBusy(true);
      try {
        await onUpload(file);
        setOpen(false);
      } finally {
        setCustomUploadBusy(false);
      }
      return;
    }

    if (!organizationId) {
      setSubmitError("No organization selected.");
      return;
    }

    try {
      const { candidateId } = await uploadMutation.mutateAsync({ file });
      onSuccess?.(candidateId);
      setOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : `Upload failed`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="p-4 pb-0">
          <DialogHeader>
            <DialogTitle>Upload CV</DialogTitle>
            <DialogDescription>
              Drop a PDF resume. The app parses it with Gemini and saves a
              candidate profile for your organization.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 pt-3">
          {!canUpload ? (
            <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
              Join an organization to upload CVs.
            </p>
          ) : (
            <FileDropzone
              onFilesAccepted={(files) => {
                setRejectMessage(null)
                setFile(files[0] ?? null)
              }}
              onFilesRejected={(msg) => {
                setRejectMessage(msg)
                setFile(null)
              }}
              disabled={isSubmitting}
            />
          )}
          {rejectMessage ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {rejectMessage}
            </p>
          ) : null}
          {submitError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}
          {file ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground">
              <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{file.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
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
            disabled={!file || isSubmitting || !canUpload}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "Parsing…" : onUpload ? "Upload" : "Parse & save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
