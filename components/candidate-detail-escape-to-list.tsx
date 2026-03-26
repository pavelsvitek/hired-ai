"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useRouter } from "next/navigation";

/**
 * Registers Escape → navigate to candidates list (TanStack Hotkeys).
 */
export function CandidateDetailEscapeToList() {
  const router = useRouter();

  useHotkey("Escape", () => {
    router.push("/dashboard/candidates");
  });

  return null;
}
