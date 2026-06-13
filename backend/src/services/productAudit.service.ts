import { prisma } from "../lib/prisma.js";

export async function logProductChange(
  productId: string,
  userId: string,
  action: string,
  summary: string,
) {
  await prisma.productChangeLog.create({
    data: { productId, userId, action, summary },
  });
}

export async function getProductChangelog(limit = 50) {
  return prisma.productChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      product: { select: { sku: true, name: true } },
      user: { select: { fullName: true } },
    },
  });
}
