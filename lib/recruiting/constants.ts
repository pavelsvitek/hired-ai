/** Stable UUIDs for the default pipeline (migration + runtime). */
export const DEFAULT_PIPELINE_ID = "c1a00000-0000-4000-8000-000000000001";

export const DEFAULT_PIPELINE_SLUG = "default";

export const DEFAULT_PIPELINE_STAGE_IDS = [
  "c1a00000-0000-4000-8000-000000000010",
  "c1a00000-0000-4000-8000-000000000011",
  "c1a00000-0000-4000-8000-000000000012",
  "c1a00000-0000-4000-8000-000000000013",
  "c1a00000-0000-4000-8000-000000000014",
  "c1a00000-0000-4000-8000-000000000015",
] as const;

export const DEFAULT_STAGE_NAMES = [
  "Applied",
  "Shortlist",
  "Interviewing",
  "Offer",
  "Hired",
  "Rejected",
] as const;

export const DEFAULT_APPLIED_STAGE_ID = DEFAULT_PIPELINE_STAGE_IDS[0];

export const DEFAULT_JOB_TITLE = "General applications";
