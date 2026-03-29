import { initDb } from "./db/index.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
const uploadsStaticDir = process.env.UPLOADS_DIR || uploadsDir;

const app = createApp();

const port = process.env.PORT || 3000;

// Inicializar DB y arrancar servidor
initDb().then(() => {
  return fs.mkdir(uploadsStaticDir, { recursive: true });
}).then(() => {
  app.listen(port, () => {
    process.stdout.write(`Servidor iniciado en http://localhost:${port}\n`);
  });
}).catch(err => {
  console.error('Error al inicializar la BD:', err);
});
