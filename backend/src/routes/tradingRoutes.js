const express = require('express');
const { getMarket, getTrades, openTrade } = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/market', protect, getMarket);
router.get('/trades', protect, getTrades);
router.post('/trades', protect, openTrade);

module.exports = router;
