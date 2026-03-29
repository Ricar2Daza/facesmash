import { initDb, run, closeDb } from "../db/index.js";

async function resetDuels() {
  await initDb();

  await run("BEGIN IMMEDIATE");
  try {
    await run("DELETE FROM votes");
    await run("DELETE FROM duel_history");
    await run(
      "UPDATE faces SET elo_rating = 1200, wins = 0, losses = 0, matches = 0, updated_at = CURRENT_TIMESTAMP"
    );
    await run("COMMIT");
  } catch (e) {
    await run("ROLLBACK");
    throw e;
  } finally {
    await closeDb();
  }
}

resetDuels()
  .then(() => {
    process.stdout.write("Duelos reseteados: votes + duel_history vaciados; ratings reiniciados.\n");
  })
  .catch((err) => {
    process.stderr.write(`Error reseteando duelos: ${err?.message || err}\n`);
    process.exitCode = 1;
  });

