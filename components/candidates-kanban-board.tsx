"use client";

import {
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useId, useRef, useState, type MutableRefObject } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";
import { useUpdateCandidateStageMutation } from "@/models/candidate/mutations";
import type { CandidateListRow, PipelineStageBrief } from "@/models/candidate/types";

function cardTitle(r: CandidateListRow) {
  return (
    r.fullName?.trim() ||
    r.email?.trim() ||
    r.cvOriginalFilename?.trim() ||
    "Untitled candidate"
  );
}

function draggableId(candidateId: string) {
  return `kanban-card:${candidateId}` as const;
}

function columnDroppableId(stageId: string) {
  return `kanban-column:${stageId}` as const;
}

function KanbanCardFace({ row }: { row: CandidateListRow }) {
  return (
    <>
      <p className="line-clamp-2 font-medium leading-snug">{cardTitle(row)}</p>
      {row.email ? (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {row.email}
        </p>
      ) : null}
    </>
  );
}

function KanbanCard({
  row,
  selectedCandidateId,
  movingCandidateId,
  onOpen,
  suppressNextClickRef,
}: {
  row: CandidateListRow;
  selectedCandidateId: string | null;
  movingCandidateId: string | null;
  onOpen: (candidateId: string) => void;
  suppressNextClickRef: MutableRefObject<string | null>;
}) {
  const busy = movingCandidateId === row.id;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: draggableId(row.id),
      disabled: busy,
      data: {
        candidateId: row.id,
        stageId: row.recruitment.stage.id,
      },
    });

  const style = isDragging
    ? { opacity: 0 }
    : transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-busy={busy}
      aria-grabbed={isDragging}
      className={cn(
        "rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow",
        "cursor-grab touch-none outline-none active:cursor-grabbing",
        "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
        selectedCandidateId === row.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        busy && "pointer-events-none opacity-60",
      )}
      onClick={() => {
        if (suppressNextClickRef.current === row.id) {
          suppressNextClickRef.current = null;
          return;
        }
        onOpen(row.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(row.id);
        }
      }}
    >
      <KanbanCardFace row={row} />
      <p className="sr-only">
        Opens candidate detail. Drag to a stage column to change pipeline stage;
        full stage controls are also in the detail panel.
      </p>
    </div>
  );
}

