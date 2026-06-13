import { Router } from "express";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { getLowStockProducts } from "../services/stock.service.js";
import { getNotifications } from "../services/notifications.service.js";

const router = Router();

router.use(authenticate);

router.get("/summary", requireRoles("DIRECTOR", "ADMIN", "MANAGER"), async (_req, res) => {
  const [productCount, totalStock, lowStock, recentDocuments] =
    await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.stockBalance.aggregate({ _sum: { quantity: true } }),
      getLowStockProducts(),
      prisma.document.findMany({
        where: { status: DocumentStatus.POSTED },
        orderBy: { postedAt: "desc" },
        take: 8,
        include: {
          createdBy: { select: { fullName: true } },
          _count: { select: { lines: true } },
        },
      }),
    ]);

  const postedThisMonth = await prisma.document.count({
    where: {
      status: DocumentStatus.POSTED,
      postedAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  const expensesThisMonth = await prisma.document.count({
    where: {
      type: DocumentType.EXPENSE,
      status: DocumentStatus.POSTED,
      postedAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  res.json({
    productCount,
    totalUnits: totalStock._sum.quantity ?? 0,
    lowStockCount: lowStock.length,
    lowStock: lowStock.slice(0, 10),
    postedDocumentsThisMonth: postedThisMonth,
    salesThisMonth: expensesThisMonth,
    recentDocuments,
  });
});

router.get("/manager", requireRoles("MANAGER", "ADMIN"), async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const lowStock = await getLowStockProducts();

  const [draftCount, drafts, todayPosted, reservationList] = await Promise.all([
    prisma.document.count({ where: { status: DocumentStatus.DRAFT } }),
    prisma.document.findMany({
      where: { status: DocumentStatus.DRAFT },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { lines: true } },
      },
    }),
    prisma.document.findMany({
      where: {
        status: DocumentStatus.POSTED,
        postedAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { postedAt: "desc" },
      take: 10,
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.document.findMany({
      where: { type: DocumentType.RESERVATION, status: DocumentStatus.POSTED },
      orderBy: { postedAt: "desc" },
      take: 10,
      select: {
        id: true,
        number: true,
        buyerName: true,
        buyerPhone: true,
        postedAt: true,
      },
    }),
  ]);

  res.json({
    draftCount,
    lowStockCount: lowStock.length,
    lowStock: lowStock.slice(0, 5),
    drafts,
    todayPosted,
    activeReservations: reservationList.length,
    activeReservationList: reservationList,
  });
});

router.get("/admin", requireRoles("ADMIN"), async (_req, res) => {
  const lowStock = await getLowStockProducts();

  const [
    activeProducts,
    inactiveProducts,
    userCount,
    categoryCount,
    brandCount,
    supplierCount,
    recentProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: false } }),
    prisma.user.count({ where: { active: true } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.supplier.count(),
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        sku: true,
        name: true,
        active: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  res.json({
    activeProducts,
    inactiveProducts,
    userCount,
    categoryCount,
    brandCount,
    supplierCount,
    lowStockCount: lowStock.length,
    lowStock: lowStock.slice(0, 8),
    recentProducts,
  });
});

router.get("/notifications", requireRoles("MANAGER", "ADMIN", "DIRECTOR"), async (_req, res) => {
  res.json(await getNotifications());
});

export default router;
