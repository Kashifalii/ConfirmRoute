import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStoreMock } = vi.hoisted(() => ({
  getStoreMock: vi.fn(),
}));

vi.mock("@/lib/data/get-store", () => ({
  getStore: getStoreMock,
}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

import { GET } from "./route";

describe("GET /api/audit/export", () => {
  beforeEach(() => {
    getStoreMock.mockReset();
  });

  it("exports booking changes and neutralizes spreadsheet formulas", async () => {
    getStoreMock.mockResolvedValue({
      listBookings: async () => [{ id: "booking-1", reference: "=1+1" }],
      listBookingChanges: async () => [
        {
          createdAt: "2026-10-16T10:00:00.000Z",
          actor: "Operator",
          field: "status",
          previousValue: "pending_review",
          newValue: "approved",
          reason: "Reviewed",
        },
      ],
      listExceptions: async () => [],
    });

    const response = await GET();
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv).toContain('"event_type","booking_reference"');
    expect(csv).toContain('"booking_change","\'=1+1"');
    expect(csv).toContain('"pending_review","approved","Reviewed"');
  });
});
