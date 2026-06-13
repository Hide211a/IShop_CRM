import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { routeParam } from "../utils/routeParam.js";

const router = Router();

router.use(authenticate, requireRoles("ADMIN"));

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { fullName: "asc" },
  });
  res.json(users);
});

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  fullName: z.string().min(1),
  role: z.nativeEnum(Role),
  active: z.boolean().default(true),
});

router.post("/", async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.password) {
    res.status(400).json({ message: "Вкажіть email, пароль, ПІБ та роль" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
        active: parsed.data.active,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
      },
    });
    res.status(201).json(user);
  } catch {
    res.status(409).json({ message: "Користувач з таким email вже існує" });
  }
});

router.put("/:id", async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Невірні дані" });
    return;
  }

  if (routeParam(req.params.id) === req.user!.id && parsed.data.active === false) {
    res.status(400).json({ message: "Не можна деактивувати власний обліковий запис" });
    return;
  }

  const data: {
    email: string;
    fullName: string;
    role: Role;
    active: boolean;
    passwordHash?: string;
  } = {
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    role: parsed.data.role,
    active: parsed.data.active,
  };

  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  try {
    const user = await prisma.user.update({
      where: { id: routeParam(req.params.id) },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
      },
    });
    res.json(user);
  } catch {
    res.status(404).json({ message: "Користувач не знайдений" });
  }
});

export default router;
