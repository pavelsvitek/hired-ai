import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth-schema";

export const candidate = pgTable(
  "candidate",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    fullName: text("full_name"),
    email: text("email"),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    dateOfBirthPrecision: text("date_of_birth_precision"),

    addressStreet: text("address_street"),
    addressCity: text("address_city"),
    addressRegion: text("address_region"),
    addressPostalCode: text("address_postal_code"),
    addressCountry: text("address_country"),
    addressCountryCode: text("address_country_code"),

    profileSummary: text("profile_summary"),
    profileSummarySource: text("profile_summary_source"),

    workAuthCountry: text("work_auth_country"),
    workAuthStatus: text("work_auth_status"),
    workAuthLabels: jsonb("work_auth_labels").$type<string[]>(),
    workAuthRawEvidence: text("work_auth_raw_evidence"),
    workAuthConfidence: text("work_auth_confidence"),
    workAuthNeedsReview: boolean("work_auth_needs_review")
      .notNull()
      .default(false),

    technicalFocus: jsonb("technical_focus").$type<string[]>(),

    workHistory: jsonb("work_history").$type<unknown>(),
    education: jsonb("education").$type<unknown>(),
    skills: jsonb("skills").$type<unknown>(),

    extractionWarnings: jsonb("extraction_warnings").$type<string[]>(),
    extractionMeta: jsonb("extraction_meta").$type<Record<string, unknown>>(),

    extractionModel: text("extraction_model").notNull(),
    extractedAt: timestamp("extracted_at", { mode: "date" }).notNull(),

    cvStorageKey: text("cv_storage_key").notNull(),
    cvOriginalFilename: text("cv_original_filename"),
    cvMimeType: text("cv_mime_type").notNull().default("application/pdf"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("candidate_organization_id_idx").on(table.organizationId),
    index("candidate_created_by_user_id_idx").on(table.createdByUserId),
  ],
);

export type CandidateRowSelect = InferSelectModel<typeof candidate>;

export const candidateRelations = relations(candidate, ({ one }) => ({
  organization: one(organization, {
    fields: [candidate.organizationId],
    references: [organization.id],
  }),
  createdByUser: one(user, {
    fields: [candidate.createdByUserId],
    references: [user.id],
  }),
}));
