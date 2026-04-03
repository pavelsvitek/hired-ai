import type { JobRowSelect } from "@/db/schema";
import type { PayPeriod } from "@/lib/recruiting/pay-periods";
import type { WorkplaceType } from "@/lib/recruiting/workplace-types";

/** Job row fields exposed on the internal jobs list (no description JSONB). */
export type JobListRow = Pick<
  JobRowSelect,
  | "id"
  | "title"
  | "status"
  | "workplaceType"
  | "locationLabel"
  | "employmentType"
  | "isDefault"
  | "externalSlug"
  | "updatedAt"
> & {
  pipelineName: string;
  organizationSlug: string;
};

export type JobsListResponse = {
  jobs: JobListRow[];
};

export type JobDetail = JobListRow &
  Pick<
    JobRowSelect,
    | "summary"
    | "salaryMin"
    | "salaryMax"
    | "salaryCurrency"
    | "payPeriod"
    | "publishedAt"
  >;

export type JobDetailResponse = {
  job: JobDetail;
};

/** Body for `POST /api/jobs` (JSON). */
export type CreateJobInput = {
  title: string;
  pipelineId?: string;
  summary?: string | null;
  externalSlug?: string | null;
  status?: string;
  workplaceType: WorkplaceType;
  locationLabel?: string | null;
  employmentType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  payPeriod?: PayPeriod | null;
};

export type CreateJobResponse = {
  jobId: string;
};

