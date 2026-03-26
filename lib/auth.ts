import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

import * as schema from "@/db/schema";
import { db } from "@/lib/db";
import { assignOrganizationFromEmailDomain } from "@/lib/auth/assign-org-from-domain";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [organization(), nextCookies()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await assignOrganizationFromEmailDomain(user);
        },
      },
    },
  },
});
