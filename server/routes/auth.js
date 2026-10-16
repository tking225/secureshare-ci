import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'true',
  maxAge: 7 * 24 * 3600 * 1000
};

function sign(user) {
  return jwt.sign(
    { uid: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Champs manquants.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    const lower = email.toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(lower);
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const info = db
      .prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
      .run(lower, hash, String(name).trim().slice(0, 80), Date.now());

    const user = {
      id: info.lastInsertRowid,
      email: lower,
      name: String(name).trim(),
      role: 'member'
    };

    res.cookie('token', sign(user), COOKIE_OPTS);
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Champs manquants.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    res.cookie('token', sign(user), COOKIE_OPTS);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    const user = db
      .prepare('SELECT id, email, name, role FROM users WHERE id = ?')
      .get(payload.uid);

    if (!user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Session expirée.' });
  }
});

export { SECRET };
export default router;