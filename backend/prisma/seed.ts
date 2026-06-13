import {
  DocumentStatus,
  DocumentType,
  PrismaClient,
  Role,
  SerialStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SMARTPHONE_IMEIS: Record<string, string[]> = {
  "APL-IP15-128-BLK": [
    "352099001761481",
    "352099001761482",
    "352099001761483",
    "352099001761484",
    "352099001761485",
    "352099001761486",
    "352099001761487",
    "352099001761488",
    "352099001761489",
    "352099001761490",
  ],
  "SAM-S24-256": [
    "356789012345671",
    "356789012345672",
    "356789012345673",
    "356789012345674",
    "356789012345675",
  ],
  "XIA-14T-256": [
    "868123456789011",
    "868123456789012",
    "868123456789013",
    "868123456789014",
  ],
  "XIA-REDMI-13": [
    "868555000000001",
    "868555000000002",
    "868555000000003",
  ],
};

async function upsertBalance(productId: string, quantity: number) {
  await prisma.stockBalance.upsert({
    where: { productId },
    create: { productId, quantity },
    update: { quantity },
  });
}

async function addMovement(
  productId: string,
  documentId: string,
  documentType: DocumentType,
  quantityChange: number,
  balanceAfter: number,
) {
  await prisma.stockMovement.create({
    data: { productId, documentId, documentType, quantityChange, balanceAfter },
  });
}

async function main() {
  await prisma.productSerial.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.documentLine.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const year = new Date().getFullYear();
  const passwordHash = await bcrypt.hash("demo123", 10);

  const [admin, manager, director] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@ishop-rivne.ua",
        passwordHash,
        fullName: "Олена Коваленко",
        role: Role.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: "manager@ishop-rivne.ua",
        passwordHash,
        fullName: "Андрій Мельник",
        role: Role.MANAGER,
      },
    }),
    prisma.user.create({
      data: {
        email: "director@ishop-rivne.ua",
        passwordHash,
        fullName: "Ігор Петренко",
        role: Role.DIRECTOR,
      },
    }),
  ]);

  const categories = await Promise.all(
    [
      ["Смартфони", "Мобільні телефони"],
      ["Планшети", "Планшети та електронні книги"],
      ["Навушники", "TWS та накладні"],
      ["Чохли", "Захист пристроїв"],
      ["Зарядні пристрої", "Мережеві та бездротові"],
      ["Smart-годинники", "Носимі гаджети"],
      ["Аксесуари", "Кабелі, тримачі тощо"],
    ].map(([name, description]) =>
      prisma.category.create({ data: { name, description } }),
    ),
  );

  const cat = Object.fromEntries(categories.map((c) => [c.name, c]));

  const brands = await Promise.all(
    ["Apple", "Samsung", "Xiaomi", "Google", "Huawei", "Anker", "Spigen", "Baseus"].map(
      (name) => prisma.brand.create({ data: { name } }),
    ),
  );

  const brand = Object.fromEntries(brands.map((b) => [b.name, b]));

  const suppliers = await Promise.all(
    [
      {
        name: "ТОВ «МобіОпт Рівне»",
        contactPhone: "+380362123456",
        contactEmail: "sales@mobilopt.rv.ua",
        address: "м. Рівне, вул. Мирного, 12",
      },
      {
        name: "Дистриб'ютор «ГаджетПро»",
        contactPhone: "+380501112233",
        contactEmail: "info@gadgetpro.ua",
        address: "м. Львів, вул. Сихівська, 12",
      },
      {
        name: "Імпорт Техно Лайн",
        contactPhone: "+380671234567",
        contactEmail: "order@technoline.ua",
        address: "м. Одеса, вул. Дерибасівська, 5",
      },
    ].map((s) => prisma.supplier.create({ data: s })),
  );

  const mobilOpt = suppliers[0];

  const productDefs: Array<{
    sku: string;
    name: string;
    category: string;
    brand: string;
    purchase: number;
    sale: number;
    min: number;
  }> = [
    // Смартфони — орієнтир: роздріб Рівне/Україна, весна 2026; націнка ~15–20%
    { sku: "APL-IP15-128-BLK", name: "Apple iPhone 15 128GB Black", category: "Смартфони", brand: "Apple", purchase: 33200, sale: 39990, min: 3 },
    { sku: "APL-IP15-256-BLU", name: "Apple iPhone 15 256GB Blue", category: "Смартфони", brand: "Apple", purchase: 38500, sale: 45990, min: 2 },
    { sku: "APL-IP14-128", name: "Apple iPhone 14 128GB", category: "Смартфони", brand: "Apple", purchase: 27800, sale: 32990, min: 2 },
    { sku: "SAM-S24-256", name: "Samsung Galaxy S24 256GB", category: "Смартфони", brand: "Samsung", purchase: 29800, sale: 35990, min: 3 },
    { sku: "SAM-A55-128", name: "Samsung Galaxy A55 128GB", category: "Смартфони", brand: "Samsung", purchase: 12400, sale: 14990, min: 5 },
    { sku: "XIA-14T-256", name: "Xiaomi 14T 256GB", category: "Смартфони", brand: "Xiaomi", purchase: 15800, sale: 18990, min: 4 },
    { sku: "XIA-REDMI-13", name: "Xiaomi Redmi 13 128GB", category: "Смартфони", brand: "Xiaomi", purchase: 5690, sale: 6990, min: 8 },
    { sku: "GGL-PXL8-128", name: "Google Pixel 8 128GB", category: "Смартфони", brand: "Google", purchase: 23400, sale: 27990, min: 2 },
    // Планшети
    { sku: "APL-IPAD-64", name: "Apple iPad 10.9\" 64GB Wi-Fi", category: "Планшети", brand: "Apple", purchase: 15200, sale: 18490, min: 3 },
    { sku: "SAM-TAB-A9", name: "Samsung Galaxy Tab A9", category: "Планшети", brand: "Samsung", purchase: 6800, sale: 8490, min: 4 },
    { sku: "XIA-PAD-6", name: "Xiaomi Pad 6 128GB", category: "Планшети", brand: "Xiaomi", purchase: 11200, sale: 13490, min: 3 },
    // Навушники
    { sku: "APL-AIRPODS-4", name: "Apple AirPods 4", category: "Навушники", brand: "Apple", purchase: 6250, sale: 7690, min: 6 },
    { sku: "SAM-BUDS3", name: "Samsung Galaxy Buds3", category: "Навушники", brand: "Samsung", purchase: 4100, sale: 5190, min: 5 },
    { sku: "XIA-BUDS5", name: "Xiaomi Buds 5 Pro", category: "Навушники", brand: "Xiaomi", purchase: 2890, sale: 3690, min: 6 },
    // Чохли та аксесуари
    { sku: "SPI-IP15-CASE", name: "Spigen Ultra Hybrid iPhone 15", category: "Чохли", brand: "Spigen", purchase: 390, sale: 649, min: 15 },
    { sku: "SPI-S24-CASE", name: "Spigen Tough Armor Galaxy S24", category: "Чохли", brand: "Spigen", purchase: 360, sale: 599, min: 15 },
    { sku: "ANK-20W", name: "Anker PowerPort 20W USB-C", category: "Зарядні пристрої", brand: "Anker", purchase: 520, sale: 849, min: 20 },
    { sku: "ANK-MAGSAFE", name: "Anker MagGo Wireless 15W", category: "Зарядні пристрої", brand: "Anker", purchase: 1390, sale: 1990, min: 10 },
    { sku: "BAS-CABLE-2M", name: "Baseus USB-C кабель 2м 100W", category: "Аксесуари", brand: "Baseus", purchase: 210, sale: 399, min: 25 },
    { sku: "APL-20W-ADAPTER", name: "Apple USB-C 20W Adapter", category: "Зарядні пристрої", brand: "Apple", purchase: 820, sale: 1090, min: 12 },
    { sku: "SAM-45W", name: "Samsung 45W Travel Adapter", category: "Зарядні пристрої", brand: "Samsung", purchase: 1020, sale: 1390, min: 10 },
    { sku: "BAS-HUB-5IN1", name: "Baseus Hub 5-in-1 USB-C", category: "Аксесуари", brand: "Baseus", purchase: 1180, sale: 1690, min: 8 },
    // Годинники
    { sku: "APL-WATCH-S9", name: "Apple Watch Series 9 GPS 41mm", category: "Smart-годинники", brand: "Apple", purchase: 14800, sale: 17990, min: 2 },
    { sku: "SAM-WATCH-6", name: "Samsung Galaxy Watch6 40mm", category: "Smart-годинники", brand: "Samsung", purchase: 9200, sale: 10990, min: 3 },
    { sku: "HUA-FIT-SE", name: "Huawei Watch Fit SE", category: "Smart-годинники", brand: "Huawei", purchase: 2380, sale: 2990, min: 5 },
  ];

  const defBySku = Object.fromEntries(productDefs.map((p) => [p.sku, p]));

  const products = await Promise.all(
    productDefs.map((p) =>
      prisma.product.create({
        data: {
          sku: p.sku,
          name: p.name,
          categoryId: cat[p.category].id,
          brandId: brand[p.brand].id,
          purchasePrice: p.purchase,
          salePrice: p.sale,
          minStock: p.min,
          trackSerial: p.category === "Смартфони",
        },
      }),
    ),
  );

  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  const receiptQty = (sku: string, index: number, category: string) => {
    if (category === "Смартфони") return SMARTPHONE_IMEIS[sku]?.length ?? 0;
    return 10 + (index % 8);
  };

  // ——— Початкове надходження (МобіОпт Рівне) ———
  const receipt = await prisma.document.create({
    data: {
      number: `ПН-${year}-0001`,
      type: DocumentType.RECEIPT,
      status: DocumentStatus.POSTED,
      date: new Date(),
      postedAt: new Date(),
      supplierId: mobilOpt.id,
      createdById: manager.id,
      notes: "Початкове надходження на склад iShop Рівне · ТОВ «МобіОпт Рівне»",
      lines: {
        create: products.map((p, i) => ({
          productId: p.id,
          quantity: receiptQty(p.sku, i, productDefs[i].category),
          unitPrice: productDefs[i].purchase,
        })),
      },
    },
    include: { lines: { include: { product: true } } },
  });

  for (const line of receipt.lines) {
    if (line.quantity === 0) continue;

    const imeis = SMARTPHONE_IMEIS[line.product.sku];
    if (imeis) {
      for (const imei of imeis) {
        await prisma.productSerial.create({
          data: {
            productId: line.productId,
            imei,
            status: SerialStatus.IN_STOCK,
            documentId: receipt.id,
          },
        });
      }
      await upsertBalance(line.productId, imeis.length);
      await addMovement(line.productId, receipt.id, DocumentType.RECEIPT, imeis.length, imeis.length);
    } else {
      await upsertBalance(line.productId, line.quantity);
      await addMovement(line.productId, receipt.id, DocumentType.RECEIPT, line.quantity, line.quantity);
    }
  }

  // ——— Продаж iPhone (2 шт., IMEI → SOLD) ———
  const iphone = bySku["APL-IP15-128-BLK"];
  const iphoneSerials = await prisma.productSerial.findMany({
    where: { productId: iphone.id, status: SerialStatus.IN_STOCK },
    take: 2,
  });

  const expense = await prisma.document.create({
    data: {
      number: `ВТ-${year}-0001`,
      type: DocumentType.EXPENSE,
      status: DocumentStatus.POSTED,
      date: new Date(),
      postedAt: new Date(),
      createdById: manager.id,
      buyerName: "Марія Шевченко",
      buyerPhone: "+380971112233",
      notes: "Продаж у залі iShop Рівне",
      lines: {
        create: [{ productId: iphone.id, quantity: 2, unitPrice: defBySku[iphone.sku].sale }],
      },
    },
    include: { lines: true },
  });

  for (const serial of iphoneSerials) {
    await prisma.productSerial.update({
      where: { id: serial.id },
      data: { status: SerialStatus.SOLD, documentId: expense.id },
    });
  }

  const iphoneQtyAfterSale = 10 - 2;
  await upsertBalance(iphone.id, iphoneQtyAfterSale);
  await addMovement(iphone.id, expense.id, DocumentType.EXPENSE, -2, iphoneQtyAfterSale);

  // ——— Активний резерв Samsung S24 ———
  const samsung = bySku["SAM-S24-256"];
  const reserveSerial = await prisma.productSerial.findFirst({
    where: { productId: samsung.id, status: SerialStatus.IN_STOCK },
  });

  const reservation = await prisma.document.create({
    data: {
      number: `РЗ-${year}-0001`,
      type: DocumentType.RESERVATION,
      status: DocumentStatus.POSTED,
      date: new Date(),
      postedAt: new Date(),
      createdById: manager.id,
      buyerName: "Володимир Коваль",
      buyerPhone: "+380631234567",
      notes: "Резерв до суботи — забрати в магазині",
      lines: {
        create: [{ productId: samsung.id, quantity: 1, unitPrice: defBySku[samsung.sku].sale }],
      },
    },
    include: { lines: true },
  });

  if (reserveSerial) {
    await prisma.productSerial.update({
      where: { id: reserveSerial.id },
      data: { status: SerialStatus.RESERVED, documentId: reservation.id },
    });
  }

  const samsungQtyAfterReserve = 5 - 1;
  await upsertBalance(samsung.id, samsungQtyAfterReserve);
  await addMovement(samsung.id, reservation.id, DocumentType.RESERVATION, -1, samsungQtyAfterReserve);

  // ——— Прострочений резерв (>3 днів) для нотифікацій ———
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(12, 0, 0, 0);
  const airpods = bySku["APL-AIRPODS-4"];
  const airpodsBalance = (await prisma.stockBalance.findUnique({ where: { productId: airpods.id } }))?.quantity ?? 0;

  const overdueReserve = await prisma.document.create({
    data: {
      number: `РЗ-${year}-0098`,
      type: DocumentType.RESERVATION,
      status: DocumentStatus.POSTED,
      date: fiveDaysAgo,
      postedAt: fiveDaysAgo,
      createdById: manager.id,
      buyerName: "Оксана Шевченко",
      buyerPhone: "+380501112233",
      notes: "Резерв прострочено — передзвонити клієнту",
      lines: {
        create: [{ productId: airpods.id, quantity: 1, unitPrice: defBySku[airpods.sku].sale }],
      },
    },
  });
  await upsertBalance(airpods.id, airpodsBalance - 1);
  await addMovement(airpods.id, overdueReserve.id, DocumentType.RESERVATION, -1, airpodsBalance - 1);

  // ——— Інвентаризація (проведена, приклад) ———
  const caseProduct = bySku["SPI-IP15-CASE"];
  const caseBalance = await prisma.stockBalance.findUnique({ where: { productId: caseProduct.id } });
  const caseBookQty = caseBalance?.quantity ?? 0;
  const caseActualQty = caseBookQty - 2;

  const inventory = await prisma.document.create({
    data: {
      number: `ІН-${year}-0001`,
      type: DocumentType.INVENTORY,
      status: DocumentStatus.POSTED,
      date: new Date(),
      postedAt: new Date(),
      createdById: manager.id,
      notes: "Планова інвентаризація чохлів — розбіжність -2 од.",
      lines: {
        create: [{ productId: caseProduct.id, quantity: caseActualQty, unitPrice: defBySku[caseProduct.sku].purchase }],
      },
    },
    include: { lines: true },
  });

  await upsertBalance(caseProduct.id, caseActualQty);
  await addMovement(
    caseProduct.id,
    inventory.id,
    DocumentType.INVENTORY,
    caseActualQty - caseBookQty,
    caseActualQty,
  );

  // ——— Чернетка надходження (для dashboard менеджера) ———
  await prisma.document.create({
    data: {
      number: `ПН-${year}-0099`,
      type: DocumentType.RECEIPT,
      status: DocumentStatus.DRAFT,
      date: new Date(),
      supplierId: mobilOpt.id,
      createdById: manager.id,
      notes: "Чернетка — очікуємо поставку AirPods від МобіОпт",
      lines: {
        create: [
          { productId: airpods.id, quantity: 12, unitPrice: defBySku[airpods.sku].purchase },
          { productId: bySku["ANK-20W"].id, quantity: 20, unitPrice: defBySku["ANK-20W"].purchase },
        ],
      },
    },
  });

  // ——— Друга чернетка: продаж аксесуарів ———
  await prisma.document.create({
    data: {
      number: `ВТ-${year}-0099`,
      type: DocumentType.EXPENSE,
      status: DocumentStatus.DRAFT,
      date: new Date(),
      createdById: manager.id,
      buyerName: "Олег Бондаренко",
      buyerPhone: "+380501998877",
      notes: "Чернетка продажу — клієнт ще обирає",
      lines: {
        create: [
          { productId: bySku["BAS-CABLE-2M"].id, quantity: 2, unitPrice: defBySku["BAS-CABLE-2M"].sale },
          { productId: bySku["ANK-MAGSAFE"].id, quantity: 1, unitPrice: defBySku["ANK-MAGSAFE"].sale },
        ],
      },
    },
  });

  const draftCount = await prisma.document.count({ where: { status: DocumentStatus.DRAFT } });
  const imeiCount = await prisma.productSerial.count({ where: { status: SerialStatus.IN_STOCK } });
  const reserveCount = await prisma.document.count({
    where: { type: DocumentType.RESERVATION, status: DocumentStatus.POSTED },
  });

  console.log("Seed completed.");
  console.log("Users:", {
    admin: admin.email,
    manager: manager.email,
    director: director.email,
    password: "demo123",
  });
  console.log("Demo data:", {
    supplier: mobilOpt.name,
    imeiInStock: imeiCount,
    drafts: draftCount,
    activeReservations: reserveCount,
    inventoryDoc: inventory.number,
    searchableImei: "352099001761481",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
