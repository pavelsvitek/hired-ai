import { asc } from "drizzle-orm";

import { pipeline } from "@/db/schema";
import { db } from "@/lib/db";
import { ensureDefaultPipeline } from "@/lib/recruiting/ensure-defaults";

export type PipelineOption = {
  id: string;
  name: string;
};

/** Pipelines available when creating a job (global list; ensures default exists). */
export async function loadPipelineOptions(): Promise<PipelineOption[]> {
  await ensureDefaultPipeline();

  return db
    .select({
      id: pipeline.id,
      name: pipeline.name,
    })
    .from(pipeline)
    .orderBy(asc(pipeline.name));
}
