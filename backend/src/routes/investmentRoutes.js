const express = require('express');
const {
  listAssets,
  getPortfolio,
  buyAsset,
  sellAsset,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/assets', protect, listAssets);
router.get('/portfolio', protect, getPortfolio);
router.post('/buy', protect, buyAsset);
router.post('/sell', protect, sellAsset);

module.exports = router;
