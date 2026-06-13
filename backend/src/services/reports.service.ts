import { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function parseDateRange(from?: string, to?: string) {
  const dateFrom = from ? new Date(from) : new Date(new Date().setDate(1));
  const dateTo = to ? new Date(to) : new Date();
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

/** Середньозважена закупівельна ціна з проведених надходжень. */
async function getWeightedPurchaseCosts(): Promise<Map<string, number>> {
  const receiptLines = await prisma.documentLine.findMany({
    where: {
      document: { type: DocumentType.RECEIPT, status: DocumentStatus.POSTED },
    },
    select: { productId: true, quantity: true, unitPrice: true },
  });

  const accum = new Map<string, { cost: number; qty: number }>();
  for (const line of receiptLines) {
    const prev = accum.get(line.productId) ?? { cost: 0, qty: 0 };
    prev.cost += Number(line.unitPrice) * line.quantity;
    prev.qty += line.quantity;
    accum.set(line.productId, prev);
  }

  const costs = new Map<string, number>();
  for (const [productId, { cost, qty }] of accum) {
    if (qty > 0) costs.set(productId, cost / qty);
  }
  return costs;
}

function unitCostForProduct(
  productId: string,
  fallback: number,
  costMap: Map<string, number>,
): number {
  return costMap.get(productId) ?? fallback;
}

export async function getSalesChart(
  dateFrom: Date,
  dateTo: Date,
  groupBy: "day" | "week" = "day",
) {
  const docs = await prisma.document.findMany({
    where: {
      type: DocumentType.EXPENSE,
      status: DocumentStatus.POSTED,
      postedAt: { gte: dateFrom, lte: dateTo },
    },
    include: { lines: true },
  });

  const buckets = new Map<string, { count: number; amount: number }>();

  for (const doc of docs) {
    if (!doc.postedAt) continue;
    const d = new Date(doc.postedAt);
    let key: string;
    if (groupBy === "week") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    const amount = doc.lines.reduce(
      (s, l) => s + Number(l.unitPrice) * l.quantity,
      0,
    );
    const prev = buckets.get(key) ?? { count: 0, amount: 0 };
    buckets.set(key, { count: prev.count + 1, amount: prev.amount + amount });
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}

export async function getTopProducts(
  dateFrom: Date,
  dateTo: Date,
  limit = 10,
) {
  const costMap = await getWeightedPurchaseCosts();
  const lines = await prisma.documentLine.findMany({
    where: {
      document: {
        type: DocumentType.EXPENSE,
        status: DocumentStatus.POSTED,
        postedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      product: { select: { sku: true, name: true, purchasePrice: true } },
    },
  });

  const map = new Map<
    string,
    { sku: string; name: string; quantity: number; revenue: number; cost: number }
  >();

  for (const line of lines) {
    const key = line.productId;
    const prev = map.get(key) ?? {
      sku: line.product.sku,
      name: line.product.name,
      quantity: 0,
      revenue: 0,
      cost: 0,
    };
    const unitCost = unitCostForProduct(
      line.productId,
      Number(line.product.purchasePrice),
      costMap,
    );
    prev.quantity += line.quantity;
    prev.revenue += Number(line.unitPrice) * line.quantity;
    prev.cost += unitCost * line.quantity;
    map.set(key, prev);
  }

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({
      ...p,
      margin: p.revenue - p.cost,
    }));
}

export async function getMarginSummary(dateFrom: Date, dateTo: Date) {
  const costMap = await getWeightedPurchaseCosts();
  const lines = await prisma.documentLine.findMany({
    where: {
      document: {
        type: DocumentType.EXPENSE,
        status: DocumentStatus.POSTED,
        postedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      product: { select: { sku: true, name: true, purchasePrice: true } },
    },
  });

  const map = new Map<
    string,
    { sku: string; name: string; quantity: number; revenue: number; cost: number }
  >();

  for (const line of lines) {
    const key = line.productId;
    const prev = map.get(key) ?? {
      sku: line.product.sku,
      name: line.product.name,
      quantity: 0,
      revenue: 0,
      cost: 0,
    };
    const unitCost = unitCostForProduct(
      line.productId,
      Number(line.product.purchasePrice),
      costMap,
    );
    prev.quantity += line.quantity;
    prev.revenue += Number(line.unitPrice) * line.quantity;
    prev.cost += unitCost * line.quantity;
    map.set(key, prev);
  }

  const products = [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((p) => ({ ...p, margin: p.revenue - p.cost }));

  const revenue = products.reduce((s, p) => s + p.revenue, 0);
  const cost = products.reduce((s, p) => s + p.cost, 0);
  const margin = revenue - cost;

  return {
    revenue,
    cost,
    margin,
    marginPercent: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : 0,
    salesLines: products.reduce((s, p) => s + p.quantity, 0),
    products,
  };
}

export async function getAbcAnalysis() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { stockBalance: true, category: true },
  });

  const items = products
    .map((p) => {
      const quantity = p.stockBalance?.quantity ?? 0;
      const stockValue = quantity * Number(p.purchasePrice);
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        quantity,
        stockValue,
      };
    })
    .filter((p) => p.stockValue > 0)
    .sort((a, b) => b.stockValue - a.stockValue);

  const total = items.reduce((s, p) => s + p.stockValue, 0);
  let cumulative = 0;

  return items.map((item) => {
    cumulative += item.stockValue;
    const share = total > 0 ? (item.stockValue / total) * 100 : 0;
    const cumulativeShare = total > 0 ? (cumulative / total) * 100 : 0;
    let abc: "A" | "B" | "C" = "C";
    if (cumulativeShare <= 80) abc = "A";
    else if (cumulativeShare <= 95) abc = "B";
    return { ...item, share: Math.round(share * 10) / 10, cumulativeShare: Math.round(cumulativeShare * 10) / 10, abc };
  });
}

async function summarizeSalesPeriod(dateFrom: Date, dateTo: Date) {
  const costMap = await getWeightedPurchaseCosts();
  const docs = await prisma.document.findMany({
    where: {
      type: DocumentType.EXPENSE,
      status: DocumentStatus.POSTED,
      postedAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      lines: { include: { product: { select: { purchasePrice: true } } } },
    },
  });

  let revenue = 0;
  let cost = 0;
  for (const doc of docs) {
    for (const line of doc.lines) {
      const unitCost = unitCostForProduct(
        line.productId,
        Number(line.product.purchasePrice),
        costMap,
      );
      revenue += Number(line.unitPrice) * line.quantity;
      cost += unitCost * line.quantity;
    }
  }

  return {
    salesCount: docs.length,
    revenue,
    cost,
    margin: revenue - cost,
    marginPercent: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0,
  };
}

export async function getPeriodComparison() {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  currentStart.setHours(0, 0, 0, 0);
  const currentEnd = new Date(now);
  currentEnd.setHours(23, 59, 59, 999);

  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(-1);
  const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1);
  previousStart.setHours(0, 0, 0, 0);

  const [current, previous] = await Promise.all([
    summarizeSalesPeriod(currentStart, currentEnd),
    summarizeSalesPeriod(previousStart, previousEnd),
  ]);

  const delta = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10;

  return {
    current: { from: currentStart, to: currentEnd, ...current },
    previous: { from: previousStart, to: previousEnd, ...previous },
    change: {
      salesCount: delta(current.salesCount, previous.salesCount),
      revenue: delta(current.revenue, previous.revenue),
      margin: delta(current.margin, previous.margin),
    },
  };
}
