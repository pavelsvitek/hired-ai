import type { CandidateRowSelect } from "@/db/schema";

/** Persisted candidate row — same as Drizzle `InferSelectModel<typeof candidate>`. */
export type CandidateRow = CandidateRowSelect;

export type CandidatesListResponse = {
  candidates: CandidateRow[];
};

export type CandidateUploadResponse = {
  candidateId: string;
};

export type CandidateReparseResponse = {
  ok: true;
};
