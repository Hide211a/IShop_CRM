import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

describe("auth API", () => {
  const inactiveEmail = `inactive-${Date.now()}@test.local`;
  let inactiveUserId: string;

  afterAll(async () => {
    if (inactiveUserId) {
      await prisma.user.delete({ where: { id: inactiveUserId } }).catch(() => {});
    }
  });

  it("POST /api/auth/login returns token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "manager@ishop-rivne.ua", password: "demo123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("manager@ishop-rivne.ua");
    expect(res.body.user.role).toBe("MANAGER");
  });

  it("POST /api/auth/login returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "manager@ishop-rivne.ua", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Невірний email або пароль/);
  });

  it("POST /api/auth/login returns 401 for inactive user", async () => {
    const passwordHash = await bcrypt.hash("demo123", 10);
    const user = await prisma.user.create({
      data: {
        email: inactiveEmail,
        passwordHash,
        fullName: "Inactive Test User",
        role: "MANAGER",
        active: false,
      },
    });
    inactiveUserId = user.id;

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: inactiveEmail, password: "demo123" });

    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
