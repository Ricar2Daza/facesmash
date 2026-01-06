import express from 'express';
import { get, run } from '../db/index.js';

const router = express.Router();

// POST /api/reports
router.post('/', async (req, res) => {
  const { faceId, reason } = req.body;

  if (!faceId) {
    return res.status(400).json({ error: 'Falta ID del rostro.' });
  }

  try {
    // 1. Verificar si existe
    const face = await get('SELECT * FROM faces WHERE id = ?', [faceId]);
    if (!face) {
      return res.status(404).json({ error: 'Rostro no encontrado.' });
    }

    // 2. Insertar reporte
    await run(
      'INSERT INTO reports (face_id, reason) VALUES (?, ?)',
      [faceId, reason || null]
    );

    // 3. Incrementar contador y ocultar si supera límite
    // Nota: en SQLite no hay RETURNING en versiones viejas, hacemos en 2 pasos o 1 update
    await run(
      'UPDATE faces SET reports_count = reports_count + 1 WHERE id = ?',
      [faceId]
    );
    
    // Verificar si hay que ocultar (reports >= 5)
    // Podríamos hacerlo en el mismo UPDATE con CASE, pero simple es mejor
    const updatedFace = await get('SELECT reports_count FROM faces WHERE id = ?', [faceId]);
    
    let hidden = false;
    if (updatedFace.reports_count >= 5) {
      await run('UPDATE faces SET is_public = 0 WHERE id = ?', [faceId]);
      hidden = true;
    }

    res.json({ success: true, hidden });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reportar.' });
  }
});

export default router;
