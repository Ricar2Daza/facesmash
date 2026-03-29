import bcrypt from "bcryptjs";
import { initDb, get, run, closeDb } from "../db/index.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = args.username;
  const email = args.email;
  const password = args.password;

  if (!password || (!username && !email)) {
    process.stderr.write("Uso: npm run users:set-password -- --username <user> --password <pass>\n");
    process.stderr.write("   o: npm run users:set-password -- --email <email> --password <pass>\n");
    process.exitCode = 1;
    return;
  }

  await initDb();
  try {
    const user = username
      ? await get("SELECT id, username FROM users WHERE username = ?", [username])
      : await get("SELECT id, username FROM users WHERE email = ?", [email]);

    if (!user) {
      process.stderr.write("Usuario no encontrado.\n");
      process.exitCode = 1;
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id]);
    process.stdout.write(`Contraseña actualizada para username=${user.username} (id=${user.id}).\n`);
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  process.stderr.write(`Error actualizando contraseña: ${err?.message || err}\n`);
  process.exitCode = 1;
});

