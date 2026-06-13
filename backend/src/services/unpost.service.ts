import {
  DocumentStatus,
  DocumentType,
  Prisma,
  SerialStatus,
  type Document,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { StockError } from "./stock.service.js";
import { cancelReservation } from "./reservation.service.js";

export async function unpostDocument(documentId: string): Promise<Document> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { lines: { include: { product: true } } },
  });

  if (!doc) throw new StockError("Документ не знайдено");
  if (doc.status !== DocumentStatus.POSTED) {
    throw new StockError("Розпровести можна лише проведений документ");
  }

  if (doc.type === DocumentType.RESERVATION) {
    return cancelReservation(documentId);
  }

  return prisma.$transaction(async (tx) => {
    const movements = await tx.stockMovement.findMany({
      where: { documentId },
    });

    if (movements.length === 0) {
      throw new StockError("Немає рухів для розпроведення");
    }

    const isReserveCompletionSale =
      doc.type === DocumentType.EXPENSE &&
      movements.every((m) => m.quantityChange === 0);

    if (doc.type === DocumentType.RECEIPT) {
      await unpostReceipt(tx, doc);
    } else if (doc.type === DocumentType.EXPENSE) {
      await unpostExpense(tx, doc, isReserveCompletionSale);
    } else if (doc.type === DocumentType.INVENTORY) {
      await unpostInventory(tx, doc, movements);
    } else {
      throw new StockError("Цей тип документа не підтримує розпроведення");
    }

    return tx.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.CANCELLED,
        notes: [doc.notes, "Розпроведено — операцію скасовано"]
          .filter(Boolean)
          .join(". "),
      },
    });
  });
}

type DocWithLines = {
  id: string;
  lines: Array<{
    productId: string;
    quantity: number;
    product: { name: string; trackSerial: boolean };
  }>;
};

async function unpostReceipt(
  tx: Prisma.TransactionClient,
  doc: DocWithLines,
): Promise<void> {
  for (const line of doc.lines) {
    if (line.product.trackSerial) {
      const serials = await tx.productSerial.findMany({
        where: { documentId: doc.id, productId: line.productId },
      });

      if (serials.length < line.quantity) {
        throw new StockError(
          `Неможливо розпровести «${line.product.name}»: частину IMEI вже використано в інших операціях`,
        );
      }

      const bad = serials.find((s) => s.status !== SerialStatus.IN_STOCK);
      if (bad) {
        throw new StockError(
          `IMEI ${bad.imei} уже не на складі (статус: ${bad.status}). Розпроведення неможливе`,
        );
      }

      await tx.productSerial.deleteMany({
        where: { documentId: doc.id, productId: line.productId },
      });
    }

    const balance = await tx.stockBalance.findUnique({
      where: { productId: line.productId },
    });
    const currentQty = balance?.quantity ?? 0;
    const newQty = currentQty - line.quantity;

    if (newQty < 0) {
      throw new StockError(
        `Недостатньо залишку для скасування надходження «${line.product.name}»`,
      );
    }

    await upsertBalance(tx, line.productId, newQty);
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        documentId: doc.id,
        documentType: DocumentType.RECEIPT,
        quantityChange: -line.quantity,
        balanceAfter: newQty,
      },
    });
  }
}

async function unpostExpense(
  tx: Prisma.TransactionClient,
  doc: DocWithLines,
  isReserveCompletionSale: boolean,
): Promise<void> {
  for (const line of doc.lines) {
    if (line.product.trackSerial) {
      const serials = await tx.productSerial.findMany({
        where: {
          documentId: doc.id,
          productId: line.productId,
          status: SerialStatus.SOLD,
        },
      });

      if (serials.length < line.quantity) {
        throw new StockError(
          `Неможливо розпровести «${line.product.name}»: не всі IMEI у статусі «Продано» на цьому документі`,
        );
      }

      await tx.productSerial.updateMany({
        where: {
          documentId: doc.id,
          productId: line.productId,
          status: SerialStatus.SOLD,
        },
        data: { status: SerialStatus.IN_STOCK },
      });
    }

    if (isReserveCompletionSale) {
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          documentId: doc.id,
          documentType: DocumentType.EXPENSE,
          quantityChange: 0,
          balanceAfter:
            (await tx.stockBalance.findUnique({ where: { productId: line.productId } }))
              ?.quantity ?? 0,
        },
      });
      continue;
    }

    const balance = await tx.stockBalance.findUnique({
      where: { productId: line.productId },
    });
    const currentQty = balance?.quantity ?? 0;
    const newQty = currentQty + line.quantity;

    await upsertBalance(tx, line.productId, newQty);
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        documentId: doc.id,
        documentType: DocumentType.EXPENSE,
        quantityChange: line.quantity,
        balanceAfter: newQty,
      },
    });
  }
}

async function unpostInventory(
  tx: Prisma.TransactionClient,
  doc: DocWithLines,
  movements: Array<{ productId: string; quantityChange: number }>,
): Promise<void> {
  for (const line of doc.lines) {
    const movement = movements.find((m) => m.productId === line.productId);
    if (!movement) continue;

    const balance = await tx.stockBalance.findUnique({
      where: { productId: line.productId },
    });
    const currentQty = balance?.quantity ?? 0;
    const newQty = currentQty - movement.quantityChange;

    if (newQty < 0) {
      throw new StockError(
        `Неможливо розпровести інвентаризацію для «${line.product.name}»: недостатньо залишку`,
      );
    }

    await upsertBalance(tx, line.productId, newQty);
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        documentId: doc.id,
        documentType: DocumentType.INVENTORY,
        quantityChange: -movement.quantityChange,
        balanceAfter: newQty,
      },
    });
  }
}

async function upsertBalance(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
): Promise<void> {
  await tx.stockBalance.upsert({
    where: { productId },
    create: { productId, quantity },
    update: { quantity },
  });
}
