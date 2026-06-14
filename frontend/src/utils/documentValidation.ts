import type { DocumentType } from "../types";

export interface DocumentLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface DocumentFormInput {
  type: DocumentType;
  supplierId?: string;
  buyerName?: string;
  buyerPhone?: string;
  lines: DocumentLineInput[];
}

export type DocumentFieldErrors = {
  supplierId?: string;
  buyerName?: string;
  buyerPhone?: string;
  lines?: string;
  lineItems?: Array<{
    productId?: string;
    quantity?: string;
    unitPrice?: string;
  }>;
};

export type DocumentValidationResult =
  | { ok: true }
  | { ok: false; message: string; fields: DocumentFieldErrors };

function validateLines(
  type: DocumentType,
  lines: DocumentLineInput[],
): Pick<DocumentValidationResult & { ok: false }, "message" | "fields"> | null {
  const validLines = lines.filter((line) => line.productId);
  if (validLines.length === 0) {
    return {
      message: "Додайте хоча б один рядок із товаром",
      fields: { lines: "Додайте хоча б один рядок із товаром" },
    };
  }

  const lineItems = lines.map((line) => {
    const item: NonNullable<DocumentFieldErrors["lineItems"]>[number] = {};
    if (!line.productId) {
      item.productId = "Оберіть товар";
    }
    if (type === "INVENTORY") {
      if (!Number.isInteger(line.quantity) || line.quantity < 0) {
        item.quantity = "Кількість не може бути від'ємною";
      }
    } else {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        item.quantity = "Кількість має бути більше 0";
      }
      if (line.unitPrice <= 0) {
        item.unitPrice = "Вкажіть ціну більше 0";
      }
    }
    return item;
  });

  const hasLineErrors = lineItems.some(
    (item) => item.productId || item.quantity || item.unitPrice,
  );
  if (hasLineErrors) {
    return {
      message: "Перевірте рядки документа",
      fields: { lines: "Перевірте рядки документа", lineItems },
    };
  }

  return null;
}

export function validateDocumentForm(input: DocumentFormInput): DocumentValidationResult {
  const supplierId = input.supplierId?.trim() ?? "";
  const buyerName = input.buyerName?.trim() ?? "";
  const buyerPhone = input.buyerPhone?.trim() ?? "";

  const lineError = validateLines(input.type, input.lines);
  if (lineError) {
    return { ok: false, ...lineError };
  }

  switch (input.type) {
    case "RECEIPT":
      if (!supplierId) {
        return {
          ok: false,
          message: "Оберіть постачальника",
          fields: { supplierId: "Оберіть постачальника" },
        };
      }
      break;
    case "EXPENSE":
      if (!buyerName) {
        return {
          ok: false,
          message: "Вкажіть ПІБ покупця",
          fields: { buyerName: "Вкажіть ПІБ покупця" },
        };
      }
      break;
    case "RESERVATION":
      if (!buyerName) {
        return {
          ok: false,
          message: "Вкажіть ПІБ покупця",
          fields: { buyerName: "Вкажіть ПІБ покупця" },
        };
      }
      if (buyerPhone.length < 3) {
        return {
          ok: false,
          message: "Вкажіть телефон покупця",
          fields: { buyerPhone: "Вкажіть телефон покупця" },
        };
      }
      break;
    default:
      break;
  }

  return { ok: true };
}
