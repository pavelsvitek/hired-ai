"use client";

import { CheckIcon, Link2Icon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

export function CopyCareersLinkButton({
  url,
  label = "Copy careers link",
  variant = "outline",
  size = "sm",
  className,
  disabled,
}: {
  url: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      disabled={disabled ?? !url}
      onClick={() => {
        if (!url) return;
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-green-600" aria-hidden />
      ) : (
        <Link2Icon className="size-3.5" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
