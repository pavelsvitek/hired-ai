import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { organization } from "@/db/schema";
import { db } from "@/lib/db";
import { loadCandidateDetail } from "@/lib/recruiting/load-candidate-detail";
import { loadCandidatesForDashboard } from "@/lib/recruiting/load-candidates-dashboard";
import { loadJobForDashboard } from "@/lib/recruiting/load-job-for-dashboard";
import { loadPipelineStagesForJob } from "@/lib/recruiting/load-job-stages";
import { loadJobsForDashboard } from "@/lib/recruiting/load-jobs-dashboard";
import { moveApplicationToStage } from "@/lib/recruiting/move-application-stage";
import { searchCandidates } from "@/lib/recruiting/search-candidates";

export const runtime = "nodejs";
export const maxDuration = 60;

const orgId = z.uuid();

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const moveItemSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  pipelineStageId: z.string().uuid(),
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_organizations",
      {
        description:
          "List organizations in the system. Use an id as organizationId for all other tools.",
      },
      async () => {
        const rows = await db
          .select({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          })
          .from(organization);
        return jsonResult({ organizations: rows });
      },
    );

    server.registerTool(
      "list_jobs",
      {
        description:
          "List all jobs for an organization (titles, slugs, pipeline name, status).",
        inputSchema: { organizationId: orgId },
      },
      async (args) => {
        const jobs = await loadJobsForDashboard(args.organizationId);
        return jsonResult({ jobs });
      },
    );

    server.registerTool(
      "get_job",
      {
        description:
          "Get one job with pipeline stage definitions (for valid pipelineStageId when moving candidates).",
        inputSchema: { organizationId: orgId, jobId: z.string().uuid() },
      },
      async (args) => {
        const job = await loadJobForDashboard(
          args.organizationId,
          args.jobId,
        );
        if (!job) {
          return jsonResult({ error: "Job not found" });
        }
        const pipelineStages = await loadPipelineStagesForJob(
          args.organizationId,
          args.jobId,
        );
        return jsonResult({ job, pipelineStages: pipelineStages ?? [] });
      },
    );

    server.registerTool(
      "list_candidates_for_job",
      {
        description:
          "List candidates that have an application to the given job, with current stage and full stage list.",
        inputSchema: { organizationId: orgId, jobId: z.string().uuid() },
      },
      async (args) => {
        const candidates = await loadCandidatesForDashboard(
          args.organizationId,
          args.jobId,
          { skipBackfill: true },
        );
        return jsonResult({ candidates });
      },
    );

    server.registerTool(
      "get_candidate",
      {
        description:
          "Get full candidate record for an organization. Includes a relative cvUrl and CV metadata; does not return file bytes.",
        inputSchema: { organizationId: orgId, candidateId: z.string().uuid() },
      },
      async (args) => {
        const detail = await loadCandidateDetail(
          args.organizationId,
          args.candidateId,
        );
        if (!detail) {
          return jsonResult({ error: "Candidate not found" });
        }
        const { candidate: row, applications, cvUrl } = detail;
        return jsonResult({
          candidate: row,
          applications,
          cv: {
            url: cvUrl,
            originalFilename: row.cvOriginalFilename,
            mimeType: row.cvMimeType,
            extractedAt: row.extractedAt,
          },
        });
      },
    );

    server.registerTool(
      "search_candidates",
      {
        description:
          "Search candidates. Optionally scope to a job and stage; text matches full name and email (case-insensitive).",
        inputSchema: {
          organizationId: orgId,
          query: z.string().optional(),
          jobId: z.string().uuid().optional(),
          pipelineStageId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(200).optional(),
          offset: z.number().int().min(0).optional(),
        },
      },
      async (args) => {
        const candidates = await searchCandidates({
          organizationId: args.organizationId,
          query: args.query,
          jobId: args.jobId,
          pipelineStageId: args.pipelineStageId,
          limit: args.limit,
          offset: args.offset,
        });
        return jsonResult({ candidates });
      },
    );

    server.registerTool(
      "move_application_stage",
      {
        description:
          "Move a candidate's application to another pipeline stage for a job.",
        inputSchema: {
          organizationId: orgId,
          candidateId: z.string().uuid(),
          jobId: z.string().uuid(),
          pipelineStageId: z.string().uuid(),
        },
      },
      async (args) => {
        const result = await moveApplicationToStage({
          organizationId: args.organizationId,
          candidateId: args.candidateId,
          jobId: args.jobId,
          pipelineStageId: args.pipelineStageId,
        });
        if (!result.ok) {
          return jsonResult({ ok: false, code: result.code, error: result.message });
        }
        return jsonResult({ ok: true });
      },
    );

    server.registerTool(
      "move_applications_batch",
      {
        description:
          "Move several candidate applications. Each item is a candidate, job, and target stage. Results are per item (partial success).",
        inputSchema: {
          organizationId: orgId,
          moves: z.array(moveItemSchema).min(1).max(100),
        },
      },
      async (args) => {
        const results: Array<
          | {
              index: number;
              candidateId: string;
              jobId: string;
              ok: true;
            }
          | {
              index: number;
              candidateId: string;
              jobId: string;
              ok: false;
              code: string;
              error: string;
            }
        > = [];

        for (let i = 0; i < args.moves.length; i++) {
          const m = args.moves[i]!;
          const r = await moveApplicationToStage({
            organizationId: args.organizationId,
            candidateId: m.candidateId,
            jobId: m.jobId,
            pipelineStageId: m.pipelineStageId,
          });
          if (r.ok) {
            results.push({
              index: i,
              candidateId: m.candidateId,
              jobId: m.jobId,
              ok: true,
            });
          } else {
            results.push({
              index: i,
              candidateId: m.candidateId,
              jobId: m.jobId,
              ok: false,
              code: r.code,
              error: r.message,
            });
          }
        }

        return jsonResult({ results });
      },
    );
  },
  {
    serverInfo: {
      name: "hired-ai",
      version: "1.0.0",
    },
    instructions:
      "hired.ai recruiting MCP: use list_organizations to choose organizationId, then list_jobs, list_candidates_for_job, search_candidates, or get_job for pipeline stage ids before move_application_stage. CV files are not returned as bytes; use the cv url from get_candidate in an authenticated session.",
  },
  {
    basePath: "/api",
    maxDuration: 60,
    disableSse: true,
  },
);

export { handler as DELETE, handler as GET, handler as POST };
