import { asc, eq } from "drizzle-orm";

import { pipelineStage } from "@/db/schema";
import { db } from "@/lib/db";

/** First stage for a pipeline (`sort_order` ascending). */
export async function getInitialPipelineStageId(
  pipelineId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: pipelineStage.id })
    .from(pipelineStage)
    .where(eq(pipelineStage.pipelineId, pipelineId))
    .orderBy(asc(pipelineStage.sortOrder))
    .limit(1);

  return row?.id ?? null;
}
