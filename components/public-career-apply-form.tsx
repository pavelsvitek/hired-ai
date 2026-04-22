"use client";

import { Loader2Icon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PublicCareerApplyForm({
  orgSlug,
  jobSlug,
}: {
  orgSlug: string;
  jobSlug: string;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const inputId = React.useId();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const fn = fullName.trim();
      const em = email.trim();
      if (fn) body.set("fullName", fn);
      if (em) body.set("email", em);

      const res = await fetch(
        `/api/public/careers/${encodeURIComponent(orgSlug)}/${encodeURIComponent(jobSlug)}/apply`,
        { method: "POST", body },
      );
      const data: unknown = await res.json().catch(() => ({}));
      let message = "Could not submit application";
      if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
      ) {
        message = (data as { error: string }).error;
      }
      if (!res.ok) {
        setError(message);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
        role="status"
      >
        <p className="font-medium">Application received</p>
        <p className="mt-1 text-muted-foreground">
          Thank you. The hiring team may contact you using the details from your
          résumé.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          Résumé (PDF)
        </label>
        <Input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(ev) => {
            const f = ev.target.files?.[0] ?? null;
            setFile(f);
          }}
          className="cursor-pointer"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${inputId}-name`} className="text-sm font-medium">
          Full name (optional)
        </label>
        <Input
          id={`${inputId}-name`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={busy}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${inputId}-email`} className="text-sm font-medium">
          Email (optional)
        </label>
        <Input
          id={`${inputId}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          autoComplete="email"
        />
        <p className="text-xs text-muted-foreground">
          If you provide an email, we use it to avoid duplicate applications to
          this role.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy}
        className="inline-flex gap-2"
      >
        {busy ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit application"
        )}
      </Button>
    </form>
  );
}
