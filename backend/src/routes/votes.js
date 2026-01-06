import express from 'express';
import crypto from 'crypto';
import { get, run } from '../db/index.js';
import { updateElo } from '../elo.js';
import { voteRateLimiter } from '../middleware/rateLimiter.js';
import { authenticateUserOptional } from './auth.js';

const router = express.Router();

// POST /api/votes
router.post('/', voteRateLimiter, authenticateUserOptional, async (req, res) => {
  const { faceAId, faceBId, winnerFaceId, isTie } = req.body;
  
  // Hash de IP simple para rate limiting y analítica básica
  const ip = req.ip || req.connection.remoteAddress;
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
  const userAgent = req.get('User-Agent') || 'Unknown';

  try {
    // 1. Obtener rostros
    const faceA = await get('SELECT * FROM faces WHERE id = ?', [faceAId]);
    const faceB = await get('SELECT * FROM faces WHERE id = ?', [faceBId]);

    if (!faceA || !faceB) {
      return res.status(404).json({ error: 'Rostros no encontrados.' });
    }

    const isAiOnly = faceA.type === 'AI' && faceB.type === 'AI';
    if (!req.userId && !isAiOnly) {
      return res.status(401).json({ error: 'Debes iniciar sesión para votar en duelos de personas registradas.' });
    }

    // 2. Calcular nuevos ELOs
    let resultA; // 1 gana A, 0 pierde A, 0.5 empate
    if (isTie) {
      resultA = 0.5;
    } else if (winnerFaceId == faceAId) {
      resultA = 1;
    } else {
      resultA = 0;
    }

    const { newRatingA, newRatingB } = updateElo(faceA.elo_rating, faceB.elo_rating, resultA);

    // 3. Guardar voto y actualizar ratings
    // Nota: En SQLite3 sin wrappers complejos, hacemos operaciones secuenciales.
    
    await run(
      `INSERT INTO votes (face_a_id, face_b_id, winner_face_id, is_tie, voter_ip_hash, user_agent, user_id, incident)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        faceAId,
        faceBId,
        isTie ? null : winnerFaceId,
        isTie ? 1 : 0,
        ipHash,
        userAgent.substring(0, 200),
        req.userId || null,
        null
      ]
    );

    // Actualizar Face A
    await run(
      `UPDATE faces 
       SET elo_rating = ?, 
           matches = matches + 1, 
           wins = wins + (CASE WHEN ? = 1 THEN 1 ELSE 0 END), 
           losses = losses + (CASE WHEN ? = 0 THEN 1 ELSE 0 END), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`, 
      [newRatingA, resultA, resultA, faceAId]
    );

    // Actualizar Face B
    // resultB es 1 - resultA (si no es empate) o 0.5 ambos.
    // Si resultA es 1, B pierde (0). Si resultA es 0, B gana (1). Si resultA es 0.5, empate.
    // Lógica wins/losses:
    // Si resultA=1 (A gana), B pierde -> wins=0, losses=1
    // Si resultA=0 (A pierde), B gana -> wins=1, losses=0
    // Si resultA=0.5 (Empate), B empata -> wins=0, losses=0
    
    let winB = 0;
    let lossB = 0;
    if (resultA === 0) winB = 1;
    if (resultA === 1) lossB = 1;

    await run(
      `UPDATE faces 
       SET elo_rating = ?, 
           matches = matches + 1, 
           wins = wins + ?, 
           losses = losses + ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`, 
      [newRatingB, winB, lossB, faceBId]
    );

    res.json({
      success: true,
      newRatings: {
        [faceAId]: newRatingA,
        [faceBId]: newRatingB
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar voto.' });
  }
});

export default router;
