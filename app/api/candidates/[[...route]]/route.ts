import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { handle } from "hono/vercel";
import { z } from "zod";

import {
  candidate,
  candidateApplication,
  job,
  member,
  pipelineStage,
} from "@/db/schema";
import { extractCvFromPdf } from "@/lib/cv-extraction/extract";
import {
  mapExtractionToCandidateInsert,
  mapExtractionToCandidateUpdate,
} from "@/lib/cv-extraction/map-to-candidate-row";
import {
  isAcceptablePdfFile,
  isPdfBuffer,
} from "@/lib/cv-upload/validate-pdf";
import { readCvPdfFile, storeCvPdf } from "@/lib/cv-storage";
import { db } from "@/lib/db";
import { createHonoWithAuth } from "@/lib/hono/create-hono-with-auth";
import {
  getDefaultJobIdForOrganization,
  jobBelongsToOrganization,
} from "@/lib/recruiting/get-default-job-id-for-org";
import { ensureDefaultApplicationForCandidate } from "@/lib/recruiting/ensure-defaults";
import { loadCandidatesForDashboard } from "@/lib/recruiting/load-candidates-dashboard";
import type { CandidatesListResponse } from "@/models/candidate/types";

export const runtime = "nodejs";

const idParam = z.object({
  id: z.string().uuid(),
});

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

const app = createHonoWithAuth("/api/candidates");

app.get("/", async (c) => {
  const userId = c.var.userId;

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const organizationId = memberships[0]?.organizationId ?? null;

  if (!organizationId) {
    return c.json({ candidates: [] satisfies CandidatesListResponse["candidates"] });
  }

  const defaultJobId = await getDefaultJobIdForOrganization(organizationId);
  const jobIdParam = c.req.query("jobId");
  let jobId = defaultJobId;
  if (jobIdParam) {
    const parsed = z.string().uuid().safeParse(jobIdParam);
    if (parsed.success) {
      const ok = await jobBelongsToOrganization(parsed.data, organizationId);
      if (ok) {
        jobId = parsed.data;
      }
    }
  }

  const candidates = await loadCandidatesForDashboard(organizationId, jobId);

  return c.json({ candidates } satisfies CandidatesListResponse);
});

app.post("/upload", async (c) => {
  const userId = c.var.userId;

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const organizationId = form.get("organizationId");
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    return c.json({ error: "organizationId is required" }, 400);
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

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!membership) {
    return c.json({ error: "You are not a member of this organization" }, 403);
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

  const id = randomUUID();
  const extractedAt = new Date();

  const row = mapExtractionToCandidateInsert({
    id,
    organizationId,
    createdByUserId: userId,
    extraction,
    cvStorageKey: storageKey,
    cvOriginalFilename: file.name,
    cvMimeType: file.type || "application/pdf",
    extractedAt,
  });

  try {
    await db.insert(candidate).values(row);
    await ensureDefaultApplicationForCandidate(id, organizationId);
  } catch (err) {
    return c.json(
      { error: `Could not save candidate: ${errorMessage(err)}` },
      500,
    );
  }

  return c.json({ candidateId: id });
});

const stagePatchSchema = z.object({
  pipelineStageId: z.string().uuid(),
  jobId: z.string().uuid(),
});

