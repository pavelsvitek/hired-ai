import { z } from "zod";

const technicalFocusEnum = z.enum([
  // Engineering
  "frontend",
  "backend",
  "full_stack",
  "devops",
  "ml_ai_research",
  "data_engineering",
  "mobile",
  "security",
  // Marketing
  "performance_marketing",
  "brand_marketing",
  "content_marketing",
  "growth_marketing",
  "product_marketing",
  "seo_sem",
  "social_media_marketing",
  "crm_email_marketing",
  "marketing_analytics",
  "marketing_strategy",
  // Other domains
  "sales",
  "business_development",
  "product_management",
  "design_ux",
  "hr_recruiting",
  "finance_accounting",
  "operations",
  "customer_success",
  "project_management",
  "consulting",
  "other",
]);

const workHistoryEntrySchema = z.object({
  employer: z.string().describe("Company or organization name"),
  title: z.string().describe("Job title"),
  start_date: z
    .string()
    .nullable()
    .describe("Start YYYY-MM or YYYY-MM-DD; null if unknown"),
  end_date: z
    .string()
    .nullable()
    .describe("End YYYY-MM or YYYY-MM-DD; null if current or unknown"),
  is_current: z.boolean().describe("True if this is the current role"),
  location: z.string().nullable().describe("City, region, or remote"),
  highlights: z
    .array(z.string())
    .describe("Key bullets or achievements; empty if none stated"),
});

const educationEntrySchema = z.object({
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

export const cvExtractionSchema = z.object({
  full_name: z
    .string()
    .nullable()
    .describe("Full name as on the CV; null if not found"),
  email: z
    .string()
    .nullable()
    .describe("Primary email; null if not found"),
  date_of_birth: z.object({
    value: z
      .string()
      .nullable()
      .describe("ISO date YYYY-MM-DD when day known; else partial or null"),
    precision: z
      .enum(["day", "month", "year", "unknown"])
      .describe("Granularity of date_of_birth.value"),
  }),
  address: z.object({
    street: z.string().nullable(),
    city: z.string().nullable().describe("City; important for location"),
    region: z.string().nullable(),
    postal_code: z.string().nullable(),
    country: z.string().nullable().describe("Country name; important"),
    country_code: z.string().nullable().describe("ISO 3166-1 alpha-2 when known"),
  }),
  work_authorization: z.object({
    country: z
      .string()
      .describe("ISO country context, e.g. CH for Switzerland"),
    status: z
      .enum(["permit_holder", "citizen", "unknown"])
      .describe("Citizen or work permit situation"),
    labels: z
      .array(z.string())
      .describe(
        "Normalized labels e.g. B permit, C permit, L permit, EU/EFTA; empty if unknown",
      ),
    raw_evidence: z
      .string()
      .nullable()
      .describe("Short verbatim phrase from CV that supports the conclusion"),
    confidence: z.enum(["high", "medium", "low"]),
  }),
  profile_summary: z.object({
    text: z
      .string()
      .describe(
        "Professional summary from CV if present; otherwise generate 2-4 sentences from work history only",
      ),
    source: z.enum(["explicit", "generated"]),
  }),
  work_history: z
    .array(workHistoryEntrySchema)
    .describe("Employment history reverse-chronological"),
  technical_focus: z
    .array(technicalFocusEnum)
    .describe(
      "Professional domain(s) the candidate specialises in. Use engineering values (frontend, backend, etc.) for software roles; marketing values (performance_marketing, seo_sem, etc.) for marketing roles; other domain values for sales, HR, finance, etc. Never force engineering tags onto non-engineering profiles.",
    ),
  education: z.array(educationEntrySchema),
  skills: z.array(z.string()),
  warnings: z
    .array(z.string())
    .describe("Fields missing, ambiguity, or conflicts; never invent facts"),
});

export type CvExtraction = z.infer<typeof cvExtractionSchema>;
