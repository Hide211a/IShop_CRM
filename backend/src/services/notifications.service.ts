import { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getLowStockProducts } from "./stock.service.js";

const OVERDUE_DAYS = 3;

export async function getNotifications() {
  const lowStock = await getLowStockProducts();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);
  cutoff.setHours(23, 59, 59, 999);

  const overdueReservations = await prisma.document.findMany({
    where: {
      type: DocumentType.RESERVATION,
      status: DocumentStatus.POSTED,
      postedAt: { lt: cutoff },
    },
    orderBy: { postedAt: "asc" },
    select: {
      id: true,
      number: true,
      buyerName: true,
      buyerPhone: true,
      postedAt: true,
    },
  });

  const now = Date.now();
  const overdue = overdueReservations.map((r) => ({
    ...r,
    daysOverdue: r.postedAt
      ? Math.floor((now - r.postedAt.getTime()) / 86_400_000)
      : OVERDUE_DAYS,
  }));

  const alertCount =
    (lowStock.length > 0 ? 1 : 0) + (overdue.length > 0 ? 1 : 0);

  return {
    lowStockCount: lowStock.length,
    lowStockPreview: lowStock.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      minStock: p.minStock,
    })),
    overdueReservationCount: overdue.length,
    overdueReservations: overdue,
    totalCount: alertCount,
  };
}
