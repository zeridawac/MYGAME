const express = require('express');
const {
  listAssets,
  getPortfolio,
  buyAsset,
  sellAsset,
  spinInvest,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/assets', protect, listAssets);
router.get('/portfolio', protect, getPortfolio);
router.post('/buy', protect, buyAsset);
router.post('/sell', protect, sellAsset);
router.post('/spin-invest', protect, spinInvest);

module.exports = router;
