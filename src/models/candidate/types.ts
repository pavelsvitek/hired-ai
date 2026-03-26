import type { CandidateRowSelect } from "@/db/schema";

/** Persisted candidate row — same as Drizzle `InferSelectModel<typeof candidate>`. */
export type CandidateRow = CandidateRowSelect;

export type PipelineStageBrief = {
  id: string;
  name: string;
  sortOrder: number;
};

export type RecruitmentSummary = {
  jobId: string;
  jobTitle: string;
  stage: PipelineStageBrief;
  stages: PipelineStageBrief[];
};

/** Candidate as returned from the dashboard list (includes default job + pipeline). */
export type CandidateListRow = CandidateRow & {
  recruitment: RecruitmentSummary;
};

export type CandidatesListResponse = {
  candidates: CandidateListRow[];
};

export type CandidateUploadResponse = {
  candidateId: string;
};

export type CandidateReparseResponse = {
  ok: true;
};
