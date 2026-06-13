import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { routeParam } from "../utils/routeParam.js";

const router = Router();
router.use(authenticate);

const adminOnly = requireRoles("ADMIN");

// ——— Categories ———
router.get("/categories", async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
});

router.post("/categories", adminOnly, async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }
  try {
    res.status(201).json(await prisma.category.create({ data: parsed.data }));
  } catch {
    res.status(409).json({ message: "Категорія вже існує" });
  }
});

router.put("/categories/:id", adminOnly, async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }
  try {
    res.json(await prisma.category.update({ where: { id: routeParam(req.params.id) }, data: parsed.data }));
  } catch {
    res.status(404).json({ message: "Категорія не знайдена" });
  }
});

router.delete("/categories/:id", adminOnly, async (req, res) => {
  const linked = await prisma.product.count({ where: { categoryId: routeParam(req.params.id) } });
  if (linked > 0) {
    res.status(400).json({
      message: `Неможливо видалити: до категорії прив’язано ${linked} товар(ів)`,
    });
    return;
  }
  try {
    await prisma.category.delete({ where: { id: routeParam(req.params.id) } });
    res.status(204).send();
  } catch {
    res.status(404).json({ message: "Категорія не знайдена" });
  }
});

// ——— Brands ———
router.get("/brands", async (_req, res) => {
  res.json(await prisma.brand.findMany({ orderBy: { name: "asc" } }));
});

router.post("/brands", adminOnly, async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }
  try {
    res.status(201).json(await prisma.brand.create({ data: parsed.data }));
  } catch {
    res.status(409).json({ message: "Бренд вже існує" });
  }
});

router.put("/brands/:id", adminOnly, async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }
  try {
    res.json(await prisma.brand.update({ where: { id: routeParam(req.params.id) }, data: parsed.data }));
  } catch {
    res.status(404).json({ message: "Бренд не знайдений" });
  }
});

router.delete("/brands/:id", adminOnly, async (req, res) => {
  const linked = await prisma.product.count({ where: { brandId: routeParam(req.params.id) } });
  if (linked > 0) {
    res.status(400).json({
      message: `Неможливо видалити: до бренду прив’язано ${linked} товар(ів)`,
    });
    return;
  }
  try {
    await prisma.brand.delete({ where: { id: routeParam(req.params.id) } });
    res.status(204).send();
  } catch {
    res.status(404).json({ message: "Бренд не знайдений" });
  }
});

// ——— Suppliers ———
router.get("/suppliers", async (_req, res) => {
  res.json(await prisma.supplier.findMany({ orderBy: { name: "asc" } }));
});

const supplierSchema = z.object({
  name: z.string().min(1),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

router.post("/suppliers", adminOnly, async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }
  const { contactEmail, ...rest } = parsed.data;
  res.status(201).json(
    await prisma.supplier.create({ data: { ...rest, contactEmail: contactEmail || null } }),
  );
});

router.put("/suppliers/:id", adminOnly, async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }
  const { contactEmail, ...rest } = parsed.data;
  try {
    res.json(
      await prisma.supplier.update({
        where: { id: routeParam(req.params.id) },
        data: { ...rest, contactEmail: contactEmail || null },
      }),
    );
  } catch {
    res.status(404).json({ message: "Постачальник не знайдений" });
  }
});

router.delete("/suppliers/:id", adminOnly, async (req, res) => {
  const docLinks = await prisma.document.count({
    where: { supplierId: routeParam(req.params.id) },
  });
  if (docLinks > 0) {
    res.status(400).json({
      message: `Неможливо видалити: постачальник у ${docLinks} документ(ах) надходження`,
    });
    return;
  }
  try {
    await prisma.supplier.delete({ where: { id: routeParam(req.params.id) } });
    res.status(204).send();
  } catch {
    res.status(404).json({ message: "Постачальник не знайдений" });
  }
});

export default router;
