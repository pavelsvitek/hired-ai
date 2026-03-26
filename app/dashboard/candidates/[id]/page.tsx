import { redirect } from "next/navigation";

/**
 * Legacy direct links → query-based detail on the unified candidates page.
 */
export default async function LegacyCandidateDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/candidates?candidate=${encodeURIComponent(id)}`);
}
