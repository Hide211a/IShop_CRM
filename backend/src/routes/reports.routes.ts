import { Router } from "express";
import { DocumentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { getLowStockProducts } from "../services/stock.service.js";
import {
  getAbcAnalysis,
  getMarginSummary,
  getPeriodComparison,
  getSalesChart,
  getTopProducts,
  parseDateRange,
} from "../services/reports.service.js";

const router = Router();
router.use(authenticate, requireRoles("DIRECTOR", "ADMIN"));

router.get("/movements", async (req, res) => {
  const { dateFrom, dateTo } = parseDateRange(
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );

  const movements = await prisma.stockMovement.findMany({
    where: {
      document: {
        date: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      product: { select: { sku: true, name: true } },
      document: { select: { number: true, type: true, buyerName: true, date: true, postedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ from: dateFrom, to: dateTo, items: movements });
});

router.get("/stock", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, brand: true, stockBalance: true },
    orderBy: { name: "asc" },
  });
  res.json(
    products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      brand: p.brand.name,
      quantity: p.stockBalance?.quantity ?? 0,
      minStock: p.minStock,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
    })),
  );
});

router.get("/low-stock", async (_req, res) => {
  res.json(await getLowStockProducts());
});

router.get("/sales-summary", async (req, res) => {
  const { dateFrom, dateTo } = parseDateRange(
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );

  const docs = await prisma.document.findMany({
    where: {
      type: "EXPENSE",
      status: DocumentStatus.POSTED,
      postedAt: { gte: dateFrom, lte: dateTo },
    },
    include: { lines: true },
  });

  const totalAmount = docs.reduce(
    (sum, d) =>
      sum + d.lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0),
    0,
  );

  res.json({
    from: dateFrom,
    to: dateTo,
    salesCount: docs.length,
    totalAmount,
    documents: docs.map((d) => ({
      number: d.number,
      buyerName: d.buyerName,
      postedAt: d.postedAt,
      lineCount: d.lines.length,
      total: d.lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0),
    })),
  });
});

router.get("/sales-chart", async (req, res) => {
  const { dateFrom, dateTo } = parseDateRange(
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );
  const groupBy = req.query.groupBy === "week" ? "week" : "day";
  const points = await getSalesChart(dateFrom, dateTo, groupBy);
  res.json({ from: dateFrom, to: dateTo, groupBy, points });
});

router.get("/top-products", async (req, res) => {
  const { dateFrom, dateTo } = parseDateRange(
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const items = await getTopProducts(dateFrom, dateTo, limit);
  res.json({ from: dateFrom, to: dateTo, items });
});

router.get("/margin", async (req, res) => {
  const { dateFrom, dateTo } = parseDateRange(
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );
  res.json({ from: dateFrom, to: dateTo, ...(await getMarginSummary(dateFrom, dateTo)) });
});

router.get("/abc-analysis", async (_req, res) => {
  res.json(await getAbcAnalysis());
});

router.get("/period-comparison", async (_req, res) => {
  res.json(await getPeriodComparison());
});

export default router;
