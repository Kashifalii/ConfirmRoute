import type {
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  ScenarioId,
} from "./types";

/**
 * Deterministic mock extraction provider. Each known scenario returns the
 * same predefined structured output every time; no real parsing happens and
 * arbitrary uploaded documents never receive fabricated fields.
 */
export const MOCK_PROVIDER_ID = "mock-provider";

const SIMULATION_DISCLOSURE =
  "Simulated extraction — this output is predefined demo data, not the result of real AI parsing.";

const UPLOAD_DISCLOSURE =
  "No automatic field extraction is performed for uploaded documents in this MVP. Review the extracted text and enter the booking manually.";

const SCENARIO_DATA: Record<ScenarioId, ExtractionResult> = {
  "clean-hotel": {
    providerId: MOCK_PROVIDER_ID,
    scenarioId: "clean-hotel",
    data: {
      reference: "MVR-1099",
      customerName: "Ahmed Khan",
      supplierName: "Mountain View Resort",
      serviceType: "hotel",
      startDate: "2026-12-20",
      endDate: "2026-12-24",
      amount: 88000,
      currency: "PKR",
    },
    disclosure: SIMULATION_DISCLOSURE,
  },
  "missing-amount": {
    providerId: MOCK_PROVIDER_ID,
    scenarioId: "missing-amount",
    data: {
      reference: "SWA-9127",
      customerName: "Zainab Farooq",
      supplierName: "SkyWing Airlines",
      serviceType: "flight",
      startDate: "2027-01-15",
      endDate: "2027-01-22",
      amount: null,
      currency: "PKR",
    },
    disclosure: `${SIMULATION_DISCLOSURE} The document does not state a cost amount.`,
  },
  "changed-price": {
    providerId: MOCK_PROVIDER_ID,
    scenarioId: "changed-price",
    data: {
      reference: "MVR-1025",
      customerName: "Ahmed Khan",
      supplierName: "Mountain View Resort",
      serviceType: "hotel",
      startDate: "2026-11-15",
      endDate: "2026-11-18",
      amount: 82000,
      currency: "PKR",
    },
    disclosure: `${SIMULATION_DISCLOSURE} This amendment proposes a new amount for the existing MVR-1025 booking.`,
  },
  "duplicate-reference": {
    providerId: MOCK_PROVIDER_ID,
    scenarioId: "duplicate-reference",
    data: {
      reference: "SWA 8842",
      customerName: "Maryam Aslam",
      supplierName: "SkyWing Airlines",
      serviceType: "flight",
      startDate: "2026-12-09",
      endDate: "2026-12-15",
      amount: 96000,
      currency: "PKR",
    },
    disclosure: SIMULATION_DISCLOSURE,
  },
};

export const mockExtractionProvider: ExtractionProvider = {
  id: MOCK_PROVIDER_ID,
  label: "Mock provider (simulated)",
  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    if (input.kind === "scenario") {
      const scenario = SCENARIO_DATA[input.scenarioId];
      if (!scenario) {
        throw new Error(`Unknown sample scenario: ${input.scenarioId}`);
      }
      // Simulated processing latency for a realistic intake experience.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return structuredClone(scenario);
    }

    // Arbitrary uploaded documents: never fabricate structured fields.
    return {
      providerId: MOCK_PROVIDER_ID,
      scenarioId: null,
      data: {
        reference: null,
        customerName: null,
        supplierName: null,
        serviceType: null,
        startDate: null,
        endDate: null,
        amount: null,
        currency: null,
      },
      disclosure: UPLOAD_DISCLOSURE,
    };
  },
};
