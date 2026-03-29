import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import request from "supertest";

const testDbPath = path.join(process.cwd(), "data.test.sqlite");
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = "test_secret";

let initDb;
let closeDb;
let run;
let get;
let app;

async function seedUser({ username }) {
  const res = await run(
    "INSERT INTO users (username, email, password_hash, is_active, is_suspended, profile_completed, created_at) VALUES (?, ?, ?, 1, 0, 1, CURRENT_TIMESTAMP)",
    [username, `${username}@example.com`, "x"]
  );
  return res.id;
}

async function seedAdmin({ username }) {
  const res = await run(
    "INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
    [username, "x"]
  );
  return res.id;
}

async function seedFace({ type, uploaderId, gender = "male", consentGiven = 0 }) {
  const res = await run(
    "INSERT INTO faces (type, image_path, display_name, gender, is_ai_generated, uploader_id, consent_given, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [
      type,
      `/uploads/${type}-${Math.random().toString(16).slice(2)}.jpg`,
      null,
      gender,
      type === "AI" ? 1 : 0,
      uploaderId ?? null,
      consentGiven
    ]
  );
  return res.id;
}

beforeAll(async () => {
  await fs.rm(testDbPath, { force: true });

  const dbMod = await import("./db/index.js");
  initDb = dbMod.initDb;
  closeDb = dbMod.closeDb;
  run = dbMod.run;
  get = dbMod.get;

  const { createApp } = await import("./app.js");
  app = createApp();

  await initDb();
});

afterAll(async () => {
  try {
    await closeDb();
  } catch {}
  await fs.rm(testDbPath, { force: true });
});

