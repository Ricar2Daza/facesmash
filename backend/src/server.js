import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";
import { initDb } from "./db/index.js";
import facesRouter from "./routes/faces.js";
import rankingsRouter from "./routes/rankings.js";
import votesRouter from "./routes/votes.js";
import consentRouter from "./routes/consent.js";
import reportsRouter from "./routes/reports.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for MVP simplicity with inline scripts/styles if any
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined')); // Production logging

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
const publicDir = path.join(__dirname, "..", "public");

app.use("/uploads", (req, res, next) => {
  console.log(`[Static] Request for upload: ${req.url}`);
  next();
}, express.static(uploadsDir));
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

const port = process.env.PORT || 3000;

// Inicializar DB y arrancar servidor
initDb().then(() => {
  app.listen(port, () => {
    process.stdout.write(`Servidor iniciado en http://localhost:${port}\n`);
  });
}).catch(err => {
  console.error('Error al inicializar la BD:', err);
});
