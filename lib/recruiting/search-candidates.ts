import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import {
  candidate,
  candidateApplication,
  job,
  pipelineStage,
} from "@/db/schema";
import type { CandidateListRow } from "@/models/candidate/types";
import { db } from "@/lib/db";

import { loadPipelineStagesForPipelineId } from "./load-job-stages";

export type SearchCandidatesParams = {
  organizationId: string;
  /** Substring match on name or email (case-insensitive). */
  query?: string;
  jobId?: string;
  /** Only applies when `jobId` is set. */
  pipelineStageId?: string;
  limit?: number;
  offset?: number;
};

/**
 * Search candidates in an org with optional job/stage scope and name/email text match.
 * When `jobId` is omitted, the most recently updated application in the org is used for `recruitment` context.
 */
export async function searchCandidates(
  params: SearchCandidatesParams,
): Promise<CandidateListRow[]> {
  const {
    organizationId,
    query: textQuery,
    jobId,
    pipelineStageId,
    limit = 50,
    offset = 0,
  } = params;

  const safeLimit = Math.min(Math.max(1, limit), 200);
  const safeOffset = Math.max(0, offset);

  const pattern =
    textQuery && textQuery.trim().length > 0
      ? `%${textQuery
          .trim()
          .replace(/\\/g, "\\\\")
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_")}%`
      : null;

  if (jobId) {
    const [jobRow] = await db
      .select({
        id: job.id,
        title: job.title,
        pipelineId: job.pipelineId,
        organizationId: job.organizationId,
      })
      .from(job)
      .where(
        and(eq(job.id, jobId), eq(job.organizationId, organizationId)),
      )
      .limit(1);

    if (!jobRow) {
      return [];
    }

    const stageBriefs = await loadPipelineStagesForPipelineId(jobRow.pipelineId);

    const orgCond = eq(candidate.organizationId, organizationId);
    const textCond = pattern
      ? or(
          sql`coalesce(${candidate.fullName}, '') ilike ${pattern} escape '\\'`,
          sql`coalesce(${candidate.email}, '') ilike ${pattern} escape '\\'`,
        )
      : undefined;

    const stageFilter =
      pipelineStageId != null
        ? eq(candidateApplication.pipelineStageId, pipelineStageId)
        : undefined;

    const whereParts: (
      | ReturnType<typeof eq>
      | ReturnType<typeof and>
      | ReturnType<typeof or>
    )[] = [orgCond, eq(candidateApplication.jobId, jobId)];
    if (textCond) {
      whereParts.push(textCond);
    }
    if (stageFilter) {
      whereParts.push(stageFilter);
    }

    const rows = await db
      .select({
        candidate,
        jobId: job.id,
        jobTitle: job.title,
        stageId: pipelineStage.id,
        stageName: pipelineStage.name,
        stageOrder: pipelineStage.sortOrder,
      })
      .from(candidate)
      .innerJoin(
        candidateApplication,
        and(
          eq(candidateApplication.candidateId, candidate.id),
          eq(candidateApplication.jobId, jobId),
        ),
      )
      .innerJoin(
        job,
        and(
          eq(job.id, jobId),
          eq(job.organizationId, candidate.organizationId),
        ),
      )
      .innerJoin(
        pipelineStage,
        eq(pipelineStage.id, candidateApplication.pipelineStageId),
      )
      .where(and(...whereParts))
      .orderBy(desc(candidate.updatedAt))
      .limit(safeLimit)
      .offset(safeOffset);

    return rows.map((r) => ({
      ...r.candidate,
      recruitment: {
        jobId: r.jobId,
        jobTitle: r.jobTitle,
        stage: {
          id: r.stageId,
          name: r.stageName,
          sortOrder: r.stageOrder,
        },
        stages: stageBriefs,
      },
    }));
  }

  // Org-wide: candidates with text filter; attach latest application in org
  const orgCond = eq(candidate.organizationId, organizationId);
  const textCond = pattern
    ? or(
        sql`coalesce(${candidate.fullName}, '') ilike ${pattern} escape '\\'`,
        sql`coalesce(${candidate.email}, '') ilike ${pattern} escape '\\'`,
      )
    : undefined;

  const listWhere = textCond ? and(orgCond, textCond) : orgCond;

  const candRows = await db
    .select()
    .from(candidate)
    .where(listWhere)
    .orderBy(desc(candidate.updatedAt))
    .limit(safeLimit)
    .offset(safeOffset);

  if (candRows.length === 0) {
    return [];
  }

  const ids = candRows.map((c) => c.id);

  const appRows = await db
    .select({
      candidateId: candidateApplication.candidateId,
      jobId: job.id,
      jobTitle: job.title,
      pipelineId: job.pipelineId,
      stageId: pipelineStage.id,
      stageName: pipelineStage.name,
      stageOrder: pipelineStage.sortOrder,
      appUpdated: candidateApplication.updatedAt,
    })
    .from(candidateApplication)
    .innerJoin(job, eq(job.id, candidateApplication.jobId))
    .innerJoin(
      pipelineStage,
      eq(pipelineStage.id, candidateApplication.pipelineStageId),
    )
    .where(
      and(
        inArray(candidateApplication.candidateId, ids),
        eq(job.organizationId, organizationId),
      ),
    )
    .orderBy(desc(candidateApplication.updatedAt));

  const bestByCandidate = new Map<string, (typeof appRows)[0]>();
  for (const row of appRows) {
    if (!bestByCandidate.has(row.candidateId)) {
      // First row per candidate is the latest (ordered desc)
      bestByCandidate.set(row.candidateId, row);
    }
  }

  const out: CandidateListRow[] = [];
  for (const c of candRows) {
    const r = bestByCandidate.get(c.id);
    if (!r) {
      continue;
    }
    if (pipelineStageId && r.stageId !== pipelineStageId) {
      // Without job, stage filter: keep only if latest app matches stage
      continue;
    }
    const stageBriefs = await loadPipelineStagesForPipelineId(r.pipelineId);
    out.push({
      ...c,
      recruitment: {
        jobId: r.jobId,
        jobTitle: r.jobTitle,
        stage: {
          id: r.stageId,
          name: r.stageName,
          sortOrder: r.stageOrder,
        },
        stages: stageBriefs,
      },
    });
  }

  return out;
}
