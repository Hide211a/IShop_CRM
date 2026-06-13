import {
  DocumentStatus,
  DocumentType,
  Prisma,
  SerialStatus,
  type Document,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { StockError } from "./stock.service.js";

async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  type: DocumentType,
): Promise<string> {
  const prefix: Record<DocumentType, string> = {
    RECEIPT: "ПН",
    EXPENSE: "ВТ",
    INVENTORY: "ІН",
    RESERVATION: "РЗ",
  };
  const count = await tx.document.count({ where: { type } });
  const year = new Date().getFullYear();
  return `${prefix[type]}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function cancelReservation(documentId: string): Promise<Document> {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: { lines: { include: { product: true } } },
    });

    if (!doc) throw new StockError("Документ не знайдено");
    if (doc.type !== DocumentType.RESERVATION) {
      throw new StockError("Скасувати можна лише документ резерву");
    }
    if (doc.status !== DocumentStatus.POSTED) {
      throw new StockError("Скасувати можна лише проведений резерв");
    }

    for (const line of doc.lines) {
      const balance = await tx.stockBalance.findUnique({
        where: { productId: line.productId },
      });
      const currentQty = balance?.quantity ?? 0;
      const newQty = currentQty + line.quantity;

      await tx.stockBalance.upsert({
        where: { productId: line.productId },
        create: { productId: line.productId, quantity: newQty },
        update: { quantity: newQty },
      });

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          documentId: doc.id,
          documentType: DocumentType.RESERVATION,
          quantityChange: line.quantity,
          balanceAfter: newQty,
        },
      });

      if (line.product.trackSerial) {
        await tx.productSerial.updateMany({
          where: {
            documentId: doc.id,
            productId: line.productId,
            status: SerialStatus.RESERVED,
          },
          data: { status: SerialStatus.IN_STOCK },
        });
      }
    }

    return tx.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.CANCELLED,
        notes: [doc.notes, "Резерв скасовано — товар повернуто на склад"]
          .filter(Boolean)
          .join(". "),
      },
    });
  });
}

export async function completeReservationAsSale(
  documentId: string,
  createdById: string,
): Promise<{ reservation: Document; sale: Document }> {
  return prisma.$transaction(async (tx) => {
    const reserve = await tx.document.findUnique({
      where: { id: documentId },
      include: { lines: { include: { product: true } } },
    });

    if (!reserve) throw new StockError("Документ не знайдено");
    if (reserve.type !== DocumentType.RESERVATION) {
      throw new StockError("Оформити продаж можна лише з документа резерву");
    }
    if (reserve.status !== DocumentStatus.POSTED) {
      throw new StockError("Резерв має бути проведеним");
    }

    const saleNumber = await nextDocumentNumber(tx, DocumentType.EXPENSE);
    const sale = await tx.document.create({
      data: {
        number: saleNumber,
        type: DocumentType.EXPENSE,
        status: DocumentStatus.POSTED,
        date: new Date(),
        postedAt: new Date(),
        buyerName: reserve.buyerName,
        buyerPhone: reserve.buyerPhone,
        notes: `Продаж за резервом ${reserve.number}`,
        createdById,
        lines: {
          create: reserve.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        },
      },
    });

    for (const line of reserve.lines) {
      if (line.product.trackSerial) {
        await tx.productSerial.updateMany({
          where: {
            documentId: reserve.id,
            productId: line.productId,
            status: SerialStatus.RESERVED,
          },
          data: { status: SerialStatus.SOLD, documentId: sale.id },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          documentId: sale.id,
          documentType: DocumentType.EXPENSE,
          quantityChange: 0,
          balanceAfter:
            (
              await tx.stockBalance.findUnique({
                where: { productId: line.productId },
              })
            )?.quantity ?? 0,
        },
      });
    }

    const updatedReserve = await tx.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.CANCELLED,
        notes: [reserve.notes, `Завершено продажем ${saleNumber}`]
          .filter(Boolean)
          .join(". "),
      },
    });

    return { reservation: updatedReserve, sale };
  });
}
