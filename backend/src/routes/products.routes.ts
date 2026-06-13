import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { routeParam } from "../utils/routeParam.js";
import { getProductChangelog, logProductChange } from "../services/productAudit.service.js";

const router = Router();

router.use(authenticate);

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string(),
  brandId: z.string(),
  purchasePrice: z.number().positive(),
  salePrice: z.number().positive(),
  minStock: z.number().int().min(0).default(0),
  trackSerial: z.boolean().default(false),
  active: z.boolean().default(true),
});

router.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId =
    typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const activeOnly = req.query.active !== "all";
  const trackSerialOnly = req.query.trackSerial === "true";

  const products = await prisma.product.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(trackSerialOnly ? { trackSerial: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      brand: true,
      stockBalance: true,
    },
    orderBy: { name: "asc" },
  });

  res.json(products);
});

router.get("/changelog", requireRoles("ADMIN"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  res.json(await getProductChangelog(limit));
});

const bulkMinStockSchema = z.object({
  categoryId: z.string(),
  minStock: z.number().int().min(0),
});

router.put("/bulk-min-stock", requireRoles("ADMIN"), async (req, res) => {
  const parsed = bulkMinStockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }

  const { categoryId, minStock } = parsed.data;
  const products = await prisma.product.findMany({
    where: { categoryId, active: true },
    select: { id: true, name: true, sku: true, minStock: true },
  });

  if (products.length === 0) {
    res.status(404).json({ message: "У категорії немає активних товарів" });
    return;
  }

  await prisma.product.updateMany({
    where: { categoryId, active: true },
    data: { minStock },
  });

  for (const p of products) {
    await logProductChange(
      p.id,
      req.user!.id,
      "BULK_MIN_STOCK",
      `Мін. залишок: ${p.minStock} → ${minStock}`,
    );
  }

  res.json({ updated: products.length, minStock });
});

const importRowSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryName: z.string().min(1),
  brandName: z.string().min(1),
  purchasePrice: z.number().positive(),
  salePrice: z.number().positive(),
  minStock: z.number().int().min(0).default(0),
  trackSerial: z.boolean().default(false),
});

router.post("/import", requireRoles("ADMIN"), async (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ message: "Передайте масив rows з товарами" });
    return;
  }

  const [categories, brands] = await Promise.all([
    prisma.category.findMany(),
    prisma.brand.findMany(),
  ]);
  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const brandMap = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = importRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push(`Рядок ${i + 1}: невірні дані`);
      skipped++;
      continue;
    }

    const row = parsed.data;
    const categoryId = catMap.get(row.categoryName.toLowerCase());
    const brandId = brandMap.get(row.brandName.toLowerCase());
    if (!categoryId || !brandId) {
      errors.push(`Рядок ${i + 1}: категорія або бренд не знайдені`);
      skipped++;
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const product = await prisma.product.create({
        data: {
          sku: row.sku,
          name: row.name,
          categoryId,
          brandId,
          purchasePrice: row.purchasePrice,
          salePrice: row.salePrice,
          minStock: row.minStock,
          trackSerial: row.trackSerial,
        },
      });
      await logProductChange(
        product.id,
        req.user!.id,
        "IMPORT",
        `Імпорт: ${row.sku} — ${row.name}`,
      );
      created++;
    } catch {
      errors.push(`Рядок ${i + 1}: не вдалося створити ${row.sku}`);
      skipped++;
    }
  }

  res.json({ created, skipped, errors });
});

router.get("/:id/detail", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: routeParam(req.params.id) },
    include: {
      category: true,
      brand: true,
      stockBalance: true,
    },
  });
  if (!product) {
    res.status(404).json({ message: "Товар не знайдено" });
    return;
  }

  const [movements, serials] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        document: { select: { number: true, type: true, buyerName: true } },
      },
    }),
    prisma.productSerial.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  res.json({
    product,
    quantity: product.stockBalance?.quantity ?? 0,
    movements,
    serials,
  });
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: routeParam(req.params.id) },
    include: { category: true, brand: true, stockBalance: true },
  });
  if (!product) {
    res.status(404).json({ message: "Товар не знайдено" });
    return;
  }
  res.json(product);
});

router.post("/", requireRoles("ADMIN"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані", errors: parsed.error.flatten() });
    return;
  }

  try {
    const product = await prisma.product.create({
      data: parsed.data,
      include: { category: true, brand: true, stockBalance: true },
    });
    await logProductChange(
      product.id,
      req.user!.id,
      "CREATE",
      `Створено: ${product.sku} — ${product.name}`,
    );
    res.status(201).json(product);
  } catch {
    res.status(409).json({ message: "Товар з таким SKU вже існує" });
  }
});

router.put("/:id", requireRoles("ADMIN"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }

  const existing = await prisma.product.findUnique({
    where: { id: routeParam(req.params.id) },
    include: { _count: { select: { serials: true } } },
  });
  if (!existing) {
    res.status(404).json({ message: "Товар не знайдено" });
    return;
  }

  if (existing.trackSerial && !parsed.data.trackSerial && existing._count.serials > 0) {
    res.status(400).json({
      message: "Неможливо вимкнути облік IMEI: для товару вже є серійні номери",
    });
    return;
  }

  try {
    const changes: string[] = [];
    if (existing.sku !== parsed.data.sku) changes.push(`SKU: ${existing.sku} → ${parsed.data.sku}`);
    if (existing.name !== parsed.data.name) changes.push(`назва: ${existing.name} → ${parsed.data.name}`);
    if (Number(existing.purchasePrice) !== parsed.data.purchasePrice) {
      changes.push(`закупівля: ${existing.purchasePrice} → ${parsed.data.purchasePrice}`);
    }
    if (Number(existing.salePrice) !== parsed.data.salePrice) {
      changes.push(`продаж: ${existing.salePrice} → ${parsed.data.salePrice}`);
    }
    if (existing.minStock !== parsed.data.minStock) {
      changes.push(`мін.залишок: ${existing.minStock} → ${parsed.data.minStock}`);
    }

    const product = await prisma.product.update({
      where: { id: routeParam(req.params.id) },
      data: parsed.data,
      include: { category: true, brand: true, stockBalance: true },
    });

    if (changes.length > 0) {
      await logProductChange(
        product.id,
        req.user!.id,
        "UPDATE",
        changes.join("; "),
      );
    }

    res.json(product);
  } catch {
    res.status(404).json({ message: "Товар не знайдено" });
  }
});

router.post("/:id/reactivate", requireRoles("ADMIN"), async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: routeParam(req.params.id) },
      data: { active: true },
      include: { category: true, brand: true, stockBalance: true },
    });
    await logProductChange(product.id, req.user!.id, "REACTIVATE", `Відновлено: ${product.sku}`);
    res.json(product);
  } catch {
    res.status(404).json({ message: "Товар не знайдено" });
  }
});

router.delete("/:id", requireRoles("ADMIN"), async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: routeParam(req.params.id) },
    });
    if (!existing) {
      res.status(404).json({ message: "Товар не знайдено" });
      return;
    }
    await prisma.product.update({
      where: { id: routeParam(req.params.id) },
      data: { active: false },
    });
    await logProductChange(existing.id, req.user!.id, "DEACTIVATE", `Деактивовано: ${existing.sku}`);
    res.status(204).send();
  } catch {
    res.status(404).json({ message: "Товар не знайдено" });
  }
});

export default router;
