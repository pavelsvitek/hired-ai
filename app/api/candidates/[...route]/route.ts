import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { handle } from "hono/vercel";
import { z } from "zod";

import { candidate, member, type CandidateRowSelect } from "@/db/schema";
import { extractCvFromPdf } from "@/lib/cv-extraction/extract";
import {
  mapExtractionToCandidateInsert,
  mapExtractionToCandidateUpdate,
} from "@/lib/cv-extraction/map-to-candidate-row";
import { readCvPdfFile, storeCvPdf } from "@/lib/cv-storage";
import { db } from "@/lib/db";
import { createHonoWithAuth } from "@/lib/hono/create-hono-with-auth";

export const runtime = "nodejs";

const idParam = z.object({
  id: z.string().uuid(),
});

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
}

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
    return c.json({ candidates: [] satisfies CandidateRowSelect[] });
  }

  const rows = await db
    .select()
    .from(candidate)
    .where(eq(candidate.organizationId, organizationId))
    .orderBy(desc(candidate.updatedAt));

  return c.json({ candidates: rows });
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

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
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
  } catch (err) {
    return c.json(
      { error: `Could not save candidate: ${errorMessage(err)}` },
      500,
    );
  }

  return c.json({ candidateId: id });
});

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
