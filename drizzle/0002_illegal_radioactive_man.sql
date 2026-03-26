CREATE TABLE "candidate_application" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"job_id" text NOT NULL,
	"pipeline_stage_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"pipeline_id" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage" (
	"id" text PRIMARY KEY NOT NULL,
	"pipeline_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_application" ADD CONSTRAINT "candidate_application_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_application" ADD CONSTRAINT "candidate_application_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_application" ADD CONSTRAINT "candidate_application_pipeline_stage_id_pipeline_stage_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stage"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_organization_id_auth_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_pipeline_id_pipeline_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipeline"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD CONSTRAINT "pipeline_stage_pipeline_id_pipeline_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_application_candidate_job_uidx" ON "candidate_application" USING btree ("candidate_id","job_id");--> statement-breakpoint
CREATE INDEX "candidate_application_candidate_id_idx" ON "candidate_application" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_application_job_id_idx" ON "candidate_application" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_organization_id_idx" ON "job" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pipeline_slug_idx" ON "pipeline" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stage_pipeline_sort_uidx" ON "pipeline_stage" USING btree ("pipeline_id","sort_order");--> statement-breakpoint
CREATE INDEX "pipeline_stage_pipeline_id_idx" ON "pipeline_stage" USING btree ("pipeline_id");