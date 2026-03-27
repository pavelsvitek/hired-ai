"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import {
  ArrowLeftIcon,
  FilesIcon,
  Loader2Icon,
  MoreVerticalIcon,
  RefreshCwIcon,
  UploadCloudIcon,
} from "lucide-react";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { Activity, useEffect, useMemo, useRef } from "react";

import { CandidateCvViewer } from "@/components/candidate-cv-viewer";
import { CandidateProfilePanel } from "@/components/candidate-profile-panel";
import { CandidateStageControl } from "@/components/candidate-stage-control";
import {
  CandidatesKanbanBoard,
  CandidatesViewToggle,
} from "@/components/candidates-kanban-board";
import { CvBulkUploadDialog } from "@/components/cv-bulk-upload-dialog";
import { CvUploadDialog } from "@/components/cv-upload-dialog";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useReparseCandidateMutation } from "@/models/candidate/mutations";
import { useCandidatesList } from "@/models/candidate/queries";
import type { CandidateListRow } from "@/models/candidate/types";

export type CandidatesPageClientProps = {
  organizationId: string | null;
  rows: CandidateListRow[];
  origin: string;
};

function listTitle(r: CandidateListRow) {
  return (
    r.fullName?.trim() ||
    r.email?.trim() ||
    r.cvOriginalFilename?.trim() ||
    "Untitled candidate"
  );
}

