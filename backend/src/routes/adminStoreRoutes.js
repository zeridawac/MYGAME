const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const {
  adminCreateProduct,
  adminDeleteProduct,
  adminListOrders,
  adminListProducts,
  adminPreviewProductImport,
  adminUpdateProduct,
} = require('../controllers/storeController');
const { adminOnly, protect } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'store-products');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      cb(new Error('نوع الصورة غير مدعوم'));
      return;
    }

    cb(null, true);
  },
});

const handleImages = (req, res, next) => {
  upload.array('images', 8)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400);
      next(new Error('حجم الصورة كبير، الحد الأقصى هو 10MB.'));
      return;
    }

    next(error);
  });
};

router.use(protect, adminOnly);

router.post('/products/import-preview', adminPreviewProductImport);
router.get('/products', adminListProducts);
router.post('/products', handleImages, adminCreateProduct);
router.patch('/products/:id', handleImages, adminUpdateProduct);
router.delete('/products/:id', adminDeleteProduct);
router.get('/orders', adminListOrders);

module.exports = router;
