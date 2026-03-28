import { randomUUID } from "crypto";

import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { handle } from "hono/vercel";
import { z } from "zod";

import { job, member, pipeline } from "@/db/schema";
import { db } from "@/lib/db";
import { createHonoWithAuth } from "@/lib/hono/create-hono-with-auth";
import { DEFAULT_PIPELINE_ID } from "@/lib/recruiting/constants";
import { ensureDefaultPipeline } from "@/lib/recruiting/ensure-defaults";
import { PAY_PERIODS } from "@/lib/recruiting/pay-periods";
import { WORKPLACE_TYPES } from "@/lib/recruiting/workplace-types";
import { loadJobsForDashboard } from "@/lib/recruiting/load-jobs-dashboard";
import type { CreateJobResponse, JobsListResponse } from "@/models/job/types";

export const runtime = "nodejs";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

const createJobJsonSchema = z.object({
  title: z.string().trim().min(1).max(300),
  pipelineId: z.string().uuid().optional(),
  summary: z.string().trim().max(8000).nullish(),
  externalSlug: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  status: z
    .enum(["draft", "published", "paused", "closed", "filled"])
    .optional(),
  workplaceType: z.enum(WORKPLACE_TYPES),
  locationLabel: z.string().trim().max(300).nullish(),
  employmentType: z.string().trim().max(64).nullish(),
  salaryMin: z.number().int().nullish(),
  salaryMax: z.number().int().nullish(),
  salaryCurrency: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().length(3).toUpperCase().optional(),
  ),
  payPeriod: z.enum(PAY_PERIODS).nullish(),
}).refine(
  (data) =>
    data.salaryMin == null ||
    data.salaryMax == null ||
    data.salaryMin <= data.salaryMax,
  {
    message:
      "Salary minimum must be less than or equal to salary maximum.",
    path: ["salaryMin"],
  },
);

const app = createHonoWithAuth("/api/jobs");

app.get("/", async (c) => {
  const userId = c.var.userId;

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const organizationId = memberships[0]?.organizationId ?? null;

  if (!organizationId) {
    return c.json({ jobs: [] satisfies JobsListResponse["jobs"] });
  }

  const jobs = await loadJobsForDashboard(organizationId);

  return c.json({ jobs } satisfies JobsListResponse);
});

app.post("/", zValidator("json", createJobJsonSchema), async (c) => {
  const userId = c.var.userId;
  const body = c.req.valid("json");

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const organizationId = memberships[0]?.organizationId ?? null;

  if (!organizationId) {
    return c.json({ error: "No organization membership" }, 400);
  }

  await ensureDefaultPipeline();

  const pipelineId = body.pipelineId ?? DEFAULT_PIPELINE_ID;

  const [pipelineRow] = await db
    .select({ id: pipeline.id })
    .from(pipeline)
    .where(eq(pipeline.id, pipelineId))
    .limit(1);

  if (!pipelineRow) {
    return c.json({ error: "Pipeline not found" }, 400);
  }

  if (body.externalSlug) {
    const [slugRow] = await db
      .select({ id: job.id })
      .from(job)
      .where(eq(job.externalSlug, body.externalSlug))
      .limit(1);
    if (slugRow) {
      return c.json({ error: "That public slug is already in use" }, 409);
    }
  }

  const id = randomUUID();
  const now = new Date();

  try {
    await db.insert(job).values({
      id,
      organizationId,
      title: body.title,
      pipelineId,
      isDefault: false,
      summary: body.summary ?? null,
      externalSlug: body.externalSlug ?? null,
      status: body.status ?? "draft",
      workplaceType: body.workplaceType,
      locationLabel: body.locationLabel ?? null,
      employmentType: body.employmentType ?? null,
      salaryMin: body.salaryMin ?? null,
      salaryMax: body.salaryMax ?? null,
      salaryCurrency: body.salaryCurrency ?? null,
      payPeriod: body.payPeriod ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    return c.json(
      { error: `Could not create job: ${errorMessage(err)}` },
      500,
    );
  }

  return c.json({ jobId: id } satisfies CreateJobResponse);
});

export const GET = handle(app);
export const POST = handle(app);
