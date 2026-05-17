const express = require('express');
const {
  checkout,
  getProduct,
  listMyOrders,
  listProducts,
} = require('../controllers/storeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/products', protect, listProducts);
router.get('/products/:id', protect, getProduct);
router.get('/orders', protect, listMyOrders);
router.post('/checkout', protect, checkout);

module.exports = router;
