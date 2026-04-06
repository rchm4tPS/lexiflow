import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ─── Resolve upload directories relative to the project root ─────────────────
// __dirname = backend/src/routes at runtime (tsx runs source directly)
// ../../uploads  →  backend/uploads
const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
const IMAGES_DIR = path.join(UPLOADS_ROOT, 'images');
const AUDIO_DIR  = path.join(UPLOADS_ROOT, 'audio');

// Ensure directories exist at startup
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR,  { recursive: true });

console.log('[upload] images dir →', IMAGES_DIR);
console.log('[upload] audio  dir →', AUDIO_DIR);

// ─── Multer config — images ───────────────────────────────────────────────────
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── Multer config — audio ────────────────────────────────────────────────────
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});

// ─── POST /api/upload/image ───────────────────────────────────────────────────
router.post('/image', authenticate, (req: AuthRequest, res) => {
  imageUpload.single('file')(req, res, (err) => {
    if (err) {
      // Multer errors (wrong type, size exceeded, etc.)
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file received. Make sure the form field is named "file".' });
    }
    const url = `/uploads/images/${req.file.filename}`;
    res.json({ url });
  });
});

// ─── POST /api/upload/audio ───────────────────────────────────────────────────
router.post('/audio', authenticate, (req: AuthRequest, res) => {
  audioUpload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file received. Make sure the form field is named "file".' });
    }
    const url = `/uploads/audio/${req.file.filename}`;
    res.json({ url });
  });
});

export default router;
