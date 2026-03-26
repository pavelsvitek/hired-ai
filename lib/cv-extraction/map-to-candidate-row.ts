import type { CvExtraction } from "./schema";
import { getGeminiModelId } from "./extract";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapExtractionToCandidateFields(
  extraction: CvExtraction,
  extractedAt: Date,
) {
  const conf = extraction.work_authorization.confidence;
  const workAuthNeedsReview = conf === "low" || conf === "medium";
  const modelId = getGeminiModelId();

  return {
    fullName: extraction.full_name,
    email: extraction.email,
    dateOfBirth: parseDate(extraction.date_of_birth.value),
    dateOfBirthPrecision: extraction.date_of_birth.precision,
    addressStreet: extraction.address.street,
    addressCity: extraction.address.city,
    addressRegion: extraction.address.region,
    addressPostalCode: extraction.address.postal_code,
    addressCountry: extraction.address.country,
    addressCountryCode: extraction.address.country_code,
    profileSummary: extraction.profile_summary.text,
    profileSummarySource: extraction.profile_summary.source,
    workAuthCountry: extraction.work_authorization.country,
    workAuthStatus: extraction.work_authorization.status,
    workAuthLabels: extraction.work_authorization.labels,
    workAuthRawEvidence: extraction.work_authorization.raw_evidence,
    workAuthConfidence: extraction.work_authorization.confidence,
    workAuthNeedsReview,
    technicalFocus: extraction.technical_focus,
    workHistory: extraction.work_history,
    education: extraction.education,
    skills: extraction.skills,
    extractionWarnings: extraction.warnings,
    extractionMeta: {
      schemaVersion: 1,
      model: modelId,
    },
    extractionModel: modelId,
    extractedAt,
  };
}

export function mapExtractionToCandidateUpdate(params: {
  extraction: CvExtraction;
  extractedAt: Date;
}) {
  return mapExtractionToCandidateFields(
    params.extraction,
    params.extractedAt,
  );
}

export function mapExtractionToCandidateInsert(params: {
  id: string;
  organizationId: string;
  createdByUserId: string | null;
  extraction: CvExtraction;
  cvStorageKey: string;
  cvOriginalFilename: string;
  cvMimeType: string;
  extractedAt: Date;
}) {
  const { extraction, ...rest } = params;
  return {
    id: rest.id,
    organizationId: rest.organizationId,
    createdByUserId: rest.createdByUserId,
    ...mapExtractionToCandidateFields(extraction, rest.extractedAt),
    cvStorageKey: rest.cvStorageKey,
    cvOriginalFilename: rest.cvOriginalFilename,
    cvMimeType: rest.cvMimeType,
  };
}
