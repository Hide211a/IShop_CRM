import { describe, it, expect } from "vitest";
import { DocumentType } from "@prisma/client";
import { quantityDelta } from "./stock.service.js";

describe("quantityDelta", () => {
  it("receipt increases stock", () => {
    expect(quantityDelta(DocumentType.RECEIPT, 5)).toBe(5);
  });

  it("expense decreases stock", () => {
    expect(quantityDelta(DocumentType.EXPENSE, 3)).toBe(-3);
  });

  it("reservation decreases available stock", () => {
    expect(quantityDelta(DocumentType.RESERVATION, 2)).toBe(-2);
  });

  it("inventory line quantity is treated as target (delta computed separately)", () => {
    expect(quantityDelta(DocumentType.INVENTORY, 10)).toBe(10);
  });
});
