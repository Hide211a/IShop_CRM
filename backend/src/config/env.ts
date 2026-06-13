const DEFAULT_CORS = "http://localhost:5173";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN ?? DEFAULT_CORS;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

/** Fail fast on Railway/production if critical env vars are missing. */
export function validateEnv(): void {
  if (!isProduction()) return;

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 16 || jwt === "change-me-in-production-use-long-random-string") {
    throw new Error(
      "JWT_SECRET must be set to a strong random value (min 16 chars) in production",
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL must be set in production");
  }

  const origins = corsOrigins();
  if (origins.length === 0) {
    throw new Error("CORS_ORIGIN must list at least one allowed frontend URL");
  }
}
