import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { getUserVisibilityJoinAndCondition } from '../lib/accountFilters.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_dev_key_change_in_prod';

// GET /api/rankings
router.get('/', async (req, res) => {
  const category = req.query.category || 'IA'; // Default to IA per requirements (implied safe default)
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const search = req.query.search || '';
  const gender = req.query.gender;

  if (category === 'REAL' || category === 'ALL') {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Debes iniciar sesión para ver el ranking de personas reales.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: 'Sesión inválida o expirada.' });
    }
  }

  try {
    const { join, condition } = getUserVisibilityJoinAndCondition('f');
    let sql = `
       SELECT f.id, f.type, f.image_path, f.display_name, f.elo_rating, f.wins, f.losses, f.matches, f.gender
       FROM faces f
       ${join}
       WHERE f.is_public = 1 
         AND f.consent_revoked_at IS NULL
         AND ${condition}
    `;
    const params = [];

    // Filtros
    if (category !== 'ALL') {
      sql += ` AND f.type = ?`;
      params.push(category);
    }

    if (gender && ['male', 'female'].includes(gender)) {
      sql += ` AND f.gender = ?`;
      params.push(gender);
    }

    // Búsqueda
    if (search) {
      // Si es un número, asumimos búsqueda por posición (offset) si el usuario lo indica explícitamente en UI,
      // pero aquí "search" suele ser texto.
      // Si el usuario quiere "Posición X", el frontend debería mandar offset = X-1.
      // Si "search" es texto:
      sql += ` AND f.display_name LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY elo_rating DESC LIMIT ? OFFSET ?`;
    params.push(limit);
    params.push(offset);

    const rows = await query(sql, params);

    // Calcular posición absoluta si es necesario o devolver tal cual.
    // Como hay paginación, el frontend debe calcular el índice (offset + index + 1).
    
    const faces = rows.map(f => ({
      id: f.id,
      type: f.type,
      imagePath: f.image_path,
      displayName: f.display_name,
      eloRating: f.elo_rating,
      wins: f.wins || 0,
      losses: f.losses || 0,
      matches: f.matches || 0,
      gender: f.gender
    }));
    
    res.json({ faces });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener rankings.' });
  }
});

export default router;
