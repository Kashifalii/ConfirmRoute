import { describe, expect, it } from "vitest";
import { mockExtractionProvider } from "./mock-provider";
import { EXTRACTION_SCENARIOS, type ScenarioId } from "./types";

describe("mockExtractionProvider", () => {
  it("returns the predefined clean-hotel fields", async () => {
    const result = await mockExtractionProvider.extract({
      kind: "scenario",
      scenarioId: "clean-hotel",
    });
    expect(result.data).toEqual({
      reference: "MVR-1099",
      customerName: "Ahmed Khan",
      supplierName: "Mountain View Resort",
      serviceType: "hotel",
      startDate: "2026-12-20",
      endDate: "2026-12-24",
      amount: 88000,
      currency: "PKR",
    });
    expect(result.disclosure).toMatch(/simulated/i);
  });

  it("returns the missing-amount scenario without an amount", async () => {
    const result = await mockExtractionProvider.extract({
      kind: "scenario",
      scenarioId: "missing-amount",
    });
    expect(result.data.amount).toBeNull();
    expect(result.data.currency).toBe("PKR");
    expect(result.data.reference).toBe("SWA-9127");
  });

  it("returns the changed-price scenario with the amended amount", async () => {
    const result = await mockExtractionProvider.extract({
      kind: "scenario",
      scenarioId: "changed-price",
    });
    expect(result.data.reference).toBe("MVR-1025");
    expect(result.data.amount).toBe(82000);
  });

  it("returns the duplicate-reference scenario with the reused reference", async () => {
    const result = await mockExtractionProvider.extract({
      kind: "scenario",
      scenarioId: "duplicate-reference",
    });
    expect(result.data.reference).toBe("SWA 8842");
    expect(result.data.customerName).toBe("Maryam Aslam");
  });

  it("is deterministic: repeated extraction returns identical output", async () => {
    const scenarioIds = EXTRACTION_SCENARIOS.map((s) => s.id) as ScenarioId[];
    for (const scenarioId of scenarioIds) {
      const first = await mockExtractionProvider.extract({ kind: "scenario", scenarioId });
      const second = await mockExtractionProvider.extract({ kind: "scenario", scenarioId });
      expect(first).toEqual(second);
    }
  });

  it("never fabricates fields for arbitrary uploaded documents", async () => {
    const result = await mockExtractionProvider.extract({
      kind: "uploaded-document",
      filename: "random-supplier-confirmation.pdf",
      extractedText: "Some selectable text from an unknown document.",
    });
    expect(result.data).toEqual({
      reference: null,
      customerName: null,
      supplierName: null,
      serviceType: null,
      startDate: null,
      endDate: null,
      amount: null,
      currency: null,
    });
    expect(result.scenarioId).toBeNull();
    expect(result.disclosure).toMatch(/no automatic field extraction/i);
  });

  it("rejects unknown scenarios", async () => {
    await expect(
      mockExtractionProvider.extract({
        kind: "scenario",
        scenarioId: "does-not-exist" as ScenarioId,
      }),
    ).rejects.toThrow(/unknown sample scenario/i);
  });
});
