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
  resetPortalCoins,
  rewardPortalMedia,
  uploadPortalMedia,
} = require('../controllers/portalChatController');

const router = express.Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'portal-chat');

fs.mkdirSync(uploadDir, { recursive: true });
console.log(`[portal-chat upload] directory ready: ${uploadDir}`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`[portal-chat upload] destination path: ${uploadDir}`);
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
    fileSize: 100 * 1024 * 1024,
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

const handleUpload = (req, res, next) => {
  upload.single('media')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400);
      next(new Error('حجم الفيديو كبير جداً، الحد الأقصى هو 100MB.'));
      return;
    }

    next(error);
  });
};

router.get('/', listPortalMessages);
router.post('/messages', createPortalMessage);
router.post('/uploads', handleUpload, uploadPortalMedia);
router.post('/read', markAdminMessagesRead);
router.post('/rewards', rewardPortalMedia);
router.post('/coins/reset', resetPortalCoins);
router.delete('/messages', clearPortalMessages);

module.exports = router;
