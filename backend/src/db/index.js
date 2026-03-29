import sqlite3 from 'sqlite3';

const DB_PATH = process.env.DB_PATH || './data.sqlite';
const db = new sqlite3.Database(DB_PATH);

export function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA synchronous = NORMAL');

      db.run(`
        CREATE TABLE IF NOT EXISTS faces (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT CHECK(type IN ('AI', 'REAL')) NOT NULL,
          image_path TEXT NOT NULL,
          display_name TEXT,
          gender TEXT CHECK(gender IN ('male', 'female')) DEFAULT 'male',
          elo_rating REAL DEFAULT 1200,
          is_ai_generated INTEGER DEFAULT 0,
          uploader_id INTEGER,
          consent_given INTEGER DEFAULT 0,
          consent_revoked_at TEXT,
          is_public INTEGER DEFAULT 1,
          revocation_token_hash TEXT,
          reports_count INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          matches INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(uploader_id) REFERENCES users(id)
        )
      `, (err) => {
        if (!err) {
          const columnsToAdd = ['wins', 'losses', 'matches'];
          columnsToAdd.forEach(col => {
            db.run(`ALTER TABLE faces ADD COLUMN ${col} INTEGER DEFAULT 0`, () => {});
          });
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          reset_token TEXT,
          reset_token_expires INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          role TEXT DEFAULT 'USER',
          is_suspended INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          last_login_at TEXT,
          profile_completed INTEGER DEFAULT 1
        )
      `, () => {
        const userColumns = [
          "role TEXT DEFAULT 'USER'",
          "is_suspended INTEGER DEFAULT 0",
          "is_active INTEGER DEFAULT 1",
          "last_login_at TEXT",
          "profile_completed INTEGER DEFAULT 1"
        ];
        userColumns.forEach(def => {
          db.run(`ALTER TABLE users ADD COLUMN ${def}`, () => {});
        });
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          face_a_id INTEGER NOT NULL,
          face_b_id INTEGER NOT NULL,
          winner_face_id INTEGER,
          is_tie INTEGER DEFAULT 0,
          voter_ip_hash TEXT,
          user_agent TEXT,
          user_id INTEGER,
          incident TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(face_a_id) REFERENCES faces(id),
          FOREIGN KEY(face_b_id) REFERENCES faces(id),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `, () => {
        const voteColumns = [
          "user_id INTEGER",
          "incident TEXT"
        ];
        voteColumns.forEach(def => {
          db.run(`ALTER TABLE votes ADD COLUMN ${def}`, () => {});
        });
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          face_id INTEGER NOT NULL,
          reason TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(face_id) REFERENCES faces(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id INTEGER,
          action TEXT,
          details TEXT,
          level TEXT DEFAULT 'INFO',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(admin_id) REFERENCES admins(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS duel_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          category TEXT CHECK(category IN ('AI', 'REAL')) NOT NULL,
          gender TEXT,
          face_a_id INTEGER NOT NULL,
          face_b_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(face_a_id) REFERENCES faces(id),
          FOREIGN KEY(face_b_id) REFERENCES faces(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_faces_public_type_gender ON faces (is_public, type, gender)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_faces_revoked ON faces (consent_revoked_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_faces_uploader ON faces (uploader_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users (is_active, is_suspended, profile_completed)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_votes_faces ON votes (face_a_id, face_b_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_votes_user ON votes (user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_duel_history_user_created ON duel_history (user_id, created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_duel_history_faces ON duel_history (face_a_id, face_b_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes (created_at)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function closeDb() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
