"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { AgentationProps } from "agentation";

export function AgentationDev() {
  const [Agentation, setAgentation] =
    useState<ComponentType<AgentationProps> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void import("agentation").then((m) => {
      setAgentation(() => m.Agentation);
    });
  }, []);

  if (!Agentation) return null;

  const endpoint = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT;
  return <Agentation {...(endpoint ? { endpoint } : {})} />;
}
