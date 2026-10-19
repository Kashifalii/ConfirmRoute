import { z } from "zod";
import { SERVICE_TYPES } from "@/types/domain";
import { SCENARIO_IDS } from "@/features/extraction/types";
import { currencySchema, isoDateSchema } from "./booking";

export const extractedDataSchema = z.object({
  reference: z.string().nullable(),
  customerName: z.string().nullable(),
  supplierName: z.string().nullable(),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  startDate: isoDateSchema.nullable(),
  endDate: isoDateSchema.nullable(),
  amount: z.number().nullable(),
  currency: currencySchema.nullable(),
});

const fieldEvidenceSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  text: z.string().min(1),
});

/**
 * Every provider result is validated with this schema before the review
 * screen is allowed to use it (SRS FR-07).
 */
export const extractionResultSchema = z.object({
  providerId: z.string().min(1),
  scenarioId: z.enum(SCENARIO_IDS).nullable(),
  data: extractedDataSchema,
  fieldEvidence: z
    .object({
      reference: fieldEvidenceSchema.optional(),
      customerName: fieldEvidenceSchema.optional(),
      supplierName: fieldEvidenceSchema.optional(),
      serviceType: fieldEvidenceSchema.optional(),
      startDate: fieldEvidenceSchema.optional(),
      endDate: fieldEvidenceSchema.optional(),
      amount: fieldEvidenceSchema.optional(),
      currency: fieldEvidenceSchema.optional(),
    })
    .optional(),
  disclosure: z.string().min(1),
});
