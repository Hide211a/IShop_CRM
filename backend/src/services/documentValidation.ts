import { DocumentType } from "@prisma/client";
import { z } from "zod";

const trimmed = (min: number, message: string) => z.string().trim().min(min, message);

export const movementLineSchema = z.object({
  productId: z.string().min(1, "Оберіть товар"),
  quantity: z
    .number()
    .int("Кількість має бути цілим числом")
    .positive("Кількість має бути більше 0"),
  unitPrice: z
    .number()
    .nonnegative("Ціна не може бути від'ємною")
    .refine((value) => value > 0, "Вкажіть ціну більше 0"),
});

export const inventoryLineSchema = z.object({
  productId: z.string().min(1, "Оберіть товар"),
  quantity: z.number().int("Кількість має бути цілим числом").min(0, "Кількість не може бути від'ємною"),
  unitPrice: z.number().nonnegative().default(0),
});

const receiptFields = {
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
  supplierId: trimmed(1, "Оберіть постачальника"),
  lines: z.array(movementLineSchema).min(1, "Додайте хоча б один рядок"),
};

const expenseFields = {
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
  buyerName: trimmed(1, "Вкажіть ПІБ покупця"),
  buyerPhone: z.string().optional(),
  lines: z.array(movementLineSchema).min(1, "Додайте хоча б один рядок"),
};

const reservationFields = {
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
  buyerName: trimmed(1, "Вкажіть ПІБ покупця"),
  buyerPhone: trimmed(3, "Вкажіть телефон покупця"),
  lines: z.array(movementLineSchema).min(1, "Додайте хоча б один рядок"),
};

const inventoryFields = {
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
  lines: z.array(inventoryLineSchema).min(1, "Додайте хоча б один рядок"),
};

export const createDocumentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(DocumentType.RECEIPT), ...receiptFields }),
  z.object({ type: z.literal(DocumentType.EXPENSE), ...expenseFields }),
  z.object({ type: z.literal(DocumentType.RESERVATION), ...reservationFields }),
  z.object({ type: z.literal(DocumentType.INVENTORY), ...inventoryFields }),
]);

export const updateReceiptSchema = z.object(receiptFields);
export const updateExpenseSchema = z.object(expenseFields);
export const updateReservationSchema = z.object(reservationFields);
export const updateInventorySchema = z.object(inventoryFields);

export function parseUpdateDocumentBody(type: DocumentType, body: unknown) {
  switch (type) {
    case DocumentType.RECEIPT:
      return updateReceiptSchema.safeParse(body);
    case DocumentType.EXPENSE:
      return updateExpenseSchema.safeParse(body);
    case DocumentType.RESERVATION:
      return updateReservationSchema.safeParse(body);
    case DocumentType.INVENTORY:
      return updateInventorySchema.safeParse(body);
    default:
      return updateExpenseSchema.safeParse(body);
  }
}

type PostDocumentShape = {
  type: DocumentType;
  supplierId: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  lines: Array<{ quantity: number; unitPrice: unknown }>;
};

export function validateDocumentReadyToPost(document: PostDocumentShape): string | null {
  if (document.lines.length === 0) {
    return "Додайте хоча б один рядок до документа";
  }

  switch (document.type) {
    case DocumentType.RECEIPT:
      if (!document.supplierId?.trim()) {
        return "Оберіть постачальника перед проведенням";
      }
      break;
    case DocumentType.EXPENSE:
      if (!document.buyerName?.trim()) {
        return "Вкажіть ПІБ покупця перед проведенням";
      }
      break;
    case DocumentType.RESERVATION:
      if (!document.buyerName?.trim()) {
        return "Вкажіть ПІБ покупця перед проведенням";
      }
      if (!document.buyerPhone?.trim()) {
        return "Вкажіть телефон покупця перед проведенням";
      }
      break;
    default:
      break;
  }

  for (const line of document.lines) {
    if (document.type === DocumentType.INVENTORY) {
      if (line.quantity < 0) {
        return "Кількість у рядку інвентаризації не може бути від'ємною";
      }
      continue;
    }
    if (line.quantity <= 0) {
      return "Кількість у рядку має бути більше 0";
    }
    if (Number(line.unitPrice) <= 0) {
      return "Ціна у рядку має бути більше 0";
    }
  }

  return null;
}

export function formatZodMessage(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "Невірні дані";
}
