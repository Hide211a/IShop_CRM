import { describe, it, expect } from "vitest";
import { getNotifications } from "./notifications.service.js";
import { getPeriodComparison } from "./reports.service.js";

describe("notifications.service", () => {
  it("getNotifications returns structured alerts", async () => {
    const data = await getNotifications();
    expect(typeof data.lowStockCount).toBe("number");
    expect(typeof data.overdueReservationCount).toBe("number");
    expect(Array.isArray(data.overdueReservations)).toBe(true);
    expect(typeof data.totalCount).toBe("number");
  });
});

describe("getPeriodComparison", () => {
  it("returns current and previous month sales", async () => {
    const data = await getPeriodComparison();
    expect(data.current.salesCount).toBeGreaterThanOrEqual(0);
    expect(data.previous.salesCount).toBeGreaterThanOrEqual(0);
    expect(typeof data.change.revenue).toBe("number");
  });
});
