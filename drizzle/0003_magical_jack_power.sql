ALTER TABLE "job" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "description" jsonb;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "employment_type" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "seniority" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "workplace_type" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "location_label" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "locality" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "admin_area" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "compensation_visibility" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "pay_period" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "external_slug" text;--> statement-breakpoint
CREATE INDEX "job_organization_status_idx" ON "job" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "job_external_slug_uidx" ON "job" USING btree ("external_slug");