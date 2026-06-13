import { describe, it, expect, beforeAll } from "vitest";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { postDocument, StockError } from "./stock.service.js";
import { createIsolatedProduct, requireSeedData } from "../test/helpers.js";

describe("postDocument", () => {
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    const { user } = await requireSeedData();
    userId = user.id;
    const product = await createIsolatedProduct("post");
    productId = product.id;
  });

  it("posts receipt and increases stock balance", async () => {
    const before = await prisma.stockBalance.findUnique({ where: { productId } });
    const beforeQty = before?.quantity ?? 0;

    const doc = await prisma.document.create({
      data: {
        number: `TEST-ПН-POST-${Date.now()}`,
        type: DocumentType.RECEIPT,
        createdById: userId,
        lines: { create: [{ productId, quantity: 3, unitPrice: 100 }] },
      },
    });

    const posted = await postDocument(doc.id);
    expect(posted.status).toBe(DocumentStatus.POSTED);
    expect(posted.postedAt).not.toBeNull();

    const after = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(after?.quantity).toBe(beforeQty + 3);
  });

  it("posts expense and decreases stock balance", async () => {
    const beforeQty =
      (await prisma.stockBalance.findUnique({ where: { productId } }))?.quantity ?? 0;

    const receipt = await prisma.document.create({
      data: {
        number: `TEST-ПН-EXP-BASE-${Date.now()}`,
        type: DocumentType.RECEIPT,
        createdById: userId,
        lines: { create: [{ productId, quantity: 5, unitPrice: 100 }] },
      },
    });
    await postDocument(receipt.id);

    const doc = await prisma.document.create({
      data: {
        number: `TEST-ВТ-POST-${Date.now()}`,
        type: DocumentType.EXPENSE,
        createdById: userId,
        lines: { create: [{ productId, quantity: 1, unitPrice: 150 }] },
      },
    });

    await postDocument(doc.id);
    const after = await prisma.stockBalance.findUnique({ where: { productId } });
    expect(after?.quantity).toBe(beforeQty + 5 - 1);
  });

  it("rejects expense when stock is insufficient", async () => {
    const doc = await prisma.document.create({
      data: {
        number: `TEST-ВТ-FAIL-${Date.now()}`,
        type: DocumentType.EXPENSE,
        createdById: userId,
        lines: { create: [{ productId, quantity: 999_999, unitPrice: 1 }] },
      },
    });

    await expect(postDocument(doc.id)).rejects.toThrow(StockError);

    const stillDraft = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(stillDraft?.status).toBe(DocumentStatus.DRAFT);
  });

  it("rejects posting an already posted document", async () => {
    const doc = await prisma.document.create({
      data: {
        number: `TEST-ПН-DUP-${Date.now()}`,
        type: DocumentType.RECEIPT,
        createdById: userId,
        lines: { create: [{ productId, quantity: 1, unitPrice: 50 }] },
      },
    });

    await postDocument(doc.id);
    await expect(postDocument(doc.id)).rejects.toThrow(/уже проведено/);
  });

  it("rejects posting a document without lines", async () => {
    const doc = await prisma.document.create({
      data: {
        number: `TEST-EMPTY-${Date.now()}`,
        type: DocumentType.RECEIPT,
        createdById: userId,
      },
    });

    await expect(postDocument(doc.id)).rejects.toThrow(/хоча б один рядок/);
  });

  it("rejects inventory when trackSerial quantity mismatches IMEI count", async () => {
    const { category, brand } = await requireSeedData();
    const phone = await prisma.product.create({
      data: {
        sku: `TEST-INV-IMEI-${Date.now()}`,
        name: "Test Phone Inventory",
        categoryId: category.id,
        brandId: brand.id,
        purchasePrice: 1000,
        salePrice: 1200,
        trackSerial: true,
        active: true,
      },
    });

    await prisma.stockBalance.create({
      data: { productId: phone.id, quantity: 2 },
    });
    await prisma.productSerial.createMany({
      data: [
        { productId: phone.id, imei: `35209900${Date.now()}1`, status: "IN_STOCK" },
        { productId: phone.id, imei: `35209900${Date.now()}2`, status: "IN_STOCK" },
      ],
    });

    const doc = await prisma.document.create({
      data: {
        number: `TEST-ІН-IMEI-${Date.now()}`,
        type: DocumentType.INVENTORY,
        createdById: userId,
        lines: { create: [{ productId: phone.id, quantity: 3, unitPrice: 0 }] },
      },
    });

    await expect(postDocument(doc.id)).rejects.toThrow(/IMEI на складі/);
  });
});
