"use client";

import { useEffect, useRef, useState } from "react";

export function CandidateCvViewer({
  cvUrl,
  mimeType,
}: {
  cvUrl: string;
  mimeType: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (mimeType !== "application/pdf") {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    el.replaceChildren();
    let cancelled = false;

    void (async () => {
      try {
        const { default: EmbedPDF, ZoomMode } = await import("@embedpdf/snippet");
        if (cancelled) {
          return;
        }
        const instance = EmbedPDF.init({
          type: "container",
          target: el,
          src: cvUrl,
          zoom: {
            defaultZoomLevel: ZoomMode.FitWidth,
          },
        });
        if (!instance && !cancelled) {
          setError("Could not start the PDF viewer.");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load the PDF viewer.");
        }
      }
    })();

    return () => {
      cancelled = true;
      el.replaceChildren();
    };
  }, [cvUrl, mimeType]);

  if (mimeType !== "application/pdf") {
    return (
      <div className="flex min-h-[min(70dvh,560px)] items-center justify-center rounded-lg border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        Preview is only available for PDF files.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[min(70dvh,560px)] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-4 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[min(70dvh,560px)] min-h-[400px] w-full rounded-lg border bg-background lg:h-[calc(100dvh-8rem)]"
    />
  );
}
