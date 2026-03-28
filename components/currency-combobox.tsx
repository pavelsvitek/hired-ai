"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  SALARY_CURRENCY_OPTIONS,
  type SalaryCurrency,
} from "@/lib/recruiting/salary-currencies";

export function CurrencyCombobox({
  id,
  value,
  onValueChange,
  disabled,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: SalaryCurrency;
  onValueChange: (next: SalaryCurrency) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const selected =
    SALARY_CURRENCY_OPTIONS.find((o) => o.value === value) ??
    SALARY_CURRENCY_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-8 w-full justify-between px-2.5 font-normal text-left",
          )}
        >
          <span className="truncate">{selected.label}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <ul className="max-h-[min(12rem,var(--radix-popover-content-available-height))] overflow-y-auto">
          {SALARY_CURRENCY_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={cn(
                  "flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground",
                  value === opt.value && "bg-accent/60",
                )}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn(
                    "size-4 shrink-0",
                    value === opt.value ? "opacity-100" : "opacity-0",
                  )}
                />
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
