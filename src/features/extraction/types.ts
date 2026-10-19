import type { CurrencyCode, ServiceType } from "@/types/domain";

export const SCENARIO_IDS = [
  "clean-hotel",
  "missing-amount",
  "changed-price",
  "duplicate-reference",
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Structured fields a provider can return. Null = not found in the document. */
export interface ExtractedBookingData {
  reference: string | null;
  customerName: string | null;
  supplierName: string | null;
  serviceType: ServiceType | null;
  startDate: string | null;
  endDate: string | null;
  amount: number | null;
  currency: CurrencyCode | null;
}

export type ExtractedField = keyof ExtractedBookingData;
export type ExtractionConfidence = "high" | "medium" | "low";

export interface ExtractedFieldEvidence {
  confidence: ExtractionConfidence;
  text: string;
}

export type ExtractionInput =
  | { kind: "scenario"; scenarioId: ScenarioId }
  | {
      kind: "uploaded-document";
      filename: string;
      /** Selectable text read by PDF.js, or null when none could be read. */
      extractedText: string | null;
    };

export interface ExtractionResult {
  providerId: string;
  scenarioId: ScenarioId | null;
  data: ExtractedBookingData;
  fieldEvidence?: Partial<Record<ExtractedField, ExtractedFieldEvidence>>;
  /**
   * Honest note shown next to the result, e.g. whether output was simulated or
   * parsed locally with deterministic rules.
   */
  disclosure: string;
}

/**
 * Contract every extraction provider must implement. Providers may use
 * deterministic local parsing or an external service without changing the UI
 * or persistence layers.
 */
export interface ExtractionProvider {
  readonly id: string;
  readonly label: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}

export interface ExtractionScenarioMeta {
  id: ScenarioId;
  title: string;
  description: string;
  expectedBehavior: string;
  /** Text-based sample PDF in /public/samples used to illustrate the scenario. */
  sampleDocument: string;
}

export const EXTRACTION_SCENARIOS: readonly ExtractionScenarioMeta[] = [
  {
    id: "clean-hotel",
    title: "Clean hotel booking",
    description:
      "A complete Mountain View Resort confirmation for Ahmed Khan (PKR 88,000).",
    expectedBehavior:
      "All fields are populated and can be reviewed and approved once validation passes.",
    sampleDocument: "/samples/hotel-confirmation-mvr-1099.pdf",
  },
  {
    id: "missing-amount",
    title: "Missing information",
    description:
      "A SkyWing Airlines confirmation that does not state the ticket cost.",
    expectedBehavior:
      "The missing amount is highlighted and approval is blocked until it is added.",
    sampleDocument: "/samples/flight-confirmation-swa-9127.pdf",
  },
  {
    id: "changed-price",
    title: "Changed price",
    description:
      "An amended Mountain View Resort confirmation for booking MVR-1025 listing PKR 82,000 instead of the recorded PKR 75,000.",
    expectedBehavior:
      "The previous and proposed amounts and the PKR 7,000 difference are shown for review; accepting the amendment preserves the previous value in the change history.",
    sampleDocument: "/samples/amended-confirmation-mvr-1025.pdf",
  },
  {
    id: "duplicate-reference",
    title: "Duplicate reference",
    description:
      "A SkyWing Airlines confirmation whose reference matches existing booking SWA-8842.",
    expectedBehavior:
      "A duplicate-reference warning is raised and the record needs review before it can be approved.",
    sampleDocument: "/samples/flight-confirmation-swa-8842.pdf",
  },
] as const;
