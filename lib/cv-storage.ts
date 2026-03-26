import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/** Rejects path separators and traversal in storage keys written by `storeCvPdf`. */
export function assertSafeCvStorageKey(storageKey: string): void {
  if (
    storageKey.length === 0 ||
    storageKey !== path.basename(storageKey) ||
    storageKey.includes("..")
  ) {
    throw new Error("Invalid CV storage key");
  }
}

/** Absolute path to a stored CV file (for internal use / streaming). */
export function resolveCvPdfAbsolutePath(storageKey: string): string {
  assertSafeCvStorageKey(storageKey);
  return path.join(uploadRoot(), storageKey);
}

export async function readCvPdfFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveCvPdfAbsolutePath(storageKey));
}

function uploadRoot(): string {
  const base = process.env.CV_UPLOAD_DIR?.trim() || ".data/cv-uploads";
  return path.isAbsolute(base)
    ? base
    : path.join(/* turbopackIgnore: true */ process.cwd(), base);
}

/** Writes PDF bytes to local storage; returns the filename key under CV_UPLOAD_DIR. */
export async function storeCvPdf(
  buffer: Buffer,
  originalFilename: string,
): Promise<{ storageKey: string }> {
  const dir = uploadRoot();
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const safe = originalFilename
    .replace(/[^\w.\-()+ ]/g, "_")
    .trim()
    .slice(-120);
  const suffix = safe || "cv.pdf";
  const storageKey = `${id}_${suffix}`;
  await writeFile(path.join(dir, storageKey), buffer);
  return { storageKey };
}
