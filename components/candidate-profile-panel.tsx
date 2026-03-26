"use client";

import type { InferSelectModel } from "drizzle-orm";
import type { ReactNode } from "react";

import { candidate } from "@/db/schema";
import { Separator } from "@/components/ui/separator";

type CandidateRow = InferSelectModel<typeof candidate>;

const TECH_FOCUS_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  full_stack: "Full stack",
  devops: "DevOps",
  ml_ai_research: "ML / AI / Research",
  data_engineering: "Data engineering",
  mobile: "Mobile",
  security: "Security",
  other: "Other",
};

function em(text: string | null | undefined): string {
  const t = text?.trim();
  return t && t.length > 0 ? t : "—";
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  );
}

type WorkEntry = {
  employer?: string;
  title?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  location?: string | null;
  highlights?: string[];
};

type EduEntry = {
  institution?: string | null;
  degree?: string | null;
  field?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

function parseWorkHistory(raw: unknown): WorkEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is WorkEntry => x !== null && typeof x === "object");
}

function parseEducation(raw: unknown): EduEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is EduEntry => x !== null && typeof x === "object");
}

function parseSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function coerceDate(
  d: Date | string | null | undefined,
): Date | null {
  if (d == null || d === "") {
    return null;
  }
  if (d instanceof Date) {
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(
  d: Date | string | null | undefined,
  precision?: string | null,
): string {
  const date = coerceDate(d);
  if (!date) {
    return "—";
  }
  try {
    if (precision === "year") {
      return String(date.getUTCFullYear());
    }
    if (precision === "month") {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        timeZone: "UTC",
      });
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "—";
  }
}

export function CandidateProfilePanel({ row }: { row: CandidateRow }) {
  const focus =
    row.technicalFocus?.map((k) => TECH_FOCUS_LABELS[k] ?? k.replaceAll("_", " ")) ??
    [];
  const work = parseWorkHistory(row.workHistory);
  const edu = parseEducation(row.education);
  const skills = parseSkills(row.skills);
  const warnings = row.extractionWarnings ?? [];

  return (
    <div className="flex flex-col gap-6 pr-1">
      <a href="#candidate-profile-details" className="sr-only">
        Skip to profile details
      </a>
      <div id="candidate-profile-details" />

      <Section id="identity" title="Identity & contact">
        <p>
          <span className="text-muted-foreground">Name </span>
          {em(row.fullName)}
        </p>
        <p>
          <span className="text-muted-foreground">Email </span>
          {em(row.email)}
        </p>
        <p>
          <span className="text-muted-foreground">Date of birth </span>
          {formatDate(row.dateOfBirth, row.dateOfBirthPrecision)}
          {row.dateOfBirthPrecision && row.dateOfBirthPrecision !== "unknown" ? (
            <span className="ml-1 text-xs text-muted-foreground">
              ({row.dateOfBirthPrecision})
            </span>
          ) : null}
        </p>
        {(row.addressCity || row.addressCountry) && (
          <p>
            <span className="text-muted-foreground">Location </span>
            {[row.addressCity, row.addressRegion, row.addressCountry]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        )}
      </Section>

      <Separator />

      <Section id="summary" title="Profile summary">
        <p className="whitespace-pre-wrap">{em(row.profileSummary)}</p>
        {row.profileSummarySource ? (
          <p className="text-xs text-muted-foreground">
            Source: {row.profileSummarySource}
          </p>
        ) : null}
      </Section>

      <Separator />

      <Section id="work-auth" title="Work authorization">
        {row.workAuthNeedsReview ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-950 dark:text-amber-100">
            Needs review
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Country </span>
          {em(row.workAuthCountry)}
        </p>
        <p>
          <span className="text-muted-foreground">Status </span>
          {em(row.workAuthStatus)}
        </p>
        <p>
          <span className="text-muted-foreground">Confidence </span>
          {em(row.workAuthConfidence)}
        </p>
        {row.workAuthLabels && row.workAuthLabels.length > 0 ? (
          <ul className="list-inside list-disc text-muted-foreground">
            {row.workAuthLabels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Labels —</p>
        )}
        {row.workAuthRawEvidence ? (
          <p className="text-xs text-muted-foreground">
            Evidence: {row.workAuthRawEvidence}
          </p>
        ) : null}
      </Section>

      <Separator />

      <Section id="focus" title="Technical focus">
        {focus.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {focus.map((label) => (
              <span
                key={label}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Not extracted</p>
        )}
      </Section>

      <Separator />

      <Section id="skills" title="Skills">
        {skills.length > 0 ? (
          <ul className="list-inside list-disc space-y-0.5">
            {skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Not extracted</p>
        )}
      </Section>

      <Separator />

      <Section id="work" title="Work history">
        {work.length === 0 ? (
          <p className="text-muted-foreground">Not extracted</p>
        ) : (
          <ol className="space-y-4">
            {work.map((job, i) => (
              <li key={`${job.employer}-${i}`} className="border-l-2 border-muted pl-3">
                <p className="font-medium">
                  {em(job.title)}
                  {job.employer ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {job.employer}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[job.start_date, job.is_current ? "Present" : job.end_date]
                    .filter(Boolean)
                    .join(" → ")}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
                {job.highlights && job.highlights.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {job.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Separator />

      <Section id="education" title="Education">
        {edu.length === 0 ? (
          <p className="text-muted-foreground">Not extracted</p>
        ) : (
          <ul className="space-y-3">
            {edu.map((e, i) => (
              <li key={`${e.institution}-${i}`}>
                <p className="font-medium">{em(e.institution)}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.degree, e.field].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[e.start_date, e.end_date].filter(Boolean).join(" → ") || ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Separator />

      <Section id="quality" title="Extraction quality">
        {warnings.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-2 text-amber-950 dark:text-amber-100">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No warnings</p>
        )}
        <p className="text-xs text-muted-foreground">
          Model: {em(row.extractionModel)} · Extracted{" "}
          {coerceDate(row.extractedAt)?.toLocaleString() ?? "—"}
        </p>
      </Section>

      <Separator />

      <Section id="meta" title="File & timestamps">
        <p className="text-xs text-muted-foreground">
          Original file: {em(row.cvOriginalFilename)}
        </p>
        <p className="text-xs text-muted-foreground">
          Created: {coerceDate(row.createdAt)?.toLocaleString() ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          Updated: {coerceDate(row.updatedAt)?.toLocaleString() ?? "—"}
        </p>
      </Section>
    </div>
  );
}
