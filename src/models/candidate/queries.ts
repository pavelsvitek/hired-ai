"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  CandidateListRow,
  CandidatesListResponse,
} from "@/models/candidate/types";

export const candidateKeys = {
  all: ["candidates"] as const,
  list: (organizationId: string | null, jobId: string | null) =>
    [...candidateKeys.all, "list", organizationId, jobId] as const,
};

async function fetchCandidatesList(jobId: string): Promise<CandidateListRow[]> {
  const params = new URLSearchParams({ jobId });
  const res = await fetch(`/api/candidates?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load candidates (${res.status})`);
  }
  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("candidates" in data) ||
    !Array.isArray((data as CandidatesListResponse).candidates)
  ) {
    throw new Error("Invalid candidates response");
  }
  return (data as CandidatesListResponse).candidates;
}

export type UseCandidatesListOptions = {
  initialData?: CandidateListRow[];
  /** When omitted, list query is disabled. */
  jobId: string | null;
};

export function useCandidatesList(
  organizationId: string | null,
  options: UseCandidatesListOptions,
) {
  const { initialData, jobId } = options;

  return useQuery({
    queryKey: candidateKeys.list(organizationId, jobId),
    queryFn: () => fetchCandidatesList(jobId!),
    enabled:
      organizationId != null &&
      organizationId.length > 0 &&
      jobId != null &&
      jobId.length > 0,
    initialData:
      organizationId != null &&
      organizationId.length > 0 &&
      jobId != null &&
      jobId.length > 0
        ? initialData
        : undefined,
    /** SSR payload is not the source of truth after mutations; always refetch when invalidated. */
    initialDataUpdatedAt: 0,
  });
}
