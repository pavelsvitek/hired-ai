import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { member } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Signed-in user and first organization membership (same pattern as dashboard upload). */
export async function requireUserAndOrg() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id));

  const organizationId = memberships[0]?.organizationId ?? null;

  return { session, organizationId };
}

export function publicOriginFromHeaders(requestHeaders: Headers): string {
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3010";
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}
