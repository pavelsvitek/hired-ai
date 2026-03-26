import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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
