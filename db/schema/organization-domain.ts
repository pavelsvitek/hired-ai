import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { organization } from "./auth-schema";

export const organizationDomain = pgTable(
  "organization_domain",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("organization_domain_domain_uidx").on(table.domain)],
);

export const organizationDomainRelations = relations(
  organizationDomain,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationDomain.organizationId],
      references: [organization.id],
    }),
  }),
);
