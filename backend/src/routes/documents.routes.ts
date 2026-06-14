import { Router } from "express";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { handlePrismaError } from "../lib/errors.js";
import {
  cancelReservation,
  completeReservationAsSale,
} from "../services/reservation.service.js";
import { postDocument, StockError } from "../services/stock.service.js";
import { unpostDocument } from "../services/unpost.service.js";
import {
  createDocumentSchema,
  formatZodMessage,
  parseUpdateDocumentBody,
} from "../services/documentValidation.js";
import { routeParam } from "../utils/routeParam.js";

const router = Router();

router.use(authenticate);

async function nextDocumentNumber(type: DocumentType): Promise<string> {
  const prefix: Record<DocumentType, string> = {
    RECEIPT: "ПН",
    EXPENSE: "ВТ",
    INVENTORY: "ІН",
    RESERVATION: "РЗ",
  };
  const count = await prisma.document.count({ where: { type } });
  const year = new Date().getFullYear();
  return `${prefix[type]}-${year}-${String(count + 1).padStart(4, "0")}`;
}

router.get("/", requireRoles("MANAGER", "ADMIN"), async (req, res) => {
  const type =
    typeof req.query.type === "string"
      ? (req.query.type as DocumentType)
      : undefined;
  const status =
    typeof req.query.status === "string"
      ? (req.query.status as DocumentStatus)
      : undefined;
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  if (to) to.setHours(23, 59, 59, 999);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;

  const documents = await prisma.document.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q } },
              { buyerName: { contains: q } },
              { buyerPhone: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      supplier: true,
      createdBy: { select: { fullName: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(documents);
});

router.get(
  "/last-receipt",
  requireRoles("MANAGER", "ADMIN"),
  async (_req, res) => {
    const doc = await prisma.document.findFirst({
      where: { type: DocumentType.RECEIPT, status: DocumentStatus.POSTED },
      orderBy: { postedAt: "desc" },
      include: {
        lines: { include: { product: true } },
        supplier: true,
      },
    });
    res.json(doc);
  },
);

router.get(
  "/last-expense",
  requireRoles("MANAGER", "ADMIN"),
  async (_req, res) => {
    const doc = await prisma.document.findFirst({
      where: { type: DocumentType.EXPENSE, status: DocumentStatus.POSTED },
      orderBy: { postedAt: "desc" },
      include: {
        lines: { include: { product: true } },
      },
    });
    res.json(doc);
  },
);

router.get(
  "/customer-history",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 3) {
      res.status(400).json({ message: "Введіть мінімум 3 символи (телефон або ПІБ)" });
      return;
    }

    const documents = await prisma.document.findMany({
      where: {
        AND: [
          {
            type: { in: [DocumentType.RESERVATION, DocumentType.EXPENSE] },
            status: { in: [DocumentStatus.POSTED, DocumentStatus.CANCELLED] },
          },
          {
            NOT: {
              type: DocumentType.RESERVATION,
              status: DocumentStatus.CANCELLED,
              notes: { contains: "Завершено продажем" },
            },
          },
          {
            OR: [
              { buyerPhone: { contains: q } },
              { buyerName: { contains: q } },
            ],
          },
        ],
      },
      orderBy: { postedAt: "desc" },
      take: 20,
      include: {
        _count: { select: { lines: true } },
      },
    });

    const buyerName = documents[0]?.buyerName ?? null;
    const buyerPhone = documents[0]?.buyerPhone ?? null;

    res.json({ query: q, buyerName, buyerPhone, documents });
  },
);

router.get("/:id", requireRoles("MANAGER", "ADMIN"), async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: routeParam(req.params.id) },
    include: {
      supplier: true,
      createdBy: { select: { fullName: true, email: true } },
      lines: {
        include: {
          product: {
            include: { brand: true, stockBalance: true },
          },
        },
      },
    },
  });
  if (!document) {
    res.status(404).json({ message: "Документ не знайдено" });
    return;
  }

  const serials =
    document.status !== DocumentStatus.DRAFT
      ? await prisma.productSerial.findMany({
          where: { documentId: document.id },
          orderBy: { imei: "asc" },
        })
      : [];

  res.json({ ...document, serials });
});

router.post(
  "/",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: formatZodMessage(parsed.error), errors: parsed.error.flatten() });
      return;
    }

    const { lines, ...data } = parsed.data;
    const number = await nextDocumentNumber(data.type);

    try {
      const document = await prisma.document.create({
        data: {
          number,
          type: data.type,
          date: data.date ?? new Date(),
          notes: data.notes,
          buyerName: "buyerName" in data ? data.buyerName : undefined,
          buyerPhone: "buyerPhone" in data ? data.buyerPhone : undefined,
          supplierId: "supplierId" in data ? data.supplierId : undefined,
          createdById: req.user!.id,
          lines: { create: lines },
        },
        include: {
          lines: { include: { product: true } },
          supplier: true,
        },
      });

      res.status(201).json(document);
    } catch (e) {
      const { status, message } = handlePrismaError(e);
      res.status(status).json({ message });
    }
  },
);