function CandidateDetailBody({
  organizationId,
  origin,
  detailPayload,
  reparseBusy,
  reparseError,
  onReparse,
}: {
  organizationId: string | null;
  origin: string;
  detailPayload: { candidateId: string; row: CandidateListRow };
  reparseBusy: boolean;
  reparseError: string | null;
  onReparse: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-4 pl-0 pr-4 pt-0 lg:flex-row">
      <div className="flex min-w-0 flex-[0.65] flex-col gap-2">
        <p className="sr-only" id="pdf-preview-label">
          Candidate CV preview
        </p>
        <CandidateCvViewer
          cvUrl={`${origin}/api/candidates/${detailPayload.candidateId}/cv`}
          mimeType={detailPayload.row.cvMimeType}
          pdfDocumentId={`${detailPayload.candidateId}:${detailPayload.row.cvStorageKey}`}
        />
      </div>
      <aside
        className="flex max-h-none min-w-0 flex-[0.35] flex-col overflow-y-auto border-t border-border lg:max-h-[calc(100dvh-4.5rem)] lg:border-l lg:border-t-0 lg:pl-6"
        aria-labelledby="profile-panel-heading"
      >
        <div className="mb-4 space-y-2">
          <div className="flex items-start gap-1">
            <h1
              id="profile-panel-heading"
              className="min-w-0 flex-1 text-lg font-semibold leading-tight"
            >
              {listTitle(detailPayload.row)}
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  disabled={reparseBusy}
                  aria-label="Candidate actions"
                >
                  {reparseBusy ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <MoreVerticalIcon className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled={reparseBusy}
                  onClick={() => void onReparse()}
                >
                  <RefreshCwIcon className="size-4 text-muted-foreground" />
                  Parse CV again
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {reparseError ? (
            <p className="text-sm text-destructive">{reparseError}</p>
          ) : null}
          <CandidateStageControl
            organizationId={organizationId}
            candidateId={detailPayload.candidateId}
            recruitment={detailPayload.row.recruitment}
          />
        </div>
        <CandidateProfilePanel row={detailPayload.row} />
      </aside>
    </div>
  );
}

export function CandidatesPageClient({
  organizationId,
  rows: initialRows,
  origin,
}: CandidatesPageClientProps) {
  const listQuery = useCandidatesList(organizationId, {
    initialData: initialRows,
  });
  const rows = useMemo(
    () =>
      organizationId != null && organizationId.length > 0
        ? (listQuery.data ?? initialRows)
        : [],
    [organizationId, listQuery.data, initialRows],
  );

  const reparseMutation = useReparseCandidateMutation(organizationId);

  const [candidatesView, setCandidatesView] = useQueryState(
    "view",
    parseAsStringLiteral(["list", "board"]).withDefault("list"),
  );

  const [candidateId, setCandidateId] = useQueryState(
    "candidate",
    parseAsString,
  );

  const selectedRow = useMemo(
    () => (candidateId ? rows.find((r) => r.id === candidateId) : undefined),
    [candidateId, rows],
  );

  const detailOpen = !!(candidateId && selectedRow);

  /* Keep last detail while the list/detail Activity toggles so hidden content (e.g. PDF) stays mounted. */
  const lastDetailRef = useRef<{
    candidateId: string;
    row: CandidateListRow;
  } | null>(null);
  if (candidateId && selectedRow) {
    // eslint-disable-next-line react-hooks/refs -- intentional ref-as-instance-var for Activity keep-alive
    lastDetailRef.current = { candidateId, row: selectedRow };
  }
  /** Prefer live list row when open so pipeline updates after refetch; ref retains last row when panel closes. */
  const detailPayload =
    candidateId && selectedRow
      ? { candidateId, row: selectedRow }
      : lastDetailRef.current;

  useEffect(() => {
    if (candidateId && !selectedRow) {
      void setCandidateId(null);
    }
  }, [candidateId, selectedRow, setCandidateId]);

  const clearCandidate = () => {
    void setCandidateId(null);
  };

  useHotkey("Escape", () => {
    if (candidateId) {
      clearCandidate();
    }
  });

  const afterUpload = (id: string) => {
    void setCandidateId(id);
  };

  const afterBulkUpload = ({
    candidateIds,
  }: {
    candidateIds: string[];
  }) => {
    const last = candidateIds[candidateIds.length - 1];
    if (last) void setCandidateId(last);
  };

  const resetReparse = reparseMutation.reset;
  useEffect(() => {
    resetReparse();
  }, [candidateId, resetReparse]);

  const emptyState = (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-8">
      <p className="text-sm text-muted-foreground">
        No candidates yet. Upload a CV to add your first profile.
      </p>
      {organizationId ? (
        <div className="flex flex-wrap gap-2">
          <CvUploadDialog
            organizationId={organizationId}
            onSuccess={afterUpload}
            trigger={<Button>Upload CV</Button>}
          />
          <CvBulkUploadDialog
            organizationId={organizationId}
            onComplete={afterBulkUpload}
            trigger={
              <Button variant="outline">
                <FilesIcon data-icon="inline-start" />
                Bulk upload
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );

  const listSection = (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => void setCandidateId(r.id)}
            className={cn(
              "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between",
              candidateId === r.id && "bg-muted/40",
            )}
          >
            <div>
              <p className="font-medium">{listTitle(r)}</p>
              {r.email ? (
                <p className="text-sm text-muted-foreground">{r.email}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {r.recruitment.stage.name}
              </span>
              <p className="text-xs text-muted-foreground">
                Extracted{" "}
                {r.extractedAt
                  ? new Date(
                    r.extractedAt as string | number | Date,
                  ).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                  : "—"}
              </p>
              {r.technicalFocus && r.technicalFocus.length > 0 ? (
                <div className="flex max-w-full flex-wrap justify-end gap-1">
                  {r.technicalFocus.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
                    >
                      {tag.replaceAll("_", " ")}
                    </span>
                  ))}
                  {r.technicalFocus.length > 5 ? (
                    <span className="text-[10px] text-muted-foreground">
                      +{r.technicalFocus.length - 5}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );

  const boardSection = (
    <CandidatesKanbanBoard
      organizationId={organizationId}
      rows={rows}
      selectedCandidateId={candidateId}
      onOpenCandidate={(id) => void setCandidateId(id)}
    />
  );

  const listOrBoard = candidatesView === "list" ? listSection : boardSection;

  const listAndDetail =
    organizationId && rows.length > 0 ? (
      <div className="relative isolate min-h-0 flex-1">
        <Activity mode={detailOpen ? "hidden" : "visible"} name="candidates-list">
          <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden">
            {listOrBoard}
          </div>
        </Activity>
        <Activity mode={detailOpen ? "visible" : "hidden"} name="candidate-detail">
          <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden">
            {detailPayload ? (
              <CandidateDetailBody
                organizationId={organizationId}
                origin={origin}
                detailPayload={detailPayload}
                reparseBusy={reparseMutation.isPending}
                reparseError={
                  reparseMutation.error instanceof Error
                    ? reparseMutation.error.message
                    : reparseMutation.error
                      ? "Could not parse CV"
                      : null
                }
                onReparse={() => {
                  reparseMutation.reset();
                  reparseMutation.mutate({
                    candidateId: detailPayload.candidateId,
                  });
                }}
              />
            ) : null}
          </div>
        </Activity>
      </div>
    ) : null;

  return (
    <DashboardShell
      organizationId={organizationId}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            {candidateId && selectedRow ? (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={clearCandidate}>
                      Candidates
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[12rem] truncate md:max-w-[24rem]">
                    {listTitle(selectedRow)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>Candidates</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      }
      headerAction={
        <>
          {candidateId && selectedRow ? (
            <Button variant="outline" size="sm" onClick={clearCandidate}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
          ) : null}
          {!detailOpen && organizationId && rows.length > 0 ? (
            <CandidatesViewToggle
              view={candidatesView}
              onViewChange={(v) => void setCandidatesView(v)}
            />
          ) : null}
          {organizationId ? (
            <>
              <CvUploadDialog
                organizationId={organizationId}
                onSuccess={afterUpload}
                trigger={
                  <Button size="sm" variant="outline">
                    <UploadCloudIcon data-icon="inline-start" />
                    Upload CV
                  </Button>
                }
              />
              <CvBulkUploadDialog
                organizationId={organizationId}
                onComplete={afterBulkUpload}
                trigger={
                  <Button size="sm" variant="outline">
                    <FilesIcon data-icon="inline-start" />
                    Bulk upload
                  </Button>
                }
              />
            </>
          ) : null}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
        {!organizationId ? (
          <p className="text-sm text-muted-foreground">
            You are not a member of an organization yet. Join or create one to
            see candidates.
          </p>
        ) : rows.length === 0 ? (
          emptyState
        ) : (
          listAndDetail
        )}
      </div>
    </DashboardShell>
  );
}
