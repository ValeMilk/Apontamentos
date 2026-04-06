import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const UPLOAD_DIR = '/app/uploads/atestados';

// Ensure directory exists at startup
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (_) {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

export const uploadAtestado = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF.'));
    }
  },
});
