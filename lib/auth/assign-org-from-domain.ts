import { eq } from "drizzle-orm";

import { organizationDomain } from "@/db/schema/organization-domain";
import { db } from "@/lib/db";

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

/** Called after user row is created; adds org membership when email domain matches. */
export async function assignOrganizationFromEmailDomain(user: {
  id: string;
  email: string;
}): Promise<void> {
  const domain = emailDomain(user.email);
  if (!domain) return;

  const [row] = await db
    .select()
    .from(organizationDomain)
    .where(eq(organizationDomain.domain, domain))
    .limit(1);
  if (!row) return;

  const { auth } = await import("@/lib/auth");

  try {
    await auth.api.addMember({
      body: {
        userId: user.id,
        organizationId: row.organizationId,
        role: "member",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes("already")) return;
    throw e;
  }
}
