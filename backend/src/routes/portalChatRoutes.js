const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const {
  clearPortalMessages,
  createPortalMessage,
  listPortalMessages,
  markAdminMessagesRead,
  uploadPortalMedia,
} = require('../controllers/portalChatController');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'portal-chat');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ]);
    const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov']);
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      cb(new Error('نوع الملف غير مدعوم'));
      return;
    }

    cb(null, true);
  },
});

router.get('/', listPortalMessages);
router.post('/messages', createPortalMessage);
router.post('/uploads', upload.single('media'), uploadPortalMedia);
router.post('/read', markAdminMessagesRead);
router.delete('/messages', clearPortalMessages);

module.exports = router;
