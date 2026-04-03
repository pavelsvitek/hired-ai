"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { CurrencyCombobox } from "@/components/currency-combobox";
import { GooglePlacesLocationInput } from "@/components/google-places-location-input";
import { PayPeriodCombobox } from "@/components/pay-period-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkplaceCombobox } from "@/components/workplace-combobox";
import { DEFAULT_PIPELINE_ID } from "@/lib/recruiting/constants";
import type { PipelineOption } from "@/lib/recruiting/load-pipeline-options";
import {
  PAY_PERIODS,
  type PayPeriod,
} from "@/lib/recruiting/pay-periods";
import {
  SALARY_CURRENCIES,
  type SalaryCurrency,
} from "@/lib/recruiting/salary-currencies";
import {
  WORKPLACE_TYPES,
  type WorkplaceType,
} from "@/lib/recruiting/workplace-types";
import { cn } from "@/lib/utils";
import { useCreateJobMutation } from "@/models/job/mutations";
import type { CreateJobInput } from "@/models/job/types";

const fieldClass =
  "flex w-full min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function JobCreateForm({
  organizationId,
  pipelines,
  defaultPipelineId = DEFAULT_PIPELINE_ID,
}: {
  organizationId: string;
  pipelines: PipelineOption[];
  defaultPipelineId?: string;
}) {
  const router = useRouter();
  const createJob = useCreateJobMutation(organizationId);

  const [title, setTitle] = React.useState("");
  const [pipelineId, setPipelineId] = React.useState(
    pipelines.some((p) => p.id === defaultPipelineId)
      ? defaultPipelineId
      : (pipelines[0]?.id ?? defaultPipelineId),
  );
  const [summary, setSummary] = React.useState("");
  const [externalSlug, setExternalSlug] = React.useState("");
  const [workplaceType, setWorkplaceType] = React.useState<WorkplaceType>(
    WORKPLACE_TYPES[0],
  );
  const [locationLabel, setLocationLabel] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [salaryMin, setSalaryMin] = React.useState("");
  const [salaryMax, setSalaryMax] = React.useState("");
  const [salaryCurrency, setSalaryCurrency] = React.useState<SalaryCurrency>(
    SALARY_CURRENCIES[0],
  );
  const [payPeriod, setPayPeriod] = React.useState<PayPeriod>(PAY_PERIODS[0]);
  const [salaryRangeError, setSalaryRangeError] = React.useState<string | null>(
    null,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateJobInput = {
      title: title.trim(),
      pipelineId,
      workplaceType,
    };
    const s = summary.trim();
    if (s) payload.summary = s;
    const slug = externalSlug.trim();
    if (slug) payload.externalSlug = slug;
    const ll = locationLabel.trim();
    if (ll) payload.locationLabel = ll;
    const et = employmentType.trim();
    if (et) payload.employmentType = et;
    payload.payPeriod = payPeriod;

    const minRaw = salaryMin.trim();
    const maxRaw = salaryMax.trim();
    const parsedMin = minRaw ? Number.parseInt(minRaw, 10) : NaN;
    const parsedMax = maxRaw ? Number.parseInt(maxRaw, 10) : NaN;
    const minNum = !Number.isNaN(parsedMin) ? parsedMin : undefined;
    const maxNum = !Number.isNaN(parsedMax) ? parsedMax : undefined;

    if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
      setSalaryRangeError(
        "Salary minimum must be less than or equal to salary maximum.",
      );
      return;
    }
    setSalaryRangeError(null);

    if (minNum !== undefined) payload.salaryMin = minNum;
    if (maxNum !== undefined) payload.salaryMax = maxNum;
    payload.salaryCurrency = salaryCurrency;

    createJob.mutate(payload, {
      onSuccess: () => {
        router.push("/dashboard/jobs");
        router.refresh();
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-2xl flex-col gap-6"
    >
      <div className="space-y-2">
        <label htmlFor="job-title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="job-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Senior Software Engineer"
          required
          maxLength={300}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="job-pipeline" className="text-sm font-medium">
          Pipeline
        </label>
        <select
          id="job-pipeline"
          value={pipelineId}
          onChange={(e) => setPipelineId(e.target.value)}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          )}
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="job-summary" className="text-sm font-medium">
          Summary
        </label>
        <textarea
          id="job-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Short overview for listings"
          maxLength={8000}
          rows={4}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="job-slug" className="text-sm font-medium">
          Public slug
        </label>
        <Input
          id="job-slug"
          value={externalSlug}
          onChange={(e) => setExternalSlug(e.target.value)}
          placeholder="senior-engineer-sf (optional, lowercase)"
          maxLength={120}
          autoComplete="off"
          aria-invalid={createJob.isError ? true : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Globally unique URL segment. Only lowercase letters, numbers, and
          hyphens.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="job-workplace" className="text-sm font-medium">
            Workplace <span className="text-destructive">*</span>
          </label>
          <WorkplaceCombobox
            id="job-workplace"
            value={workplaceType}
            onValueChange={setWorkplaceType}
            required
            aria-invalid={createJob.isError ? true : undefined}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="job-location" className="text-sm font-medium">
            Location
          </label>
          <GooglePlacesLocationInput
            id="job-location"
            value={locationLabel}
            onValueChange={setLocationLabel}
            placeholder="Start typing an address or city"
            maxLength={300}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="job-employment" className="text-sm font-medium">
          Employment type
        </label>
        <Input
          id="job-employment"
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value)}
          placeholder="full_time"
          maxLength={64}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="job-salary-min" className="text-sm font-medium">
            Salary min
          </label>
          <Input
            id="job-salary-min"
            type="number"
            inputMode="numeric"
            value={salaryMin}
            onChange={(e) => {
              setSalaryMin(e.target.value);
              setSalaryRangeError(null);
            }}
            placeholder="120000"
            min={0}
            aria-invalid={
              salaryRangeError || createJob.isError ? true : undefined
            }
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="job-salary-max" className="text-sm font-medium">
            Salary max
          </label>
          <Input
            id="job-salary-max"
            type="number"
            inputMode="numeric"
            value={salaryMax}
            onChange={(e) => {
              setSalaryMax(e.target.value);
              setSalaryRangeError(null);
            }}
            placeholder="180000"
            min={0}
            aria-invalid={
              salaryRangeError || createJob.isError ? true : undefined
            }
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="job-currency" className="text-sm font-medium">
            Currency
          </label>
          <CurrencyCombobox
            id="job-currency"
            value={salaryCurrency}
            onValueChange={setSalaryCurrency}
            aria-invalid={createJob.isError ? true : undefined}
          />
        </div>
      </div>

      {salaryRangeError ? (
        <p className="text-sm text-destructive" role="alert">
          {salaryRangeError}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="job-pay-period" className="text-sm font-medium">
          Pay period
        </label>
        <PayPeriodCombobox
          id="job-pay-period"
          value={payPeriod}
          onValueChange={setPayPeriod}
          aria-invalid={createJob.isError ? true : undefined}
        />
      </div>

      {createJob.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {createJob.error.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={createJob.isPending}>
          {createJob.isPending ? "Creating…" : "Create job"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={createJob.isPending}
          onClick={() => router.push("/dashboard/jobs")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
