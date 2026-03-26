"use client"

import * as React from "react"
import { UploadCloudIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type FileDropzoneProps = {
  /** e.g. "application/pdf" or ".pdf" */
  accept?: string
  maxFiles?: number
  maxSizeBytes?: number
  disabled?: boolean
  className?: string
  id?: string
  /** Called with validated files (non-empty). */
  onFilesAccepted: (files: File[]) => void
  /** Human-readable reason when files fail validation. */
  onFilesRejected?: (message: string) => void
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function FileDropzone({
  accept = "application/pdf,.pdf",
  maxFiles = 1,
  maxSizeBytes = 15 * 1024 * 1024,
  disabled = false,
  className,
  id,
  onFilesAccepted,
  onFilesRejected,
}: FileDropzoneProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const [isDragging, setIsDragging] = React.useState(false)

  const validateAndEmit = React.useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list)
      if (files.length === 0) return

      if (files.length > maxFiles) {
        onFilesRejected?.(
          maxFiles === 1
            ? "Only one file is allowed."
            : `At most ${maxFiles} files allowed.`,
        )
        return
      }

      const oversize = files.find((f) => f.size > maxSizeBytes)
      if (oversize) {
        onFilesRejected?.(
          `File is too large (max ${formatSize(maxSizeBytes)}).`,
        )
        return
      }

      if (accept.includes("pdf")) {
        const badType = files.find(
          (f) =>
            f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf"),
        )
        if (badType) {
          onFilesRejected?.("Only PDF files are supported.")
          return
        }
      }

      onFilesAccepted(files)
    },
    [
      accept,
      maxFiles,
      maxSizeBytes,
      onFilesAccepted,
      onFilesRejected,
    ],
  )

  return (
    <div className={cn("relative", className)}>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const list = e.target.files
          if (list?.length) validateAndEmit(list)
          e.target.value = ""
        }}
      />
      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setIsDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const related = e.relatedTarget as Node | null
          if (related && e.currentTarget.contains(related)) return
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
          if (disabled) return
          if (e.dataTransfer.files?.length) validateAndEmit(e.dataTransfer.files)
        }}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-muted/30 px-6 py-8 text-center transition-colors",
          "hover:bg-muted/50",
          isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
          <UploadCloudIcon className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Drop a PDF here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF only, up to {formatSize(maxSizeBytes)}
            {maxFiles > 1 ? `, max ${maxFiles} files` : ""}
          </p>
        </div>
      </label>
    </div>
  )
}
