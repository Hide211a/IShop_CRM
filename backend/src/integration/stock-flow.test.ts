import { describe, it, expect, beforeAll } from "vitest";
import { DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { postDocument } from "../services/stock.service.js";
import { unpostDocument } from "../services/unpost.service.js";
import { createIsolatedProduct, requireSeedData } from "../test/helpers.js";

describe("stock flow integration", () => {
  let productId: string;
  let userId: string;

  beforeAll(async () => {
    const { user } = await requireSeedData();
    userId = user.id;
    const product = await createIsolatedProduct("flow");
    productId = product.id;
  });

  it("receipt increases stock then expense decreases", async () => {
    const before = await prisma.stockBalance.findUnique({ where: { productId } });
    const beforeQty = before?.quantity ?? 0;

    const receipt = await prisma.document.create({
      data: {
        number: `TEST-ПН-${Date.now()}`,
        type: DocumentType.RECEIPT,
        createdById: userId,
        lines: { create: [{ productId, quantity: 2, unitPrice: 100 }] },
      },
    });

    await postDocument(receipt.id);
    const afterReceipt = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(afterReceipt?.quantity).toBe(beforeQty + 2);

    const expense = await prisma.document.create({
      data: {
        number: `TEST-ВТ-${Date.now()}`,
        type: DocumentType.EXPENSE,
        createdById: userId,
        lines: { create: [{ productId, quantity: 1, unitPrice: 150 }] },
      },
    });

    await postDocument(expense.id);
    const afterExpense = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(afterExpense?.quantity).toBe(beforeQty + 1);

    await unpostDocument(expense.id);
    const afterUnpost = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(afterUnpost?.quantity).toBe(beforeQty + 2);

    const cancelled = await prisma.document.findUnique({ where: { id: expense.id } });
    expect(cancelled?.status).toBe("CANCELLED");
  });
});
