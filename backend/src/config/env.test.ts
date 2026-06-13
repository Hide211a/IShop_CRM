import { describe, it, expect, afterEach } from "vitest";
import { corsOrigins, validateEnv } from "./env.js";

describe("env config", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("parses multiple CORS origins", () => {
    process.env.CORS_ORIGIN = "http://localhost:5173, https://app.vercel.app ";
    expect(corsOrigins()).toEqual(["http://localhost:5173", "https://app.vercel.app"]);
  });

  it("requires strong JWT_SECRET in production", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://localhost/db";
    process.env.CORS_ORIGIN = "https://app.vercel.app";
    process.env.JWT_SECRET = "change-me-in-production-use-long-random-string";

    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  it("passes validation with proper production env", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://localhost/db";
    process.env.CORS_ORIGIN = "https://app.vercel.app";
    process.env.JWT_SECRET = "super-secret-production-key-32chars";

    expect(() => validateEnv()).not.toThrow();
  });
});
