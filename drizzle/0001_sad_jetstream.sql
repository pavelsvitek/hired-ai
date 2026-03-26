CREATE TABLE "candidate" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_user_id" text,
	"full_name" text,
	"email" text,
	"date_of_birth" timestamp,
	"date_of_birth_precision" text,
	"address_street" text,
	"address_city" text,
	"address_region" text,
	"address_postal_code" text,
	"address_country" text,
	"address_country_code" text,
	"profile_summary" text,
	"profile_summary_source" text,
	"work_auth_country" text,
	"work_auth_status" text,
	"work_auth_labels" jsonb,
	"work_auth_raw_evidence" text,
	"work_auth_confidence" text,
	"work_auth_needs_review" boolean DEFAULT false NOT NULL,
	"technical_focus" jsonb,
	"work_history" jsonb,
	"education" jsonb,
	"skills" jsonb,
	"extraction_warnings" jsonb,
	"extraction_meta" jsonb,
	"extraction_model" text NOT NULL,
	"extracted_at" timestamp NOT NULL,
	"cv_storage_key" text NOT NULL,
	"cv_original_filename" text,
	"cv_mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_organization_id_auth_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_created_by_user_id_auth_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_organization_id_idx" ON "candidate" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "candidate_created_by_user_id_idx" ON "candidate" USING btree ("created_by_user_id");