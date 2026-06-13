import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import directoriesRoutes from "./routes/directories.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import productsRoutes from "./routes/products.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import usersRoutes from "./routes/users.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import serialsRoutes from "./routes/serials.routes.js";
import { corsOrigins } from "./config/env.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      const allowed = corsOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, origin ?? allowed[0]);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "ishop-rivne-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/directories", directoriesRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/serials", serialsRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err.message.startsWith("CORS blocked:")) {
      res.status(403).json({ message: "Origin not allowed" });
      return;
    }
    const payloadErr = err as Error & { type?: string; status?: number };
    if (payloadErr.type === "entity.too.large" || payloadErr.status === 413) {
      res.status(413).json({ message: "Занадто великий запит" });
      return;
    }
    console.error(err);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  },
);

export default app;
