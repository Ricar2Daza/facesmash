import express from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { query, run, get } from "../db/index.js";
import { validateUploadPayload, validateImageFile } from "../validation/validators.js";
import { authenticateUser, authenticateUserOptional } from "./auth.js";
import { getUserVisibilityJoinAndCondition } from "../lib/accountFilters.js";

const router = express.Router();
const uploadDest = process.env.UPLOADS_DIR || path.join(process.cwd(), "src", "uploads");
const upload = multer({ dest: uploadDest });

router.get('/duel', authenticateUserOptional, async (req, res) => {
  const category = (req.query.category || 'AI').toUpperCase();
  const gender = req.query.gender; // 'male', 'female', or undefined (ALL)

  try {
    if (category !== 'AI' && category !== 'REAL') {
      return res.status(400).json({ error: 'Categoría inválida.' });
    }

    if (category === 'REAL') {
      if (!req.userId) {
        return res.status(401).json({ error: 'Debes iniciar sesión para acceder a duelos de personas registradas.' });
      }
      const user = await get('SELECT role, is_active, is_suspended, profile_completed FROM users WHERE id = ?', [req.userId]);
      if (!user || user.is_active !== 1 || user.is_suspended !== 0 || user.profile_completed !== 1) {
        return res.status(403).json({ error: 'Tu cuenta no cumple los requisitos para participar en duelos.' });
      }
    }

    const { join, condition } = getUserVisibilityJoinAndCondition('f');
    let sql = `
      SELECT f.id, f.type, f.image_path, f.display_name, f.elo_rating, f.gender
      FROM faces f
      ${join}
      WHERE f.is_public = 1 
        AND f.consent_revoked_at IS NULL
        AND ${condition}
    `;
    const params = [];

    sql += ` AND f.type = ?`;
    params.push(category);

    if (gender && ['male', 'female'].includes(gender)) {
      sql += ` AND f.gender = ?`;
      params.push(gender);
    }

    sql += ` ORDER BY RANDOM() LIMIT 2`;

    const rows = await query(sql, params);

    if (rows.length < 2) {
      return res.status(404).json({ error: 'No hay suficientes rostros disponibles para un duelo con estos filtros.' });
    }

    const faces = rows.map(f => ({
      id: f.id,
      type: f.type,
      imagePath: f.image_path,
      displayName: f.display_name,
      eloRating: f.elo_rating,
      gender: f.gender
    }));
    res.json({ faces });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

// POST /api/faces/upload
// Regla 2: Permitir carga solo a usuarios registrados
router.post(['/', '/upload'], authenticateUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Falta la imagen.' });
    }

    // Validar datos
    // Nota: validateUploadPayload necesita ser actualizado para chequear 'gender' si es necesario, 
    // o lo chequeamos aquí.
    const payloadValidation = validateUploadPayload(req.body);
    const fileValidation = validateImageFile(req.file);

    if (!payloadValidation.valid) {
      try { await fs.unlink(req.file.path); } catch(e) {}
      return res.status(400).json({ error: payloadValidation.errors.join(', ') });
    }
    if (!fileValidation.valid) {
      try { await fs.unlink(req.file.path); } catch(e) {}
      return res.status(400).json({ error: fileValidation.error });
    }

    const gender = req.body.gender;
    if (!gender || !['male', 'female'].includes(gender)) {
       try { await fs.unlink(req.file.path); } catch(e) {}
       return res.status(400).json({ error: 'Género inválido o faltante (male/female).' });
    }

    // Check Terms
    if (!req.body.acceptTerms && req.body.type === 'REAL') {
       try { await fs.unlink(req.file.path); } catch(e) {}
       return res.status(400).json({ error: 'Debes aceptar los términos y condiciones.' });
    }

    const metadata = await sharp(req.file.path).metadata();
    
    const revocationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(revocationToken).digest('hex');

    const result = await run(
      `INSERT INTO faces (
         type, image_path, display_name, gender, is_ai_generated, 
         uploader_id, consent_given, is_public, revocation_token_hash
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.type,
        `/uploads/${req.file.filename}`,
        req.body.displayName || null,
        gender,
        req.body.type === 'AI' ? 1 : 0,
        req.userId, // Authenticated User ID
        req.body.type === 'REAL' ? 1 : 0,
        1,
        tokenHash
      ]
    );

    res.status(201).json({
      success: true,
      face: {
        id: result.id,
        type: req.body.type,
        imagePath: `/uploads/${req.file.filename}`,
        displayName: req.body.displayName || null,
        gender: gender
      }
    });
  } catch (err) {
    console.error(err);
    // Limpiar archivo si falla
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch(e) {}
    }
    res.status(500).json({ error: 'Error al procesar la subida.' });
  }
});

// GET /api/faces/mine
router.get('/mine', authenticateUser, async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, type, image_path, display_name, elo_rating, gender, is_public, created_at 
      FROM faces 
      WHERE uploader_id = ? AND consent_revoked_at IS NULL
      ORDER BY created_at DESC
    `, [req.userId]);

    const faces = rows.map(f => ({
      id: f.id,
      type: f.type,
      imagePath: f.image_path,
      displayName: f.display_name,
      eloRating: f.elo_rating,
      gender: f.gender,
      isPublic: f.is_public,
      createdAt: f.created_at
    }));
    res.json({ faces });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

// DELETE /api/faces/:id (User deletes their own face)
router.delete('/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    const face = await query('SELECT uploader_id, image_path FROM faces WHERE id = ?', [id]);
    if (!face || face.length === 0) return res.status(404).json({ error: 'Rostro no encontrado' });
    
    if (face[0].uploader_id !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este rostro' });
    }

    // Soft delete usually, but user might want hard delete. Let's do soft delete for safety or consistency with revoke.
    // Or actually, if it's "My Photos", hard delete or setting is_public=0 is expected.
    // Let's set consent_revoked_at to now, effectively hiding it.
    await run('UPDATE faces SET consent_revoked_at = CURRENT_TIMESTAMP, is_public = 0 WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Rostro eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

export default router;
