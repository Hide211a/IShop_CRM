import { describe, it, expect, beforeAll } from "vitest";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { postDocument, StockError } from "./stock.service.js";
import {
  cancelReservation,
  completeReservationAsSale,
} from "./reservation.service.js";
import { createIsolatedProduct, requireSeedData } from "../test/helpers.js";

describe("reservation service", () => {
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    const { user } = await requireSeedData();
    userId = user.id;
    const product = await createIsolatedProduct("reserve");
    productId = product.id;

    const receipt = await prisma.document.create({
      data: {
        number: `TEST-ПН-RSV-SETUP-${Date.now()}`,
        type: DocumentType.RECEIPT,
        createdById: userId,
        lines: { create: [{ productId, quantity: 10, unitPrice: 100 }] },
      },
    });
    await postDocument(receipt.id);
  });

  async function createPostedReservation() {
    const reserve = await prisma.document.create({
      data: {
        number: `TEST-РЗ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: DocumentType.RESERVATION,
        createdById: userId,
        buyerName: "Тест Клієнт",
        buyerPhone: "+380501112233",
        lines: { create: [{ productId, quantity: 1, unitPrice: 200 }] },
      },
    });
    await postDocument(reserve.id);
    return reserve.id;
  }

  it("cancelReservation returns stock and cancels document", async () => {
    const beforeQty =
      (await prisma.stockBalance.findUnique({ where: { productId } }))?.quantity ?? 0;

    const reserveId = await createPostedReservation();
    const afterReserve = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(afterReserve?.quantity).toBe(beforeQty - 1);

    const cancelled = await cancelReservation(reserveId);
    expect(cancelled.status).toBe(DocumentStatus.CANCELLED);

    const afterCancel = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(afterCancel?.quantity).toBe(beforeQty);
  });

  it("completeReservationAsSale creates expense and closes reserve", async () => {
    const reserveId = await createPostedReservation();
    const beforeQty =
      (await prisma.stockBalance.findUnique({ where: { productId } }))?.quantity ?? 0;

    const { reservation, sale } = await completeReservationAsSale(reserveId, userId);

    expect(reservation.status).toBe(DocumentStatus.CANCELLED);
    expect(sale.type).toBe(DocumentType.EXPENSE);
    expect(sale.status).toBe(DocumentStatus.POSTED);
    expect(sale.buyerName).toBe("Тест Клієнт");

    const afterQty =
      (await prisma.stockBalance.findUnique({ where: { productId } }))?.quantity ?? 0;
    expect(afterQty).toBe(beforeQty);
  });

  it("cancelReservation rejects non-reservation documents", async () => {
    const expense = await prisma.document.create({
      data: {
        number: `TEST-ВТ-RSV-ERR-${Date.now()}`,
        type: DocumentType.EXPENSE,
        status: DocumentStatus.POSTED,
        postedAt: new Date(),
        createdById: userId,
        lines: { create: [{ productId, quantity: 1, unitPrice: 100 }] },
      },
    });

    await expect(cancelReservation(expense.id)).rejects.toThrow(StockError);
    await expect(cancelReservation(expense.id)).rejects.toThrow(/лише документ резерву/);
  });
});
