import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./auth-schema";
import { candidate } from "./candidate";

export const pipeline = pgTable(
  "pipeline",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("pipeline_slug_idx").on(table.slug)],
);

export const pipelineStage = pgTable(
  "pipeline_stage",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipeline.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("pipeline_stage_pipeline_sort_uidx").on(
      table.pipelineId,
      table.sortOrder,
    ),
    index("pipeline_stage_pipeline_id_idx").on(table.pipelineId),
  ],
);

export const job = pgTable(
  "job",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipeline.id, { onDelete: "restrict" }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("job_organization_id_idx").on(table.organizationId)],
);

export const candidateApplication = pgTable(
  "candidate_application",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidate.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    pipelineStageId: text("pipeline_stage_id")
      .notNull()
      .references(() => pipelineStage.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("candidate_application_candidate_job_uidx").on(
      table.candidateId,
      table.jobId,
    ),
    index("candidate_application_candidate_id_idx").on(table.candidateId),
    index("candidate_application_job_id_idx").on(table.jobId),
  ],
);

export type PipelineRowSelect = InferSelectModel<typeof pipeline>;
export type PipelineStageRowSelect = InferSelectModel<typeof pipelineStage>;
export type JobRowSelect = InferSelectModel<typeof job>;
export type CandidateApplicationRowSelect = InferSelectModel<
  typeof candidateApplication
>;

export const pipelineRelations = relations(pipeline, ({ many }) => ({
  stages: many(pipelineStage),
  jobs: many(job),
}));

export const pipelineStageRelations = relations(pipelineStage, ({ one }) => ({
  pipeline: one(pipeline, {
    fields: [pipelineStage.pipelineId],
    references: [pipeline.id],
  }),
}));

export const jobRelations = relations(job, ({ one, many }) => ({
  organization: one(organization, {
    fields: [job.organizationId],
    references: [organization.id],
  }),
  pipeline: one(pipeline, {
    fields: [job.pipelineId],
    references: [pipeline.id],
  }),
  applications: many(candidateApplication),
}));

export const candidateApplicationRelations = relations(
  candidateApplication,
  ({ one }) => ({
    candidate: one(candidate, {
      fields: [candidateApplication.candidateId],
      references: [candidate.id],
    }),
    job: one(job, {
      fields: [candidateApplication.jobId],
      references: [job.id],
    }),
    stage: one(pipelineStage, {
      fields: [candidateApplication.pipelineStageId],
      references: [pipelineStage.id],
    }),
  }),
);