app.patch(
  "/:id/application/stage",
  zValidator("param", idParam),
  zValidator("json", stagePatchSchema),
  async (c) => {
    const userId = c.var.userId;
    const candidateId = c.req.valid("param").id;
    const { pipelineStageId, jobId: jobIdBody } = c.req.valid("json");

    const [cand] = await db
      .select({
        organizationId: candidate.organizationId,
      })
      .from(candidate)
      .where(eq(candidate.id, candidateId))
      .limit(1);

    if (!cand) {
      return c.json({ error: "Candidate not found" }, 404);
    }

    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, cand.organizationId),
        ),
      )
      .limit(1);

    if (!membership) {
      return c.json({ error: "Candidate not found" }, 404);
    }

    const [jobRow] = await db
      .select({
        id: job.id,
        pipelineId: job.pipelineId,
      })
      .from(job)
      .where(
        and(
          eq(job.id, jobIdBody),
          eq(job.organizationId, cand.organizationId),
        ),
      )
      .limit(1);

    if (!jobRow) {
      return c.json({ error: "Job not found" }, 404);
    }

    const [stageRow] = await db
      .select({ id: pipelineStage.id })
      .from(pipelineStage)
      .where(
        and(
          eq(pipelineStage.id, pipelineStageId),
          eq(pipelineStage.pipelineId, jobRow.pipelineId),
        ),
      )
      .limit(1);

    if (!stageRow) {
      return c.json(
        { error: "Stage is not part of this job's pipeline" },
        400,
      );
    }

    const [updated] = await db
      .update(candidateApplication)
      .set({
        pipelineStageId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(candidateApplication.candidateId, candidateId),
          eq(candidateApplication.jobId, jobIdBody),
        ),
      )
      .returning({ id: candidateApplication.id });

    if (!updated) {
      return c.json({ error: "Application not found" }, 404);
    }

    return c.json({ ok: true as const });
  },
);

app.get("/:id/cv", zValidator("param", idParam), async (c) => {
  const userId = c.var.userId;
  const candidateId = c.req.valid("param").id;

  const [row] = await db
    .select({
      organizationId: candidate.organizationId,
      cvStorageKey: candidate.cvStorageKey,
      cvOriginalFilename: candidate.cvOriginalFilename,
      cvMimeType: candidate.cvMimeType,
    })
    .from(candidate)
    .where(eq(candidate.id, candidateId))
    .limit(1);

  if (!row) {
    return c.body(null, 404);
  }

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, row.organizationId),
      ),
    )
    .limit(1);

  if (!membership) {
    return c.body(null, 404);
  }

  let buffer: Buffer;
  try {
    buffer = await readCvPdfFile(row.cvStorageKey);
  } catch {
    return c.body(null, 404);
  }

  const mime = row.cvMimeType || "application/pdf";
  const filename =
    row.cvOriginalFilename?.replace(/[^\w.\-()+ ]/g, "_") || "cv.pdf";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});

app.post("/:id/reparse", zValidator("param", idParam), async (c) => {
  const userId = c.var.userId;
  const candidateId = c.req.valid("param").id;

  const [row] = await db
    .select({
      organizationId: candidate.organizationId,
      cvStorageKey: candidate.cvStorageKey,
    })
    .from(candidate)
    .where(eq(candidate.id, candidateId))
    .limit(1);

  if (!row) {
    return c.json({ error: "Candidate not found" }, 404);
  }

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, row.organizationId),
      ),
    )
    .limit(1);

  if (!membership) {
    return c.json({ error: "Candidate not found" }, 404);
  }

  let buffer: Buffer;
  try {
    buffer = await readCvPdfFile(row.cvStorageKey);
  } catch {
    return c.json({ error: "Stored CV file could not be read" }, 404);
  }

  if (!isPdfBuffer(buffer)) {
    return c.json({ error: "Stored file is not a valid PDF" }, 400);
  }

  let extraction;
  try {
    extraction = await extractCvFromPdf(new Uint8Array(buffer));
  } catch (err) {
    const msg = errorMessage(err);
    const status =
      msg.includes("GOOGLE_GENERATIVE_AI_API_KEY") || msg.includes("API key")
        ? 503
        : 502;
    return c.json({ error: `Could not extract CV: ${msg}` }, status);
  }

  const extractedAt = new Date();
  const patch = mapExtractionToCandidateUpdate({ extraction, extractedAt });

  try {
    await db.update(candidate).set(patch).where(eq(candidate.id, candidateId));
  } catch (err) {
    return c.json(
      { error: `Could not update candidate: ${errorMessage(err)}` },
      500,
    );
  }

  return c.json({ ok: true });
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
