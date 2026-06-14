import { describe, it, expect } from "vitest";
import { DocumentType } from "@prisma/client";
import {
  createDocumentSchema,
  validateDocumentReadyToPost,
} from "./documentValidation.js";

describe("documentValidation", () => {
  it("requires supplier for receipt", () => {
    const parsed = createDocumentSchema.safeParse({
      type: DocumentType.RECEIPT,
      lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires buyer name for expense", () => {
    const parsed = createDocumentSchema.safeParse({
      type: DocumentType.EXPENSE,
      lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires buyer phone for reservation", () => {
    const parsed = createDocumentSchema.safeParse({
      type: DocumentType.RESERVATION,
      buyerName: "Іван Петренко",
      lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("validateDocumentReadyToPost blocks receipt without supplier", () => {
    const message = validateDocumentReadyToPost({
      type: DocumentType.RECEIPT,
      supplierId: null,
      buyerName: null,
      buyerPhone: null,
      lines: [{ quantity: 1, unitPrice: 100 }],
    });
    expect(message).toMatch(/постачальника/i);
  });
});