router.put(
  "/:id",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    const doc = await prisma.document.findUnique({
      where: { id: routeParam(req.params.id) },
    });
    if (!doc) {
      res.status(404).json({ message: "Документ не знайдено" });
      return;
    }
    if (doc.status !== DocumentStatus.DRAFT) {
      res.status(400).json({ message: "Редагувати можна лише чернетку" });
      return;
    }

    const parsed = parseUpdateDocumentBody(doc.type, req.body);
    if (!parsed.success) {
      res.status(400).json({ message: formatZodMessage(parsed.error), errors: parsed.error.flatten() });
      return;
    }

    const { lines, ...data } = parsed.data;

    try {
      const document = await prisma.$transaction(async (tx) => {
        await tx.documentLine.deleteMany({ where: { documentId: doc.id } });
        const base = {
          date: data.date ?? doc.date,
          notes: data.notes,
          lines: { create: lines },
        };
        if (doc.type === DocumentType.INVENTORY) {
          return tx.document.update({
            where: { id: doc.id },
            data: base,
            include: {
              lines: { include: { product: { include: { stockBalance: true } } } },
              supplier: true,
              createdBy: { select: { fullName: true, email: true } },
            },
          });
        }
        if (doc.type === DocumentType.RECEIPT) {
          const receiptData = data as { supplierId: string };
          return tx.document.update({
            where: { id: doc.id },
            data: { ...base, supplierId: receiptData.supplierId },
            include: {
              lines: { include: { product: { include: { stockBalance: true } } } },
              supplier: true,
              createdBy: { select: { fullName: true, email: true } },
            },
          });
        }
        if (doc.type === DocumentType.RESERVATION) {
          const reservationData = data as { buyerName: string; buyerPhone: string };
          return tx.document.update({
            where: { id: doc.id },
            data: {
              ...base,
              buyerName: reservationData.buyerName,
              buyerPhone: reservationData.buyerPhone,
            },
            include: {
              lines: { include: { product: { include: { stockBalance: true } } } },
              supplier: true,
              createdBy: { select: { fullName: true, email: true } },
            },
          });
        }
        const expenseData = data as { buyerName: string; buyerPhone?: string };
        return tx.document.update({
          where: { id: doc.id },
          data: {
            ...base,
            buyerName: expenseData.buyerName,
            buyerPhone: expenseData.buyerPhone ?? null,
          },
          include: {
            lines: { include: { product: { include: { stockBalance: true } } } },
            supplier: true,
            createdBy: { select: { fullName: true, email: true } },
          },
        });
      });

      res.json({ ...document, serials: [] });
    } catch (e) {
      const { status, message } = handlePrismaError(e);
      res.status(status).json({ message });
    }
  },
);

const postSerialSchema = z.object({
  lineSerials: z
    .array(
      z.object({
        lineId: z.string(),
        imeis: z.array(z.string()).optional(),
        serialIds: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

router.post(
  "/:id/post",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    const body = postSerialSchema.safeParse(req.body);
    const lineSerials = body.success ? body.data.lineSerials ?? [] : [];
    try {
      const document = await postDocument(routeParam(req.params.id), lineSerials);
      res.json(document);
    } catch (e) {
      if (e instanceof StockError) {
        res.status(400).json({ message: e.message });
        return;
      }
      const { status, message } = handlePrismaError(e);
      res.status(status).json({ message });
    }
  },
);

router.post(
  "/:id/unpost",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    try {
      const document = await unpostDocument(routeParam(req.params.id));
      res.json(document);
    } catch (e) {
      if (e instanceof StockError) {
        res.status(400).json({ message: e.message });
        return;
      }
      const { status, message } = handlePrismaError(e);
      res.status(status).json({ message });
    }
  },
);

router.post(
  "/:id/cancel-reservation",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    try {
      const document = await cancelReservation(routeParam(req.params.id));
      res.json(document);
    } catch (e) {
      if (e instanceof StockError) {
        res.status(400).json({ message: e.message });
        return;
      }
      const { status, message } = handlePrismaError(e);
      res.status(status).json({ message });
    }
  },
);

router.post(
  "/:id/complete-sale",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    try {
      const result = await completeReservationAsSale(
        routeParam(req.params.id),
        req.user!.id,
      );
      res.json(result);
    } catch (e) {
      if (e instanceof StockError) {
        res.status(400).json({ message: e.message });
        return;
      }
      const { status, message } = handlePrismaError(e);
      res.status(status).json({ message });
    }
  },
);

router.delete(
  "/:id",
  requireRoles("MANAGER", "ADMIN"),
  async (req, res) => {
    const doc = await prisma.document.findUnique({
      where: { id: routeParam(req.params.id) },
    });
    if (!doc) {
      res.status(404).json({ message: "Документ не знайдено" });
      return;
    }
    if (doc.status === DocumentStatus.POSTED) {
      res.status(400).json({ message: "Проведений документ не можна видалити" });
      return;
    }
    await prisma.document.delete({ where: { id: routeParam(req.params.id) } });
    res.status(204).send();
  },
);

export default router;
