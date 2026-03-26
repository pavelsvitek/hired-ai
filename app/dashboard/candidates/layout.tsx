import type { ReactNode } from "react";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { CandidatesQueryProvider } from "@/components/candidates-query-provider";
import { EmbedPDFPersistentProvider } from "@/components/embed-pdf/EmbedPDFViewerCustom";

/**
 * PDF engine + nuqs: list and detail share one route so the viewer stays
 * mounted when switching candidates; URL uses ?candidate= for refresh/share.
 */
export default function CandidatesLayout({ children }: { children: ReactNode }) {
  return (
    <CandidatesQueryProvider>
      <EmbedPDFPersistentProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </EmbedPDFPersistentProvider>
    </CandidatesQueryProvider>
  );
}
