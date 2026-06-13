import {
  DocumentStatus,
  DocumentType,
  Prisma,
  SerialStatus,
  type Document,
  type DocumentLine,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

export type LineSerialPost = {
  lineId: string;
  imeis?: string[];
  serialIds?: string[];
};

type DocumentWithLines = Document & { lines: DocumentLine[] };

export function quantityDelta(type: DocumentType, quantity: number): number {
  switch (type) {
    case DocumentType.RECEIPT:
      return quantity;
    case DocumentType.EXPENSE:
    case DocumentType.RESERVATION:
      return -quantity;
    case DocumentType.INVENTORY:
      return quantity;
    default:
      return 0;
  }
}

export async function postDocument(
  documentId: string,
  lineSerials: LineSerialPost[] = [],
): Promise<Document> {
  return prisma.$transaction(async (tx) => {
    const document = await tx.document.findUnique({
      where: { id: documentId },
      include: { lines: { include: { product: true } } },
    });

    if (!document) throw new StockError("Документ не знайдено");
    if (document.status === DocumentStatus.POSTED) {
      throw new StockError("Документ уже проведено");
    }
    if (document.status === DocumentStatus.CANCELLED) {
      throw new StockError("Скасований документ не можна провести");
    }
    if (document.lines.length === 0) {
      throw new StockError("Додайте хоча б один рядок до документа");
    }

    const serialMap = new Map(lineSerials.map((s) => [s.lineId, s]));

    if (document.type === DocumentType.INVENTORY) {
      await postInventoryDocument(
        tx,
        document as DocumentWithLines & {
          lines: (DocumentLine & {
            product: { trackSerial: boolean; name: string };
          })[];
        },
      );
    } else {
      await postMovementDocument(tx, document, serialMap);
    }

    return tx.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.POSTED, postedAt: new Date() },
    });
  });
}

async function postMovementDocument(
  tx: Prisma.TransactionClient,
  document: DocumentWithLines & {
    lines: (DocumentLine & { product: { id: string; name: string; trackSerial: boolean } })[];
  },
  serialMap: Map<string, LineSerialPost>,
): Promise<void> {
  for (const line of document.lines) {
    const balance = await tx.stockBalance.findUnique({
      where: { productId: line.productId },
    });
    const currentQty = balance?.quantity ?? 0;
    const delta = quantityDelta(document.type, line.quantity);

    const newQty = currentQty + delta;
    if (newQty < 0) {
      throw new StockError(
        `Недостатньо залишку для «${line.product.name}» (доступно: ${currentQty})`,
      );
    }

    await upsertBalance(tx, line.productId, newQty);
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        documentId: document.id,
        documentType: document.type,
        quantityChange: delta,
        balanceAfter: newQty,
      },
    });

    if (line.product.trackSerial) {
      await handleSerials(tx, document, line, serialMap.get(line.id));
    }
  }
}

async function handleSerials(
  tx: Prisma.TransactionClient,
  document: Document,
  line: DocumentLine & { product: { id: string; name: string } },
  serialInput?: LineSerialPost,
): Promise<void> {
  if (document.type === DocumentType.RECEIPT) {
    const imeis = serialInput?.imeis ?? [];
    if (imeis.length !== line.quantity) {
      throw new StockError(
        `Для «${line.product.name}» вкажіть ${line.quantity} IMEI (вказано ${imeis.length})`,
      );
    }
    for (const imei of imeis) {
      await tx.productSerial.create({
        data: {
          productId: line.productId,
          imei: imei.trim(),
          status: SerialStatus.IN_STOCK,
          documentId: document.id,
        },
      });
    }
    return;
  }

  if (
    document.type === DocumentType.EXPENSE ||
    document.type === DocumentType.RESERVATION
  ) {
    const serialIds = serialInput?.serialIds ?? [];
    if (serialIds.length !== line.quantity) {
      throw new StockError(
        `Для «${line.product.name}» оберіть ${line.quantity} IMEI зі складу`,
      );
    }
    const targetStatus =
      document.type === DocumentType.RESERVATION
        ? SerialStatus.RESERVED
        : SerialStatus.SOLD;

    for (const serialId of serialIds) {
      const serial = await tx.productSerial.findUnique({ where: { id: serialId } });
      if (!serial || serial.productId !== line.productId) {
        throw new StockError(`IMEI не знайдено для товару «${line.product.name}»`);
      }
      if (serial.status !== SerialStatus.IN_STOCK) {
        throw new StockError(`IMEI ${serial.imei} недоступний (статус: ${serial.status})`);
      }
      await tx.productSerial.update({
        where: { id: serialId },
        data: { status: targetStatus, documentId: document.id },
      });
    }
  }
}

async function postInventoryDocument(
  tx: Prisma.TransactionClient,
  document: DocumentWithLines & {
    lines: (DocumentLine & { product: { trackSerial: boolean; name: string } })[];
  },
): Promise<void> {
  for (const line of document.lines) {
    if (line.product.trackSerial) {
      const serialCount = await tx.productSerial.count({
        where: { productId: line.productId, status: SerialStatus.IN_STOCK },
      });
      if (line.quantity !== serialCount) {
        throw new StockError(
          `Для «${line.product.name}» фактична кількість (${line.quantity}) має збігатися з IMEI на складі (${serialCount})`,
        );
      }
    }

    const balance = await tx.stockBalance.findUnique({
      where: { productId: line.productId },
    });
    const currentQty = balance?.quantity ?? 0;
    const actualQty = line.quantity;
    const delta = actualQty - currentQty;

    await upsertBalance(tx, line.productId, actualQty);
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        documentId: document.id,
        documentType: document.type,
        quantityChange: delta,
        balanceAfter: actualQty,
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

export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      stockBalance: true,
      category: true,
      brand: true,
    },
  });

  return products
    .map((p) => ({
      ...p,
      quantity: p.stockBalance?.quantity ?? 0,
    }))
    .filter((p) => p.quantity <= p.minStock);
}
