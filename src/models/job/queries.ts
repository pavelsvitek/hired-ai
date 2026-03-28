"use client";

export const jobKeys = {
  all: ["jobs"] as const,
  list: (organizationId: string | null) =>
    [...jobKeys.all, "list", organizationId] as const,
};
