import { google } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";

import { cvExtractionSchema, type CvExtraction } from "./schema";

const SYSTEM_PROMPT = `You extract structured candidate data from CV/resume PDFs for recruiting.
Rules:
- Return only factual content supported by the document. If something is not stated, use null or empty arrays.
- Do not invent employers, dates, permits, degrees, or contact details.
- Work authorization: For Switzerland (CH), map phrases like Bewilligung B, Permis C, Aufenthaltsbewilligung L, B permit, C permit, L permit, EU/EFTA into labels. Use confidence "low" when inference is weak.
- date_of_birth: use precision "unknown" when missing; otherwise match how precise the CV is.
- profile_summary: If the CV has an explicit Summary/Profile section, copy or lightly clean it and set source "explicit". If not, write 2-4 neutral sentences summarizing roles and technical focus from work history only; set source "generated".
- work_history: Order newest first. If dates are ranges like 01.2020–03.2022, normalize to ISO-like YYYY-MM where possible.
- technical_focus: Choose from the allowed enum values only; include all that clearly apply.
- warnings: Add entries for missing critical fields, ambiguous permits, conflicting dates, or unreadable sections.`;

const USER_INSTRUCTION = `Extract all fields according to the schema from the attached PDF CV.`;

export function getGeminiModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

export async function extractCvFromPdf(
  pdfBytes: Uint8Array,
): Promise<CvExtraction> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  const modelId = getGeminiModelId();

  try {
    const { output } = await generateText({
      model: google(modelId),
      output: Output.object({
        name: "CandidateProfile",
        description: "Structured CV fields for a candidate record",
        schema: cvExtractionSchema,
      }),
      maxRetries: 2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: USER_INSTRUCTION },
            {
              type: "file",
              data: pdfBytes,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    if (!output) {
      throw new Error("Model returned no structured output");
    }

    return output;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new Error(
        "Could not parse a valid structured profile from the model response",
        { cause: err },
      );
    }
    throw err;
  }
}
