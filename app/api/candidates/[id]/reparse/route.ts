import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { candidate, member } from "@/db/schema";
import { auth } from "@/lib/auth";
import { extractCvFromPdf } from "@/lib/cv-extraction/extract";
import { mapExtractionToCandidateUpdate } from "@/lib/cv-extraction/map-to-candidate-row";
import { readCvPdfFile } from "@/lib/cv-storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: candidateId } = await context.params;

  const [row] = await db
    .select({
      organizationId: candidate.organizationId,
      cvStorageKey: candidate.cvStorageKey,
    })
    .from(candidate)
    .where(eq(candidate.id, candidateId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, row.organizationId),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readCvPdfFile(row.cvStorageKey);
  } catch {
    return NextResponse.json(
      { error: "Stored CV file could not be read" },
      { status: 404 },
    );
  }

  if (!isPdfBuffer(buffer)) {
    return NextResponse.json(
      { error: "Stored file is not a valid PDF" },
      { status: 400 },
    );
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
    return NextResponse.json(
      { error: `Could not extract CV: ${msg}` },
      { status },
    );
  }

  const extractedAt = new Date();
  const patch = mapExtractionToCandidateUpdate({ extraction, extractedAt });

  try {
    await db.update(candidate).set(patch).where(eq(candidate.id, candidateId));
  } catch (err) {
    return NextResponse.json(
      { error: `Could not update candidate: ${errorMessage(err)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
