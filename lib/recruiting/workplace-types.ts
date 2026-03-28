/** Stored on `job.workplace_type` for create flows. */
export const WORKPLACE_TYPES = ["onsite", "hybrid", "remote"] as const;

export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];

export const WORKPLACE_OPTIONS: { value: WorkplaceType; label: string }[] = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

export function formatWorkplaceLabel(
  stored: string | null | undefined,
): string {
  if (stored == null || stored === "") return "—";
  const match = WORKPLACE_OPTIONS.find(
    (o) => o.value === stored.toLowerCase().trim(),
  );
  if (match) return match.label;
  return stored;
}
