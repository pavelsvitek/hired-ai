import type { ReactNode } from "react";

import { EmbedPDFPersistentProvider } from "@/components/embed-pdf/EmbedPDFViewerCustom";

/**
 * Single provider for /candidates and /candidates/[id] so the PDF engine and
 * parsed documents stay in memory when navigating between the list and detail.
 */
export default function CandidatesLayout({ children }: { children: ReactNode }) {
  return <EmbedPDFPersistentProvider>{children}</EmbedPDFPersistentProvider>;
}
