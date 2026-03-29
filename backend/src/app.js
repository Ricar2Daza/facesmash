import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";

import facesRouter from "./routes/faces.js";
import rankingsRouter from "./routes/rankings.js";
import votesRouter from "./routes/votes.js";
import consentRouter from "./routes/consent.js";
import reportsRouter from "./routes/reports.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";

export function createApp() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("combined"));

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120
  });

  const voteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60
  });

  app.use(generalLimiter);
  app.use("/api/votes", voteLimiter);

  const uploadsDir = path.join(__dirname, "uploads");
  const uploadsStaticDir = process.env.UPLOADS_DIR || uploadsDir;
  const publicDir = path.join(__dirname, "..", "public");

  app.use("/uploads", express.static(uploadsStaticDir));
  app.use(express.static(publicDir));

  app.use("/api/faces", facesRouter);
  app.use("/api/rankings", rankingsRouter);
  app.use("/api/votes", votesRouter);
  app.use("/api/consent", consentRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/auth", authRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}
