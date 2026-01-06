import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { get, run } from '../db/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_dev_key_change_in_prod';

// Middleware de autenticación de usuario
export const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    req.username = payload.username;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const authenticateUserOptional = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    req.username = payload.username;
  } catch (err) {
  }
  next();
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, captcha } = req.body;

  if (!username || !email || !password || !captcha) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Simple CAPTCHA validation (3 + 4 = 7)
  if (parseInt(captcha) !== 7) {
    return res.status(400).json({ error: 'Captcha incorrecto' });
  }

  try {
    const existingUser = await get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Usuario o email ya registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
      [username, email, hash]
    );

    const token = jwt.sign({ id: result.id, username }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ success: true, token, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, rememberMe } = req.body;

  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const nowIso = new Date().toISOString();
    await run('UPDATE users SET last_login_at = ? WHERE id = ?', [nowIso, user.id]);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn });
    res.json({ success: true, token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/auth/me (Verificar token)
router.get('/me', authenticateUser, async (req, res) => {
  res.json({ success: true, user: { id: req.userId, username: req.username } });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const user = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'Si el email existe, recibirás un enlace de recuperación.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    await run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);

    // In a real app, send email here.
    // For now, we return it in the response for debugging/development ease
    console.log(`Reset token for ${email}: ${token}`);
    res.json({ success: true, message: 'Si el email existe, recibirás un enlace de recuperación.', debug_token: token }); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });

  try {
    const user = await get('SELECT id, reset_token_expires FROM users WHERE reset_token = ?', [token]);
    
    if (!user || user.reset_token_expires < Date.now()) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

export default router;
