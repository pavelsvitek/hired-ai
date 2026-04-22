import { randomUUID } from "crypto";

import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { handle } from "hono/vercel";

import { candidate, candidateApplication } from "@/db/schema";
import { extractCvFromPdf } from "@/lib/cv-extraction/extract";
import { mapExtractionToCandidateInsert } from "@/lib/cv-extraction/map-to-candidate-row";
import {
  isAcceptablePdfFile,
  isPdfBuffer,
} from "@/lib/cv-upload/validate-pdf";
import { storeCvPdf } from "@/lib/cv-storage";
import { db } from "@/lib/db";
import { getInitialPipelineStageId } from "@/lib/recruiting/get-initial-pipeline-stage-id";
import { getPublicPublishedJobByOrgAndJobSlug } from "@/lib/recruiting/get-public-job-by-org-and-job-slug";

export const runtime = "nodejs";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const app = new Hono().basePath("/api/public/careers");

app.post("/:orgSlug/:jobSlug/apply", async (c) => {
  const orgSlug = c.req.param("orgSlug");
  const jobSlug = c.req.param("jobSlug");

  const published = await getPublicPublishedJobByOrgAndJobSlug(orgSlug, jobSlug);
  if (!published) {
    return c.json({ error: "Job not found" }, 404);
  }

  const { job: jobRow } = published;

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  if (!isAcceptablePdfFile(file)) {
    return c.json({ error: "Only PDF files are accepted" }, 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return c.json({ error: "Empty file" }, 400);
  }

  if (!isPdfBuffer(buf)) {
    return c.json({ error: "File does not look like a valid PDF" }, 400);
  }

  let storageKey: string;
  try {
    const stored = await storeCvPdf(buf, file.name);
    storageKey = stored.storageKey;
  } catch (err) {
    return c.json(
      { error: `Could not store file: ${errorMessage(err)}` },
      500,
    );
  }

  let extraction;
  try {
    extraction = await extractCvFromPdf(new Uint8Array(buf));
  } catch (err) {
    const msg = errorMessage(err);
    const status =
      msg.includes("GOOGLE_GENERATIVE_AI_API_KEY") || msg.includes("API key")
        ? 503
        : 502;
    return c.json({ error: `Could not extract CV: ${msg}` }, status);
  }

  const fullNameField = form.get("fullName");
  const emailField = form.get("email");
  const formFullName =
    typeof fullNameField === "string" ? fullNameField.trim() : "";
  const formEmailRaw = typeof emailField === "string" ? emailField.trim() : "";
  const formEmail = formEmailRaw ? normalizeEmail(formEmailRaw) : "";

  const candidateId = randomUUID();
  const extractedAt = new Date();

  const row = mapExtractionToCandidateInsert({
    id: candidateId,
    organizationId: jobRow.organizationId,
    createdByUserId: null,
    extraction,
    cvStorageKey: storageKey,
    cvOriginalFilename: file.name,
    cvMimeType: file.type || "application/pdf",
    extractedAt,
  });

  if (formFullName) {
    row.fullName = formFullName;
  }
  if (formEmail) {
    row.email = formEmail;
  }

  const effectiveEmail = row.email?.trim()
    ? normalizeEmail(row.email.trim())
    : "";

  if (effectiveEmail) {
    const [dup] = await db
      .select({ id: candidateApplication.id })
      .from(candidateApplication)
      .innerJoin(candidate, eq(candidate.id, candidateApplication.candidateId))
      .where(
        and(
          eq(candidateApplication.jobId, jobRow.id),
          eq(candidate.organizationId, jobRow.organizationId),
          sql`lower(trim(${candidate.email})) = ${effectiveEmail}`,
        ),
      )
      .limit(1);

    if (dup) {
      return c.json(
        { error: "You have already applied to this role with this email." },
        409,
      );
    }
  }

  const initialStageId = await getInitialPipelineStageId(jobRow.pipelineId);
  if (!initialStageId) {
    return c.json({ error: "Job pipeline is misconfigured" }, 500);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(candidate).values(row);
      await tx.insert(candidateApplication).values({
        id: randomUUID(),
        candidateId,
        jobId: jobRow.id,
        pipelineStageId: initialStageId,
        updatedAt: new Date(),
      });
    });
  } catch (err) {
    return c.json(
      { error: `Could not save application: ${errorMessage(err)}` },
      500,
    );
  }

  return c.json({ ok: true as const }, 201);
});

export const POST = handle(app);
