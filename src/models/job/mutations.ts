"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { jobKeys } from "@/models/job/queries";
import type { CreateJobInput, CreateJobResponse } from "@/models/job/types";

export type PatchJobStatusInput = {
  jobId: string;
  status: "draft" | "published";
};

async function patchJobStatus(
  jobId: string,
  status: "draft" | "published",
): Promise<{ ok: true }> {
  const res = await fetch(`/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  let message = "Could not update job";
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    message = (data as { error: string }).error;
  }
  if (!res.ok) {
    throw new Error(message);
  }
  return { ok: true };
}

async function postCreateJob(body: CreateJobInput): Promise<CreateJobResponse> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  const message =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
      ? (data as { error: string }).error
      : null;
  if (!res.ok) {
    throw new Error(message ?? `Could not create job (${res.status})`);
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("jobId" in data) ||
    typeof (data as { jobId: unknown }).jobId !== "string"
  ) {
    throw new Error("Invalid create job response");
  }
  return { jobId: (data as CreateJobResponse).jobId };
}

export function useCreateJobMutation(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCreateJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: jobKeys.list(organizationId),
      });
    },
  });
}

export function usePatchJobStatusMutation(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, status }: PatchJobStatusInput) =>
      patchJobStatus(jobId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: jobKeys.list(organizationId),
      });
    },
  });
}
