const express = require('express');
const { redeemCoupon, listMyRedemptions } = require('../controllers/couponController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/redeem', protect, redeemCoupon);
router.get('/redemptions', protect, listMyRedemptions);

module.exports = router;