function KanbanColumn({
  stage,
  rows,
  selectedCandidateId,
  movingCandidateId,
  onOpen,
  suppressNextClickRef,
}: {
  stage: PipelineStageBrief;
  rows: CandidateListRow[];
  selectedCandidateId: string | null;
  movingCandidateId: string | null;
  onOpen: (candidateId: string) => void;
  suppressNextClickRef: MutableRefObject<string | null>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDroppableId(stage.id),
    data: { stageId: stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[min(70dvh,720px)] min-w-[260px] max-w-[320px] flex-col rounded-xl border bg-muted/30",
        isOver && "bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <div className="shrink-0 border-b bg-muted/50 px-3 py-2">
        <h2 className="text-sm font-semibold leading-tight">{stage.name}</h2>
        <p className="text-xs text-muted-foreground">{rows.length} candidates</p>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {rows.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            No candidates
          </p>
        ) : (
          rows.map((r) => (
            <KanbanCard
              key={r.id}
              row={r}
              selectedCandidateId={selectedCandidateId}
              movingCandidateId={movingCandidateId}
              onOpen={onOpen}
              suppressNextClickRef={suppressNextClickRef}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function CandidatesKanbanBoard({
  organizationId,
  rows,
  selectedCandidateId,
  onOpenCandidate,
}: {
  organizationId: string | null;
  rows: CandidateListRow[];
  selectedCandidateId: string | null;
  onOpenCandidate: (candidateId: string) => void;
}) {
  const errorId = useId();
  const suppressNextClickRef = useRef<string | null>(null);
  const [activeDragRow, setActiveDragRow] = useState<CandidateListRow | null>(
    null,
  );
  /**
   * Local pending-move override: applied the moment a card is dropped so the
   * column render uses the new stage before the parent's `rows` prop (driven
   * by the query cache / useSyncExternalStore) has a chance to propagate.
   * Both this and `activeDragRow` live in the same component, so React
   * batches them into the same render and there is no intermediate frame.
   */
  const [pendingMove, setPendingMove] = useState<{
    candidateId: string;
    targetStageId: string;
  } | null>(null);

  const mutation = useUpdateCandidateStageMutation(organizationId);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const stages =
    rows[0]?.recruitment.stages.slice().sort((a, b) => a.sortOrder - b.sortOrder) ??
    [];

  // Derive column contents: apply pendingMove override so the card renders in
  // its target column immediately on drop, before `rows` propagates.
  const byStage = new Map<string, CandidateListRow[]>();
  for (const s of stages) {
    byStage.set(s.id, []);
  }
  for (const r of rows) {
    const sid =
      pendingMove?.candidateId === r.id
        ? pendingMove.targetStageId
        : r.recruitment.stage.id;
    const list = byStage.get(sid);
    if (list) list.push(r);
  }

  // Drop pendingMove once `rows` reflects the move (optimistic or server) or
  // the mutation finishes without the rows matching (error → rollback).
  useEffect(() => {
    if (!pendingMove) return;
    const row = rows.find((r) => r.id === pendingMove.candidateId);
    if (!row) {
      setPendingMove(null);
      return;
    }
    if (row.recruitment.stage.id === pendingMove.targetStageId) {
      setPendingMove(null);
    } else if (!mutation.isPending) {
      // Mutation ended but rows didn't move to target → error rolled back.
      setPendingMove(null);
    }
  }, [rows, pendingMove, mutation.isPending]);

  const movingCandidateId =
    mutation.isPending && mutation.variables
      ? mutation.variables.candidateId
      : null;

  const moveToStage = (candidateId: string, pipelineStageId: string) => {
    const row = rows.find((r) => r.id === candidateId);
    if (!row || row.recruitment.stage.id === pipelineStageId) return;
    mutation.reset();
    mutation.mutate({ candidateId, pipelineStageId });
  };

  const scheduleClickSuppress = (candidateId: string) => {
    suppressNextClickRef.current = candidateId;
    window.setTimeout(() => {
      if (suppressNextClickRef.current === candidateId) {
        suppressNextClickRef.current = null;
      }
    }, 0);
  };

  const onDragStart = (event: DragStartEvent) => {
    const id = event.active.id.toString();
    if (!id.startsWith("kanban-card:")) return;
    const candidateId = id.slice("kanban-card:".length);
    setActiveDragRow(rows.find((r) => r.id === candidateId) ?? null);
  };

  const onDragCancel = (event: DragCancelEvent) => {
    const activeData = event.active.data.current as
      | { candidateId: string }
      | undefined;
    if (activeData?.candidateId) {
      scheduleClickSuppress(activeData.candidateId);
    }
    setActiveDragRow(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current as
      | { candidateId: string }
      | undefined;
    if (activeData?.candidateId) {
      scheduleClickSuppress(activeData.candidateId);
    }

    let targetStageId: string | null = null;
    if (over && activeData?.candidateId) {
      const overId = over.id.toString();
      if (overId.startsWith("kanban-column:")) {
        targetStageId = overId.slice("kanban-column:".length);
      } else if (overId.startsWith("kanban-card:")) {
        const overCandidateId = overId.slice("kanban-card:".length);
        targetStageId =
          rows.find((r) => r.id === overCandidateId)?.recruitment.stage.id ??
          null;
      }
    }

    const candidateId = activeData?.candidateId;
    const isRealMove =
      candidateId != null &&
      targetStageId != null &&
      rows.find((r) => r.id === candidateId)?.recruitment.stage.id !==
        targetStageId;

    // Both state updates are in the same component → always the same render.
    // pendingMove keeps the card in the target column while the parent's rows
    // (useSyncExternalStore) catch up; activeDragRow clears the overlay.
    if (isRealMove && candidateId && targetStageId) {
      setPendingMove({ candidateId, targetStageId });
    }
    setActiveDragRow(null);

    if (isRealMove && candidateId && targetStageId) {
      moveToStage(candidateId, targetStageId);
    }
  };

  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pipeline stages to display.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Keyboard:</span> focus a
        card, press Enter or Space to open detail, then use stage controls
        there.
      </p>
      {mutation.error instanceof Error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
      >
        <div
          className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2"
          aria-label="Candidates by pipeline stage"
        >
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              rows={byStage.get(stage.id) ?? []}
              selectedCandidateId={selectedCandidateId}
              movingCandidateId={movingCandidateId}
              onOpen={onOpenCandidate}
              suppressNextClickRef={suppressNextClickRef}
            />
          ))}
        </div>
        <DragOverlay zIndex={1000} dropAnimation={null}>
          {activeDragRow ? (
            <div className="w-[min(100vw-2rem,300px)] cursor-grabbing rounded-lg border bg-card p-3 text-left shadow-lg">
              <KanbanCardFace row={activeDragRow} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function viewToggleButtonClass(active: boolean) {
  return cn(
    active &&
      "z-10 border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  );
}

export function CandidatesViewToggle({
  view,
  onViewChange,
}: {
  view: "list" | "board";
  onViewChange: (v: "list" | "board") => void;
}) {
  return (
    <ButtonGroup aria-label="Candidates view">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={viewToggleButtonClass(view === "list")}
        onClick={() => onViewChange("list")}
      >
        List
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={viewToggleButtonClass(view === "board")}
        onClick={() => onViewChange("board")}
      >
        Board
      </Button>
    </ButtonGroup>
  );
}
