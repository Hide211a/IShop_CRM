import { describe, it, expect } from "vitest";
import { getAbcAnalysis, getSalesChart, getTopProducts } from "./reports.service.js";

describe("reports.service", () => {
  it("getSalesChart returns array of points", async () => {
    const from = new Date(new Date().getFullYear(), 0, 1);
    const to = new Date();
    const points = await getSalesChart(from, to, "day");
    expect(Array.isArray(points)).toBe(true);
  });

  it("getTopProducts returns sorted items with margin", async () => {
    const from = new Date(new Date().getFullYear(), 0, 1);
    const to = new Date();
    const items = await getTopProducts(from, to, 5);
    expect(Array.isArray(items)).toBe(true);
    if (items.length >= 2) {
      expect(items[0].revenue).toBeGreaterThanOrEqual(items[1].revenue);
    }
  });

  it("getAbcAnalysis assigns ABC classes", async () => {
    const items = await getAbcAnalysis();
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(["A", "B", "C"]).toContain(item.abc);
    }
  });
});
