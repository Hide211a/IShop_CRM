import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { getLowStockProducts } from "../services/stock.service.js";

const router = Router();

router.use(authenticate);

router.get("/balances", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      category: true,
      brand: true,
      stockBalance: true,
    },
    orderBy: { name: "asc" },
  });

  res.json(
    products.map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      brand: p.brand.name,
      minStock: p.minStock,
      quantity: p.stockBalance?.quantity ?? 0,
      isLow: (p.stockBalance?.quantity ?? 0) <= p.minStock,
    })),
  );
});

router.get("/low-count", requireRoles("DIRECTOR", "ADMIN", "MANAGER"), async (_req, res) => {
  const items = await getLowStockProducts();
  res.json({ count: items.length });
});

router.get("/low", requireRoles("DIRECTOR", "ADMIN", "MANAGER"), async (_req, res) => {
  const items = await getLowStockProducts();
  res.json(items);
});

router.get("/movements", requireRoles("DIRECTOR", "ADMIN", "MANAGER"), async (req, res) => {
  const productId =
    typeof req.query.productId === "string" ? req.query.productId : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const movements = await prisma.stockMovement.findMany({
    where: productId ? { productId } : undefined,
    include: {
      product: { select: { sku: true, name: true } },
      document: { select: { number: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json(movements);
});

export default router;