describe("Duelos: matchmaking y votos", () => {
  test("GET /api/faces/duel (AI) devuelve 404 si no hay suficientes rostros", async () => {
    const res = await request(app).get("/api/faces/duel?category=AI&gender=male");
    expect(res.status).toBe(404);
  });

  test("GET /api/faces/duel (AI) devuelve 2 rostros distintos", async () => {
    await seedFace({ type: "AI", gender: "male" });
    await seedFace({ type: "AI", gender: "male" });

    const res = await request(app).get("/api/faces/duel?category=AI&gender=male");
    expect(res.status).toBe(200);
    expect(res.body.faces).toHaveLength(2);
    expect(res.body.faces[0].id).not.toBe(res.body.faces[1].id);
    expect(res.body.faces[0].type).toBe("AI");
    expect(res.body.faces[1].type).toBe("AI");
  });

  test("GET /api/faces/duel (REAL) requiere autenticación", async () => {
    const res = await request(app).get("/api/faces/duel?category=REAL&gender=male");
    expect(res.status).toBe(401);
  });

  test("GET /api/faces/duel (REAL) con sesión excluye rostros propios si existen oponentes", async () => {
    const uA = await seedUser({ username: "p1" });
    const uB = await seedUser({ username: "p2" });

    const myFace = await seedFace({ type: "REAL", uploaderId: uA, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uB, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uB, gender: "male", consentGiven: 1 });

    const token = jwt.sign({ id: uA, username: "p1" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const res = await request(app)
      .get("/api/faces/duel?category=REAL&gender=male")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.faces).toHaveLength(2);
    expect(res.body.faces[0].type).toBe("REAL");
    expect(res.body.faces[1].type).toBe("REAL");
    expect(res.body.faces[0].id).not.toBe(res.body.faces[1].id);
    expect(res.body.faces[0].id).not.toBe(myFace);
    expect(res.body.faces[1].id).not.toBe(myFace);
  });

  test("GET /api/faces/duel (REAL) no repite rostros consecutivos para el mismo usuario", async () => {
    const uA = await seedUser({ username: "p3" });
    const uB = await seedUser({ username: "p4" });
    const uC = await seedUser({ username: "p5" });
    const uD = await seedUser({ username: "p6" });

    await seedFace({ type: "REAL", uploaderId: uA, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uB, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uB, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uC, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uC, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uD, gender: "male", consentGiven: 1 });

    const token = jwt.sign({ id: uA, username: "p3" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const res1 = await request(app)
      .get("/api/faces/duel?category=REAL&gender=male")
      .set("Authorization", `Bearer ${token}`);
    expect(res1.status).toBe(200);
    const ids1 = new Set(res1.body.faces.map(f => f.id));

    const res2 = await request(app)
      .get("/api/faces/duel?category=REAL&gender=male")
      .set("Authorization", `Bearer ${token}`);
    expect(res2.status).toBe(200);
    const ids2 = new Set(res2.body.faces.map(f => f.id));

    ids1.forEach(id => expect(ids2.has(id)).toBe(false));
  });

  test("GET /api/faces/duel (REAL) entrega diversidad razonable en múltiples llamadas", async () => {
    const uA = await seedUser({ username: "p7" });
    const uB = await seedUser({ username: "p8" });
    const uC = await seedUser({ username: "p9" });
    const uD = await seedUser({ username: "p10" });

    await seedFace({ type: "REAL", uploaderId: uA, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uB, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uB, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uC, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uC, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uD, gender: "male", consentGiven: 1 });
    await seedFace({ type: "REAL", uploaderId: uD, gender: "male", consentGiven: 1 });

    const token = jwt.sign({ id: uA, username: "p7" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const seen = new Set();
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .get("/api/faces/duel?category=REAL&gender=male")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      res.body.faces.forEach(f => seen.add(f.id));
    }

    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  test("POST /api/votes requiere autenticación incluso para AI", async () => {
    const a = await seedFace({ type: "AI", gender: "male" });
    const b = await seedFace({ type: "AI", gender: "male" });

    const res = await request(app).post("/api/votes").send({ faceAId: a, faceBId: b, winnerFaceId: a });
    expect(res.status).toBe(401);
  });

  test("POST /api/votes actualiza ELO y contadores de duelos (AI) con sesión", async () => {
    const userId = await seedUser({ username: "u1" });
    const token = jwt.sign({ id: userId, username: "u1" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const a = await seedFace({ type: "AI", gender: "male" });
    const b = await seedFace({ type: "AI", gender: "male" });

    const beforeA = await get("SELECT elo_rating, matches, wins, losses FROM faces WHERE id = ?", [a]);
    const beforeB = await get("SELECT elo_rating, matches, wins, losses FROM faces WHERE id = ?", [b]);

    const res = await request(app)
      .post("/api/votes")
      .set("Authorization", `Bearer ${token}`)
      .send({ faceAId: a, faceBId: b, winnerFaceId: a });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const afterA = await get("SELECT elo_rating, matches, wins, losses FROM faces WHERE id = ?", [a]);
    const afterB = await get("SELECT elo_rating, matches, wins, losses FROM faces WHERE id = ?", [b]);

    expect(afterA.matches).toBe((beforeA.matches || 0) + 1);
    expect(afterB.matches).toBe((beforeB.matches || 0) + 1);
    expect(afterA.wins).toBe((beforeA.wins || 0) + 1);
    expect(afterB.losses).toBe((beforeB.losses || 0) + 1);
    expect(afterA.elo_rating).not.toBe(beforeA.elo_rating);
    expect(afterB.elo_rating).not.toBe(beforeB.elo_rating);
  });

  test("POST /api/votes rechaza IDs iguales", async () => {
    const userId = await seedUser({ username: "u2" });
    const token = jwt.sign({ id: userId, username: "u2" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const a = await seedFace({ type: "AI", gender: "male" });
    const res = await request(app)
      .post("/api/votes")
      .set("Authorization", `Bearer ${token}`)
      .send({ faceAId: a, faceBId: a, winnerFaceId: a });

    expect(res.status).toBe(400);
  });

  test("POST /api/admin/reset-duels borra votos/historial y reinicia ratings", async () => {
    const adminId = await seedAdmin({ username: "adm" });
    const adminToken = jwt.sign({ id: adminId, username: "adm" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const u1 = await seedUser({ username: "r1" });
    const u2 = await seedUser({ username: "r2" });
    const f1 = await seedFace({ type: "REAL", uploaderId: u1, gender: "male", consentGiven: 1 });
    const f2 = await seedFace({ type: "REAL", uploaderId: u2, gender: "male", consentGiven: 1 });

    const userToken = jwt.sign({ id: u1, username: "r1" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const voteRes = await request(app)
      .post("/api/votes")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ faceAId: f1, faceBId: f2, winnerFaceId: f1 });
    expect(voteRes.status).toBe(200);

    const duelRes = await request(app)
      .get("/api/faces/duel?category=REAL&gender=male")
      .set("Authorization", `Bearer ${userToken}`);
    expect(duelRes.status).toBe(200);

    const beforeVotes = await get("SELECT COUNT(*) as cnt FROM votes", []);
    const beforeHistory = await get("SELECT COUNT(*) as cnt FROM duel_history", []);
    expect(Number(beforeVotes.cnt)).toBeGreaterThan(0);
    expect(Number(beforeHistory.cnt)).toBeGreaterThan(0);

    const resetRes = await request(app)
      .post("/api/admin/reset-duels")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const afterVotes = await get("SELECT COUNT(*) as cnt FROM votes", []);
    const afterHistory = await get("SELECT COUNT(*) as cnt FROM duel_history", []);
    expect(Number(afterVotes.cnt)).toBe(0);
    expect(Number(afterHistory.cnt)).toBe(0);

    const afterF1 = await get("SELECT elo_rating, wins, losses, matches FROM faces WHERE id = ?", [f1]);
    const afterF2 = await get("SELECT elo_rating, wins, losses, matches FROM faces WHERE id = ?", [f2]);
    expect(afterF1.elo_rating).toBe(1200);
    expect(afterF2.elo_rating).toBe(1200);
    expect(afterF1.wins).toBe(0);
    expect(afterF1.losses).toBe(0);
    expect(afterF1.matches).toBe(0);
    expect(afterF2.wins).toBe(0);
    expect(afterF2.losses).toBe(0);
    expect(afterF2.matches).toBe(0);
  });
});
