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
  uploadPortalImage,
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
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      cb(new Error('يجب رفع صورة فقط'));
      return;
    }

    cb(null, true);
  },
});

router.get('/', listPortalMessages);
router.post('/messages', createPortalMessage);
router.post('/uploads', upload.single('image'), uploadPortalImage);
router.post('/read', markAdminMessagesRead);
router.delete('/messages', clearPortalMessages);

module.exports = router;
