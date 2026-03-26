import { createMiddleware } from "hono/factory";

import { auth } from "@/lib/auth";

export type AuthVariables = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  userId: string;
};

/** Ensures Better Auth session; sets `session` and `userId` on the Hono context. */
export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("session", session);
  c.set("userId", session.user.id);
  await next();
});
