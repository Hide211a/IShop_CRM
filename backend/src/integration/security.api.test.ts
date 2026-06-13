import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

async function login(email: string) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "demo123" });
  return res.body.token as string;
}

describe("security API", () => {
  it("allows CORS preflight from localhost origin", async () => {
    const res = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("GET /api/stock/balances returns 401 without token", async () => {
    const res = await request(app).get("/api/stock/balances");
    expect(res.status).toBe(401);
  });

  it("GET /api/documents returns 403 for DIRECTOR", async () => {
    const token = await login("director@ishop-rivne.ua");
    const res = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
