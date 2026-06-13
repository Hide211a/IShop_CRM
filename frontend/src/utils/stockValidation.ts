import type { DocumentType } from "../types";

export function lineStockWarning(
  docType: DocumentType,
  quantity: number,
  stock: number,
): string | null {
  if (docType !== "EXPENSE" && docType !== "RESERVATION") return null;
  if (quantity > stock) {
    return `Недостатньо на складі: є ${stock}, потрібно ${quantity}`;
  }
  return null;
}

export function hasStockIssues(
  docType: DocumentType,
  lines: Array<{ productId: string; quantity: number }>,
  stockByProductId: Map<string, number>,
): boolean {
  return lines.some((line) => {
    if (!line.productId) return false;
    const stock = stockByProductId.get(line.productId) ?? 0;
    return lineStockWarning(docType, line.quantity, stock) !== null;
  });
}
