import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary, type UploadApiOptions } from 'cloudinary';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { Readable } from 'stream';

const router = Router();

// ─── Configure Cloudinary from env vars ───────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key:    process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// ─── Multer — memory storage (no disk writes) ─────────────────────────────────
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});

// ─── Helper: upload a buffer to Cloudinary via a stream ───────────────────────
function uploadToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions
): Promise<{ secure_url: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
      resolve({ secure_url: result.secure_url });
    });
    Readable.from(buffer).pipe(stream);
  });
}

// ─── POST /api/v1/upload/image ────────────────────────────────────────────────
router.post('/image', authenticate, (req: AuthRequest, res) => {
  imageUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file received. Make sure the form field is named "file".' });

    try {
      const { secure_url } = await uploadToCloudinary(req.file.buffer, {
        folder: 'lexiflow/images',
        resource_type: 'image',
      });
      res.json({ url: secure_url });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  });
});

// ─── POST /api/v1/upload/audio ────────────────────────────────────────────────
router.post('/audio', authenticate, (req: AuthRequest, res) => {
  audioUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file received. Make sure the form field is named "file".' });

    try {
      const { secure_url } = await uploadToCloudinary(req.file.buffer, {
        folder: 'lexiflow/audio',
        resource_type: 'video', // Cloudinary uses "video" resource type for audio files
      });
      res.json({ url: secure_url });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  });
});

export default router;
