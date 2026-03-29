import express from 'express';
import crypto from 'crypto';
import { get, run } from '../db/index.js';
import { updateElo } from '../elo.js';
import { voteRateLimiter } from '../middleware/rateLimiter.js';
import { authenticateUser } from './auth.js';
import { getUserVisibilityJoinAndCondition } from '../lib/accountFilters.js';

const router = express.Router();

// POST /api/votes
router.post('/', voteRateLimiter, authenticateUser, async (req, res) => {
  const { faceAId, faceBId, winnerFaceId, isTie } = req.body;
  
  // Hash de IP simple para rate limiting y analítica básica
  const ip = req.ip || req.connection.remoteAddress;
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
  const userAgent = req.get('User-Agent') || 'Unknown';

  try {
    const aId = Number(faceAId);
    const bId = Number(faceBId);
    const wId = winnerFaceId === undefined || winnerFaceId === null ? null : Number(winnerFaceId);

    if (!Number.isInteger(aId) || !Number.isInteger(bId)) {
      return res.status(400).json({ error: 'IDs inválidos.' });
    }
    if (aId === bId) {
      return res.status(400).json({ error: 'Un duelo requiere dos rostros distintos.' });
    }
    if (isTie && wId !== null) {
      return res.status(400).json({ error: 'Empate no puede incluir winnerFaceId.' });
    }
    if (!isTie && (wId === null || (wId !== aId && wId !== bId))) {
      return res.status(400).json({ error: 'winnerFaceId inválido.' });
    }

    const { join, condition } = getUserVisibilityJoinAndCondition('f');
    const faceA = await get(
      `
        SELECT f.*
        FROM faces f
        ${join}
        WHERE f.id = ?
          AND f.is_public = 1
          AND f.consent_revoked_at IS NULL
          AND ${condition}
      `,
      [aId]
    );
    const faceB = await get(
      `
        SELECT f.*
        FROM faces f
        ${join}
        WHERE f.id = ?
          AND f.is_public = 1
          AND f.consent_revoked_at IS NULL
          AND ${condition}
      `,
      [bId]
    );

    if (!faceA || !faceB) {
      return res.status(404).json({ error: 'Rostros no encontrados.' });
    }

    if (faceA.type !== faceB.type) {
      return res.status(400).json({ error: 'Los duelos deben ser entre rostros del mismo tipo.' });
    }

    if (faceA.type === 'REAL') {
      if (faceA.consent_given !== 1 || faceB.consent_given !== 1) {
        return res.status(403).json({ error: 'Uno o más rostros no tienen consentimiento válido.' });
      }
    }

    // 2. Calcular nuevos ELOs
    let resultA; // 1 gana A, 0 pierde A, 0.5 empate
    if (isTie) {
      resultA = 0.5;
    } else if (wId == aId) {
      resultA = 1;
    } else {
      resultA = 0;
    }

    const { newRatingA, newRatingB } = updateElo(faceA.elo_rating, faceB.elo_rating, resultA);

    // 3. Guardar voto y actualizar ratings
    // Nota: En SQLite3 sin wrappers complejos, hacemos operaciones secuenciales.
    
    await run('BEGIN IMMEDIATE');
    try {
      await run(
        `INSERT INTO votes (face_a_id, face_b_id, winner_face_id, is_tie, voter_ip_hash, user_agent, user_id, incident)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          aId,
          bId,
          isTie ? null : wId,
          isTie ? 1 : 0,
          ipHash,
          userAgent.substring(0, 200),
          req.userId,
          null
        ]
      );

      await run(
        `UPDATE faces 
         SET elo_rating = ?, 
             matches = matches + 1, 
             wins = wins + (CASE WHEN ? = 1 THEN 1 ELSE 0 END), 
             losses = losses + (CASE WHEN ? = 0 THEN 1 ELSE 0 END), 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`, 
        [newRatingA, resultA, resultA, aId]
      );

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
        [newRatingB, winB, lossB, bId]
      );

      await run('COMMIT');
    } catch (e) {
      await run('ROLLBACK');
      throw e;
    }

    res.json({
      success: true,
      newRatings: {
        [aId]: newRatingA,
        [bId]: newRatingB
      }
    });

  } catch (err) {
    console.error('votes_error', { userId: req.userId, faceAId, faceBId, winnerFaceId, isTie, message: err?.message });
    res.status(500).json({ error: 'Error al registrar voto.' });
  }
});

export default router;
