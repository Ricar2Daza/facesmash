import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run, query } from '../db/index.js';
import { logAdminAction } from '../lib/adminLog.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_dev_key_change_in_prod';

// Middleware de autenticación
export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.adminId = payload.id;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await get('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (!admin) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '8h' });
    
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/admin/setup (Solo para primer uso, eliminar en prod o proteger)
router.post('/setup', async (req, res) => {
  const { username, password, secret } = req.body;

  // Mecanismo simple de protección para setup inicial
  if (secret !== 'admin_setup_secret') {
    return res.status(403).json({ error: 'Prohibido' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ success: true, message: 'Admin creado' });
  } catch (err) {
    res.status(400).json({ error: 'Error al crear admin (quizás ya existe)' });
  }
});

// GET /api/admin/reports
router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const reports = await query(
      `SELECT r.id, r.reason, r.created_at, 
              f.id as face_id, f.image_path, f.reports_count, f.is_public
       FROM reports r
       JOIN faces f ON r.face_id = f.id
       ORDER BY r.created_at DESC
       LIMIT 50`
    );
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// POST /api/admin/moderate
router.post('/moderate', authenticateAdmin, async (req, res) => {
  const { faceId, action } = req.body; // action: 'hide', 'restore', 'delete'

  try {
    if (action === 'hide') {
      await run('UPDATE faces SET is_public = 0 WHERE id = ?', [faceId]);
    } else if (action === 'restore') {
      await run('UPDATE faces SET is_public = 1 WHERE id = ?', [faceId]);
    } else if (action === 'delete') {
      // Soft delete real o hard delete? MVP: Soft delete (ya cubierto por hide, pero si es delete legal...)
      // Haremos un borrado lógico más fuerte o borrado físico si se requiere.
      // Por seguridad MVP: is_public=0 y flag deleted=1 (no existe columna deleted, usamos consent_revoked_at simulado)
      await run("UPDATE faces SET is_public = 0, consent_revoked_at = 'ADMIN_BANNED' WHERE id = ?", [faceId]);
    } else {
      return res.status(400).json({ error: 'Acción inválida' });
    }
    await logAdminAction(req.adminId, 'moderate_face', { faceId, action }, 'WARN');
    res.json({ success: true, message: `Acción ${action} aplicada` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al moderar' });
  }
});


router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT id, username, email, created_at, role, is_active, is_suspended, last_login_at, profile_completed
      FROM users
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.patch('/users/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active, is_suspended, profile_completed, role } = req.body;
  try {
    const user = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const fields = [];
    const values = [];
    if (typeof is_active === 'number') {
      fields.push('is_active = ?');
      values.push(is_active);
    }
    if (typeof is_suspended === 'number') {
      fields.push('is_suspended = ?');
      values.push(is_suspended);
    }
    if (typeof profile_completed === 'number') {
      fields.push('profile_completed = ?');
      values.push(profile_completed);
    }
    if (typeof role === 'string') {
      fields.push('role = ?');
      values.push(role);
    }
    if (!fields.length) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await run(sql, values);
    await logAdminAction(req.adminId, 'update_user', { userId: id, is_active, is_suspended, profile_completed, role }, 'INFO');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const logs = await query(`
      SELECT l.id, l.action, l.details, l.level, l.created_at, a.username as admin_username
      FROM admin_logs l
      LEFT JOIN admins a ON a.id = l.admin_id
      ORDER BY l.created_at DESC
      LIMIT 200
    `);
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener logs' });
  }
});

router.get('/duels', authenticateAdmin, async (req, res) => {
  try {
    const duels = await query(`
      SELECT 
        v.id,
        v.created_at,
        v.user_id,
        u.username,
        v.face_a_id,
        v.face_b_id,
        v.winner_face_id,
        v.is_tie,
        v.incident
      FROM votes v
      LEFT JOIN users u ON u.id = v.user_id
      ORDER BY v.created_at DESC
      LIMIT 100
    `);
    res.json({ duels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener duelos' });
  }
});

router.post('/reset-duels', authenticateAdmin, async (req, res) => {
  try {
    await run("BEGIN IMMEDIATE");
    try {
      const votesDeleted = await run("DELETE FROM votes");
      const historyDeleted = await run("DELETE FROM duel_history");
      const facesReset = await run(
        "UPDATE faces SET elo_rating = 1200, wins = 0, losses = 0, matches = 0, updated_at = CURRENT_TIMESTAMP"
      );
      await run("COMMIT");

      await logAdminAction(req.adminId, "reset_duels", { votesDeleted, historyDeleted, facesReset }, "WARN");
      res.json({
        success: true,
        votesDeleted: votesDeleted.changes,
        duelHistoryDeleted: historyDeleted.changes,
        facesReset: facesReset.changes
      });
    } catch (e) {
      await run("ROLLBACK");
      throw e;
    }
  } catch (err) {
    console.error("admin_reset_duels_error", { adminId: req.adminId, message: err?.message });
    res.status(500).json({ error: "Error al resetear duelos" });
  }
});

export default router;
