import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaDir = join(root, "prisma");

const databaseUrl = process.env.DATABASE_URL ?? "";
const usePostgres =
  process.env.USE_POSTGRES === "1" ||
  process.env.NODE_ENV === "production" ||
  databaseUrl.startsWith("postgres://") ||
  databaseUrl.startsWith("postgresql://");

const source = usePostgres ? "schema.postgresql.prisma" : "schema.sqlite.prisma";
const target = join(prismaDir, "schema.prisma");

writeFileSync(target, readFileSync(join(prismaDir, source), "utf8"));
console.log(`[prisma] Active schema: ${usePostgres ? "PostgreSQL" : "SQLite"} (${source})`);
