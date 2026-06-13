import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

async function login(email: string, password = "demo123") {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe("RBAC API", () => {
  it("POST /api/users returns 403 for MANAGER", async () => {
    const token = await login("manager@ishop-rivne.ua");

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: `new-user-${Date.now()}@test.local`,
        password: "demo123",
        fullName: "Test User",
        role: "MANAGER",
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Недостатньо прав/);
  });

  it("GET /api/users returns 200 for ADMIN", async () => {
    const token = await login("admin@ishop-rivne.ua");

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/users returns 401 without token", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });
});
