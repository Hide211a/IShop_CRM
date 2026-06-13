import { prisma } from "../lib/prisma.js";

export async function requireSeedData() {
  const [user, category, brand] = await Promise.all([
    prisma.user.findFirst({ where: { role: "MANAGER" } }),
    prisma.category.findFirst(),
    prisma.brand.findFirst(),
  ]);
  if (!user || !category || !brand) {
    throw new Error("Seed data required — run npm run db:setup");
  }
  return { user, category, brand };
}

/** Isolated product per test suite — avoids parallel test interference. */
export async function createIsolatedProduct(label: string) {
  const { category, brand } = await requireSeedData();
  return prisma.product.create({
    data: {
      sku: `TEST-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `Test ${label}`,
      categoryId: category.id,
      brandId: brand.id,
      purchasePrice: 100,
      salePrice: 150,
      minStock: 0,
      trackSerial: false,
      active: true,
    },
  });
}
