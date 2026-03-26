import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { candidate, member } from "@/db/schema";
import { auth } from "@/lib/auth";
import { readCvPdfFile } from "@/lib/cv-storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: candidateId } = await context.params;

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
    return new NextResponse(null, { status: 404 });
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
    return new NextResponse(null, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readCvPdfFile(row.cvStorageKey);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const mime = row.cvMimeType || "application/pdf";
  const filename = row.cvOriginalFilename?.replace(/[^\w.\-()+ ]/g, "_") || "cv.pdf";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
