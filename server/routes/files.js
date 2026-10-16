import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE = 25 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 10);
    cb(null, `${nanoid(16)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: MAX_SIZE } });

function logAction(userId, action, target, ip) {
  db.prepare(
    'INSERT INTO audit_log (user_id, action, target, ip, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId ?? null, action, target ?? null, ip ?? null, Date.now());
}

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const { password, expiresIn, maxDownloads } = req.body || {};
    const id = nanoid(12);

    const hours = Number(expiresIn) || 0;
    const expiresAt = hours > 0 ? Date.now() + hours * 3600 * 1000 : null;

    const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
    const maxDl = Number(maxDownloads) > 0 ? Number(maxDownloads) : null;

    db.prepare(`
      INSERT INTO files
        (id, owner_id, original_name, stored_name, size, mime, expires_at, password_hash, max_downloads, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.uid,
      req.file.originalname,
      req.file.filename,
      req.file.size,
      req.file.mimetype,
      expiresAt,
      passwordHash,
      maxDl,
      Date.now()
    );

    logAction(req.user.uid, 'upload', id, req.ip);
    res.json({ id, url: `/d/${id}` });
  } catch (e) {
    next(e);
  }
});

router.get('/', requireAuth, (req, res) => {
  const files = db.prepare(`
    SELECT id, original_name, size, mime, expires_at, downloads, max_downloads, created_at,
           (password_hash IS NOT NULL) AS protected
    FROM files
    WHERE owner_id = ?
    ORDER BY created_at DESC
  `).all(req.user.uid);

  res.json({ files });
});

router.delete('/:id', requireAuth, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?')
    .get(req.params.id, req.user.uid);

  if (!file) {
    return res.status(404).json({ error: 'Fichier introuvable.' });
  }

  fs.unlink(path.join(UPLOAD_DIR, file.stored_name), () => {});
  db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  logAction(req.user.uid, 'delete', file.id, req.ip);
  res.json({ ok: true });
});

router.get('/meta/:id', (req, res) => {
  const file = db.prepare(`
    SELECT id, original_name, size, mime, expires_at,
           (password_hash IS NOT NULL) AS protected
    FROM files
    WHERE id = ?
  `).get(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'Lien invalide.' });
  }
  if (file.expires_at && file.expires_at < Date.now()) {
    return res.status(410).json({ error: 'Ce lien a expiré.' });
  }

  res.json({ file });
});

router.post('/download/:id', async (req, res, next) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

    if (!file) {
      return res.status(404).json({ error: 'Lien invalide.' });
    }
    if (file.expires_at && file.expires_at < Date.now()) {
      return res.status(410).json({ error: 'Ce lien a expiré.' });
    }
    if (file.max_downloads && file.downloads >= file.max_downloads) {
      return res.status(410).json({ error: 'Nombre de téléchargements atteint.' });
    }

    if (file.password_hash) {
      const { password } = req.body || {};
      if (!password) {
        return res.status(401).json({ error: 'Mot de passe requis.' });
      }
      const ok = await bcrypt.compare(String(password), file.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Mot de passe incorrect.' });
      }
    }

    db.prepare('UPDATE files SET downloads = downloads + 1 WHERE id = ?').run(file.id);
    logAction(null, 'download', file.id, req.ip);

    res.download(path.join(UPLOAD_DIR, file.stored_name), file.original_name);
  } catch (e) {
    next(e);
  }
});

export default router;