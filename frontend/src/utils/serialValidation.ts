import type { DocumentDetail } from "../types";

export function validateSerialsForPost(
  doc: DocumentDetail,
  imeiInputs: Record<string, string[]>,
  serialSelections: Record<string, string[]>,
): string | null {
  for (const line of doc.lines) {
    if (!line.product?.trackSerial) continue;

    if (doc.type === "RECEIPT") {
      const imeis = (imeiInputs[line.id] ?? []).map((s) => s.trim()).filter(Boolean);
      if (imeis.length !== line.quantity) {
        return `Для «${line.product.name}» вкажіть ${line.quantity} IMEI (вказано ${imeis.length})`;
      }
      const unique = new Set(imeis);
      if (unique.size !== imeis.length) {
        return `Для «${line.product.name}» IMEI не повинні повторюватися`;
      }
    } else if (doc.type === "EXPENSE" || doc.type === "RESERVATION") {
      const ids = serialSelections[line.id] ?? [];
      if (ids.length !== line.quantity) {
        return `Для «${line.product.name}» оберіть ${line.quantity} IMEI (обрано ${ids.length})`;
      }
    }
  }
  return null;
}
