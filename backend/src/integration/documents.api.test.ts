import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

async function login(email: string, password = "demo123") {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe("Documents API", () => {
  it("PUT /api/documents/:id updates draft header and lines", async () => {
    const token = await login("manager@ishop-rivne.ua");

    const products = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`);
    const product = products.body[0];

    const created = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "EXPENSE",
        notes: "Чернетка для тесту",
        buyerName: "Тест Клієнт",
        buyerPhone: "+380501111111",
        lines: [{ productId: product.id, quantity: 1, unitPrice: 100 }],
      });
    expect(created.status).toBe(201);
    const docId = created.body.id as string;

    const updated = await request(app)
      .put(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        notes: "Оновлені примітки",
        buyerName: "Новий Покупець",
        buyerPhone: "+380502222222",
        lines: [{ productId: product.id, quantity: 2, unitPrice: 150 }],
      });

    expect(updated.status).toBe(200);
    expect(updated.body.notes).toBe("Оновлені примітки");
    expect(updated.body.buyerName).toBe("Новий Покупець");
    expect(updated.body.lines).toHaveLength(1);
    expect(updated.body.lines[0].quantity).toBe(2);
    expect(Number(updated.body.lines[0].unitPrice)).toBe(150);

    await request(app)
      .delete(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`);
  });

  it("PUT /api/documents/:id returns 400 for posted document", async () => {
    const token = await login("manager@ishop-rivne.ua");

    const list = await request(app)
      .get("/api/documents?status=POSTED")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    const posted = list.body[0];
    expect(posted).toBeTruthy();

    const res = await request(app)
      .put(`/api/documents/${posted.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notes: "Спроба змінити", lines: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/чернетку/);
  });

  it("GET /api/documents/:id includes serials for posted receipt", async () => {
    const token = await login("manager@ishop-rivne.ua");

    const list = await request(app)
      .get("/api/documents?type=RECEIPT&status=POSTED")
      .set("Authorization", `Bearer ${token}`);
    const receipt = list.body.find((d: { number: string }) => d.number.includes("ПН"));
    expect(receipt).toBeTruthy();

    const detail = await request(app)
      .get(`/api/documents/${receipt.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(detail.status).toBe(200);
    expect(Array.isArray(detail.body.serials)).toBe(true);
  });

  it("GET /api/documents/customer-history finds buyer by phone", async () => {
    const token = await login("manager@ishop-rivne.ua");
    const res = await request(app)
      .get("/api/documents/customer-history?q=Коваль")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.documents.length).toBeGreaterThan(0);
  });
});
