import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Необхідна авторизація" });
    return;
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET не налаштовано");
    const payload = jwt.verify(token, secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, fullName: true, active: true },
    });

    if (!user || !user.active) {
      res.status(401).json({
        message: "Сесія застаріла. Вийдіть і увійдіть знову (після оновлення бази даних).",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    next();
  } catch {
    res.status(401).json({ message: "Недійсний або прострочений токен" });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Необхідна авторизація" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Недостатньо прав доступу" });
      return;
    }
    next();
  };
}
