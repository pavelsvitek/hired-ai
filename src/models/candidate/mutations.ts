"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDelay } from "@/lib/time";
import { candidateKeys } from "@/models/candidate/queries";
import type {
  CandidateReparseResponse,
  CandidateUploadResponse,
} from "@/models/candidate/types";

async function postUploadCv(
  organizationId: string,
  file: File,
): Promise<CandidateUploadResponse> {
  const body = new FormData();
  body.set("file", file);
  body.set("organizationId", organizationId);
  const res = await fetch("/api/candidates/upload", {
    method: "POST",
    body,
    credentials: "include",
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
    throw new Error(message ?? `Upload failed (${res.status})`);
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("candidateId" in data) ||
    typeof (data as { candidateId: unknown }).candidateId !== "string"
  ) {
    throw new Error("Invalid upload response");
  }
  return { candidateId: (data as CandidateUploadResponse).candidateId };
}

export function useUploadCandidateMutation(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: { file: File }) => {
      if (!organizationId) {
        throw new Error("No organization selected.");
      }
      return postUploadCv(organizationId, file);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: candidateKeys.list(organizationId),
      });
    },
  });
}

async function postReparseCv(candidateId: string): Promise<CandidateReparseResponse> {
  const res = await fetch(`/api/candidates/${candidateId}/reparse`, {
    method: "POST",
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  let message = "Could not parse CV";
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

export function useReparseCandidateMutation(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId }: { candidateId: string }) =>
      postReparseCv(candidateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: candidateKeys.list(organizationId),
      });
    },
  });
}

async function patchCandidateStage(
  candidateId: string,
  pipelineStageId: string,
): Promise<{ ok: true }> {
  const res = await fetch(
    `/api/candidates/${candidateId}/application/stage`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pipelineStageId }),
    },
  );
  const data: unknown = await res.json().catch(() => ({}));
  let message = "Could not update stage";
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

const UPDATE_CANDIDATE_STAGE_MIN_DURATION_MS = 500;

export function useUpdateCandidateStageMutation(
  organizationId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candidateId,
      pipelineStageId,
    }: {
      candidateId: string;
      pipelineStageId: string;
    }) => {
      const [, result] = await Promise.all([
        createDelay(UPDATE_CANDIDATE_STAGE_MIN_DURATION_MS),
        patchCandidateStage(candidateId, pipelineStageId),
      ]);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: candidateKeys.list(organizationId),
      });
    },
  });
}
