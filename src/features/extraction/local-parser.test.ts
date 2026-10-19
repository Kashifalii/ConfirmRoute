import { describe, expect, it } from "vitest";
import { extractBookingDataFromText, LOCAL_PARSER_ID } from "./local-parser";

describe("extractBookingDataFromText", () => {
  it("extracts a labeled hotel confirmation and keeps source evidence", () => {
    const result = extractBookingDataFromText(
      [
        "Mountain View Resort, Bhurban Road, Murree",
        "Booking reference: MVR-1099",
        "Guest name: Ahmed Khan",
        "Service type: Hotel accommodation",
        "Check-in date: 20 December 2026",
        "Check-out date: 24 December 2026",
        "Total cost: PKR 88,000",
      ].join("\n"),
    );

    expect(result.providerId).toBe(LOCAL_PARSER_ID);
    expect(result.data).toEqual({
      reference: "MVR-1099",
      customerName: "Ahmed Khan",
      supplierName: "Mountain View Resort, Bhurban Road, Murree",
      serviceType: "hotel",
      startDate: "2026-12-20",
      endDate: "2026-12-24",
      amount: 88000,
      currency: "PKR",
    });
    expect(result.fieldEvidence?.amount).toEqual({
      confidence: "high",
      text: "Total cost: PKR 88,000",
    });
    expect(result.disclosure).toMatch(/parsed locally/i);
  });

  it("prefers amended totals and does not reuse the previous price", () => {
    const result = extractBookingDataFromText(
      [
        "Booking reference: MVR-1025",
        "Guest name: Ahmed Khan",
        "Amended total cost: PKR 82,000",
        "Previous total cost: PKR 75,000",
      ].join("\n"),
    );

    expect(result.data.amount).toBe(82000);
    expect(result.data.currency).toBe("PKR");
  });

  it("finds a currency listed separately from the amount", () => {
    const result = extractBookingDataFromText(
      ["Booking reference: CS-4102", "Total amount: 350", "Currency: AED"].join(
        "\n",
      ),
    );

    expect(result.data.amount).toBe(350);
    expect(result.data.currency).toBe("AED");
  });

  it("understands common numeric dates and infers an explicitly described flight", () => {
    const result = extractBookingDataFromText(
      [
        "SkyWing Airlines",
        "Confirmation number: SWA-9127",
        "Passenger name: Zainab Farooq",
        "Flight itinerary",
        "Departure date: 15/01/2027",
        "Return date: 22/01/2027",
      ].join("\n"),
    );

    expect(result.data).toMatchObject({
      supplierName: "SkyWing Airlines",
      reference: "SWA-9127",
      customerName: "Zainab Farooq",
      serviceType: "flight",
      startDate: "2027-01-15",
      endDate: "2027-01-22",
    });
  });

  it("does not guess unrecognized or missing fields", () => {
    const result = extractBookingDataFromText(
      "This is a supplier document with no identifiable booking details.",
    );

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
    expect(result.fieldEvidence).toEqual({});
    expect(result.disclosure).toMatch(/no booking fields/i);
  });

  it("does not mistake a previous payment or an unrelated number for the total", () => {
    const result = extractBookingDataFromText(
      [
        "Booking reference: SWA-8842",
        "Previous total cost: PKR 96,000",
        "Passenger count: 2",
      ].join("\n"),
    );

    expect(result.data.amount).toBeNull();
  });
});
