import { Hono } from "hono";

import type { AuthVariables } from "@/lib/hono/require-auth";
import { requireAuth } from "@/lib/hono/require-auth";

/**
 * Hono app scoped to `apiPath`, with session middleware on all routes.
 * Pass `T` to extend `Variables` beyond `AuthVariables` (e.g. org-scoped context).
 */
export function createHonoWithAuth<T extends object = {}>(
  apiPath: string,
): Hono<{ Variables: AuthVariables & T }> {
  const app = new Hono<{ Variables: AuthVariables & T }>().basePath(apiPath);
  app.use("/*", requireAuth);
  return app;
}
