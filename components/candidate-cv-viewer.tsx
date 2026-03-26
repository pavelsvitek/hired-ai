"use client";

import {
  EmbedPDFManagedViewer,
  useEmbedPdfEngineReady,
} from "@/components/embed-pdf/EmbedPDFViewerCustom";
import { Loader2 } from "lucide-react";

export function CandidateCvViewer({
  pdfDocumentId,
  cvUrl,
  mimeType,
}: {
  /** Cache key for EmbedPDF; include a CV version (e.g. storage key) so re-uploads replace the document. */
  pdfDocumentId: string;
  cvUrl: string;
  mimeType: string;
}) {
  const engineReady = useEmbedPdfEngineReady();

  if (mimeType !== "application/pdf") {
    return (
      <div className="flex min-h-[min(70dvh,560px)] items-center justify-center rounded-lg border border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        Preview is only available for PDF files.
      </div>
    );
  }

  if (!engineReady) {
    return (
      <div className="flex h-[min(70dvh,560px)] min-h-[400px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-background lg:h-[calc(100dvh-8rem)]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading PDF viewer…</span>
      </div>
    );
  }

  return (
    <div className="h-[min(70dvh,560px)] min-h-[400px] w-full overflow-hidden rounded-lg border border-border bg-background lg:h-[calc(100dvh-8rem)]">
      <EmbedPDFManagedViewer documentId={pdfDocumentId} url={cvUrl} />
    </div>
  );
}
