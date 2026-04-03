"use client";

import { useQuery } from "@tanstack/react-query";

import type { JobListRow, JobsListResponse } from "@/models/job/types";

export const jobKeys = {
  all: ["jobs"] as const,
  list: (organizationId: string | null) =>
    [...jobKeys.all, "list", organizationId] as const,
};

async function fetchJobsList(): Promise<JobListRow[]> {
  const res = await fetch("/api/jobs", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load jobs (${res.status})`);
  }
  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("jobs" in data) ||
    !Array.isArray((data as JobsListResponse).jobs)
  ) {
    throw new Error("Invalid jobs response");
  }
  return (data as JobsListResponse).jobs;
}

export function useJobsList(organizationId: string | null) {
  return useQuery({
    queryKey: jobKeys.list(organizationId),
    queryFn: fetchJobsList,
    enabled: organizationId != null && organizationId.length > 0,
  });
}

