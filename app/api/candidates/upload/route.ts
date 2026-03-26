import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { candidate, member } from "@/db/schema";
import { auth } from "@/lib/auth";
import { extractCvFromPdf } from "@/lib/cv-extraction/extract";
import { mapExtractionToCandidateInsert } from "@/lib/cv-extraction/map-to-candidate-row";
import { storeCvPdf } from "@/lib/cv-storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const organizationId = form.get("organizationId");
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  if (!isPdfBuffer(buf)) {
    return NextResponse.json(
      { error: "File does not look like a valid PDF" },
      { status: 400 },
    );
  }

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this organization" },
      { status: 403 },
    );
  }

  let storageKey: string;
  try {
    const stored = await storeCvPdf(buf, file.name);
    storageKey = stored.storageKey;
  } catch (err) {
    return NextResponse.json(
      { error: `Could not store file: ${errorMessage(err)}` },
      { status: 500 },
    );
  }

  let extraction;
  try {
    extraction = await extractCvFromPdf(new Uint8Array(buf));
  } catch (err) {
    const msg = errorMessage(err);
    const status =
      msg.includes("GOOGLE_GENERATIVE_AI_API_KEY") ||
        msg.includes("API key")
        ? 503
        : 502;
    return NextResponse.json(
      { error: `Could not extract CV: ${msg}` },
      { status },
    );
  }

  const id = randomUUID();
  const extractedAt = new Date();

  const row = mapExtractionToCandidateInsert({
    id,
    organizationId,
    createdByUserId: session.user.id,
    extraction,
    cvStorageKey: storageKey,
    cvOriginalFilename: file.name,
    cvMimeType: file.type || "application/pdf",
    extractedAt,
  });

  try {
    await db.insert(candidate).values(row);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not save candidate: ${errorMessage(err)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ candidateId: id });
}
