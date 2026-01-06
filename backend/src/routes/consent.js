import express from 'express';
import crypto from 'crypto';
import { run } from '../db/index.js';

const router = express.Router();

// POST /api/consent/revoke
router.post('/revoke', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Falta el token.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await run(
      `UPDATE faces 
       SET is_public = 0, consent_revoked_at = CURRENT_TIMESTAMP 
       WHERE revocation_token_hash = ? AND consent_revoked_at IS NULL`,
      [tokenHash]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Token inválido o ya revocado.' });
    }

    res.json({ success: true, message: 'Consentimiento revocado. El rostro ya no será público.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

export default router;
