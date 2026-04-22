"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDelay } from "@/lib/time";
import { candidateKeys } from "@/models/candidate/queries";
import type {
  CandidateListRow,
  CandidateReparseResponse,
  CandidateUploadResponse,
} from "@/models/candidate/types";

export const BULK_CV_UPLOAD_MAX_FILES = 50;

export type BulkUploadCvsProgress = {
  index: number;
  total: number;
  fileName: string;
};

export type BulkUploadCvsResult = {
  candidateIds: string[];
  failures: { fileName: string; message: string }[];
};

function invalidateCandidateOrgLists(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string | null,
) {
  if (organizationId == null || organizationId.length === 0) return;
  void queryClient.invalidateQueries({
    queryKey: [...candidateKeys.all, "list", organizationId],
  });
}

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

export async function bulkUploadCvs(
  organizationId: string,
  files: File[],
  onProgress?: (info: BulkUploadCvsProgress) => void,
): Promise<BulkUploadCvsResult> {
  if (files.length > BULK_CV_UPLOAD_MAX_FILES) {
    throw new Error(
      `At most ${BULK_CV_UPLOAD_MAX_FILES} files allowed per batch.`,
    );
  }
  const candidateIds: string[] = [];
  const failures: { fileName: string; message: string }[] = [];
  const total = files.length;
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    onProgress?.({ index: i + 1, total, fileName: file.name });
    try {
      const { candidateId } = await postUploadCv(organizationId, file);
      candidateIds.push(candidateId);
    } catch (err) {
      failures.push({
        fileName: file.name,
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }
  return { candidateIds, failures };
}

type BulkUploadVars = {
  files: File[];
  onProgress?: (info: BulkUploadCvsProgress) => void;
};

export function useBulkUploadCandidatesMutation(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ files, onProgress }: BulkUploadVars) => {
      if (!organizationId) {
        throw new Error("No organization selected.");
      }
      return bulkUploadCvs(organizationId, files, onProgress);
    },
    onSettled: () => {
      invalidateCandidateOrgLists(queryClient, organizationId);
    },
  });
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
      invalidateCandidateOrgLists(queryClient, organizationId);
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
      invalidateCandidateOrgLists(queryClient, organizationId);
    },
  });
}

async function patchCandidateStage(
  candidateId: string,
  pipelineStageId: string,
  jobId: string,
): Promise<{ ok: true }> {
  const res = await fetch(
    `/api/candidates/${candidateId}/application/stage`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pipelineStageId, jobId }),
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

type UpdateStageVars = {
  candidateId: string;
  pipelineStageId: string;
};

type UpdateStageCtx = { previous: CandidateListRow[] | undefined };

export function useUpdateCandidateStageMutation(
  organizationId: string | null,
  jobId: string | null,
) {
  const queryClient = useQueryClient();
  const listKey = candidateKeys.list(organizationId, jobId);

  return useMutation<{ ok: true }, Error, UpdateStageVars, UpdateStageCtx>({
    mutationFn: async ({ candidateId, pipelineStageId }) => {
      if (jobId == null || jobId.length === 0) {
        throw new Error("No job selected.");
      }
      const [, result] = await Promise.all([
        createDelay(UPDATE_CANDIDATE_STAGE_MIN_DURATION_MS),
        patchCandidateStage(candidateId, pipelineStageId, jobId),
      ]);
      return result;
    },
    onMutate: async (variables) => {
      if (
        organizationId == null ||
        organizationId.length === 0 ||
        jobId == null ||
        jobId.length === 0
      ) {
        return { previous: undefined };
      }
      const previous = queryClient.getQueryData<CandidateListRow[]>(listKey);
      const targetRow = previous?.find((r) => r.id === variables.candidateId);
      const newStage = targetRow?.recruitment.stages.find(
        (s) => s.id === variables.pipelineStageId,
      );
      if (previous != null && targetRow != null && newStage != null) {
        queryClient.setQueryData<CandidateListRow[]>(listKey, (current) => {
          const base = current ?? previous;
          return base.map((r) =>
            r.id === variables.candidateId
              ? {
                  ...r,
                  recruitment: { ...r.recruitment, stage: newStage },
                }
              : r,
          );
        });
      }
      await queryClient.cancelQueries({ queryKey: listKey });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (
        context != null &&
        context.previous !== undefined &&
        organizationId != null &&
        organizationId.length > 0
      ) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: listKey,
      });
    },
  });
}
