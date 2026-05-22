const express = require('express');
const {
  checkout,
  getProduct,
  listMyOrders,
  listProducts,
} = require('../controllers/storeController');
const { protect } = require('../middleware/auth');
const { getPlatformSettings } = require('../utils/settings');

const router = express.Router();

const storeEnabledOnly = async (req, res, next) => {
  try {
    if (req.user?.isAdmin) {
      return next();
    }

    const platform = await getPlatformSettings();
    if (platform.storeEnabled) {
      return next();
    }

    res.status(403);
    return next(new Error('المتجر غير متاح حالياً'));
  } catch (error) {
    return next(error);
  }
};

router.use(protect, storeEnabledOnly);

router.get('/products', listProducts);
router.get('/products/:id', getProduct);
router.get('/orders', listMyOrders);
router.post('/checkout', checkout);

module.exports = router;
