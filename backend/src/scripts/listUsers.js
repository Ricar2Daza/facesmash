import { initDb, query, closeDb } from "../db/index.js";

async function main() {
  await initDb();
  try {
    const users = await query(
      "SELECT id, username, email, created_at, last_login_at, is_active, is_suspended, profile_completed FROM users ORDER BY id ASC"
    );
    if (!users.length) {
      process.stdout.write("No hay usuarios registrados.\n");
      return;
    }

    const lines = users.map((u) => {
      const safeEmail = u.email ? String(u.email) : "";
      return [
        `id=${u.id}`,
        `username=${u.username}`,
        `email=${safeEmail}`,
        `active=${u.is_active}`,
        `suspended=${u.is_suspended}`,
        `profile_completed=${u.profile_completed}`,
        `created_at=${u.created_at}`,
        `last_login_at=${u.last_login_at || ""}`
      ].join(" ");
    });
    process.stdout.write(lines.join("\n") + "\n");
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  process.stderr.write(`Error listando usuarios: ${err?.message || err}\n`);
  process.exitCode = 1;
});

