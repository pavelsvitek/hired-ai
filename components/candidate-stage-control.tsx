"use client";

import { Loader2Icon, MoreVerticalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUpdateCandidateStageMutation } from "@/models/candidate/mutations";
import type { RecruitmentSummary } from "@/models/candidate/types";

export function CandidateStageControl({
  organizationId,
  candidateId,
  recruitment,
  jobId,
}: {
  organizationId: string | null;
  candidateId: string;
  recruitment: RecruitmentSummary;
  jobId: string | null;
}) {
  const mutation = useUpdateCandidateStageMutation(organizationId, jobId);
  const busy = mutation.isPending;
  const { stage, stages } = recruitment;
  const nextStage = stages.find((s) => s.sortOrder === stage.sortOrder + 1);

  const moveTo = (pipelineStageId: string) => {
    mutation.reset();
    mutation.mutate({ candidateId, pipelineStageId });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Stage
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {stage.name}
        </span>
      </div>
      <ButtonGroup
        aria-label="Move candidate to pipeline stage"
        className="w-fit max-w-full min-w-0 self-start"
      >
        <Button
          type="button"
          variant="default"
          className="max-w-full min-w-0"
          aria-busy={busy}
          disabled={busy || !nextStage}
          onClick={() => {
            if (nextStage) moveTo(nextStage.id);
          }}
        >
          {busy ? (
            <span className="relative inline-flex max-w-full min-w-0 items-center justify-center">
              <span className="invisible min-w-0 truncate" aria-hidden>
                {nextStage
                  ? `Move to ${nextStage.name}`
                  : "No next stage"}
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2Icon className="size-3 shrink-0 animate-spin" />
              </span>
            </span>
          ) : nextStage ? (
            <span className="min-w-0 truncate">
              Move to {nextStage.name}
            </span>
          ) : (
            <span className="min-w-0 truncate">No next stage</span>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="default"
              disabled={busy}
              aria-label="Choose pipeline stage"
            >
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {stages.map((s) => (
              <DropdownMenuItem
                key={s.id}
                disabled={busy || s.id === stage.id}
                className={cn(s.id === stage.id && "bg-muted")}
                onClick={() => moveTo(s.id)}
              >
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      {mutation.error instanceof Error ? (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      ) : null}
    </div>
  );
}
