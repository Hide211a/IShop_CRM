import { Router } from "express";
import { SerialStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { routeParam } from "../utils/routeParam.js";

const router = Router();
router.use(authenticate);

router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 3) {
    res.status(400).json({ message: "Введіть мінімум 3 символи IMEI" });
    return;
  }
  const serials = await prisma.productSerial.findMany({
    where: { imei: { contains: q } },
    include: {
      product: { select: { sku: true, name: true } },
    },
    take: 20,
  });
  res.json(serials);
});

router.get("/product/:productId", async (req, res) => {
  const serials = await prisma.productSerial.findMany({
    where: { productId: routeParam(req.params.productId) },
    orderBy: { createdAt: "desc" },
  });
  res.json(serials);
});

router.post(
  "/product/:productId",
  requireRoles("ADMIN", "MANAGER"),
  async (req, res) => {
    const schema = z.object({ imei: z.string().min(10).max(20) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Невірний IMEI" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: routeParam(req.params.productId) },
    });
    if (!product?.trackSerial) {
      res.status(400).json({ message: "Товар не веде облік по IMEI" });
      return;
    }

    try {
      const serial = await prisma.$transaction(async (tx) => {
        const created = await tx.productSerial.create({
          data: {
            productId: product.id,
            imei: parsed.data.imei.trim(),
            status: SerialStatus.IN_STOCK,
          },
        });
        const serialCount = await tx.productSerial.count({
          where: { productId: product.id, status: SerialStatus.IN_STOCK },
        });
        await tx.stockBalance.upsert({
          where: { productId: product.id },
          create: { productId: product.id, quantity: serialCount },
          update: { quantity: serialCount },
        });
        return created;
      });
      res.status(201).json(serial);
    } catch {
      res.status(409).json({ message: "IMEI вже існує в системі" });
    }
  },
);

router.delete(
  "/:id",
  requireRoles("ADMIN", "MANAGER"),
  async (req, res) => {
    const serial = await prisma.productSerial.findUnique({
      where: { id: routeParam(req.params.id) },
    });
    if (!serial) {
      res.status(404).json({ message: "IMEI не знайдено" });
      return;
    }
    if (serial.status !== SerialStatus.IN_STOCK) {
      res.status(400).json({ message: "Можна видалити лише IMEI на складі" });
      return;
    }
    const balance = await prisma.stockBalance.findUnique({
      where: { productId: serial.productId },
    });
    if ((balance?.quantity ?? 0) <= 0) {
      res.status(400).json({ message: "Залишок товару вже нульовий" });
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.productSerial.delete({ where: { id: routeParam(req.params.id) } });
      const serialCount = await tx.productSerial.count({
        where: { productId: serial.productId, status: SerialStatus.IN_STOCK },
      });
      await tx.stockBalance.upsert({
        where: { productId: serial.productId },
        create: { productId: serial.productId, quantity: serialCount },
        update: { quantity: serialCount },
      });
    });
    res.status(204).send();
  },
);

export default router;
