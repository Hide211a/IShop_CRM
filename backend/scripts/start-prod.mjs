import { execSync, spawn } from "node:child_process";

function run(cmd) {
  console.log(`[start] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("node scripts/prepare-schema.mjs");
run("npx prisma generate");
run("npx prisma db push");

console.log("[start] launching API (healthcheck can pass now)...");
const server = spawn("node", ["dist/index.js"], {
  stdio: "inherit",
  env: process.env,
});

console.log("[start] seeding demo data in background...");
spawn("npx", ["prisma", "db", "seed"], {
  stdio: "inherit",
  env: process.env,
}).on("exit", (code) => {
  console.log(`[start] seed finished (exit ${code ?? 0})`);
});

server.on("exit", (code) => {
  process.exit(code ?? 1);
});
