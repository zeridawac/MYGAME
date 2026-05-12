const express = require('express');
const {
  spinWheel,
  playScratch,
  playLuckyBox,
  claimDailyReward,
  getSpinHistory,
  getGameHistory,
  getGameSummary,
} = require('../controllers/gameController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/spin', protect, spinWheel);
router.post('/scratch', protect, playScratch);
router.post('/lucky-box', protect, playLuckyBox);
router.post('/daily-reward', protect, claimDailyReward);
router.get('/spins', protect, getSpinHistory);
router.get('/history', protect, getGameHistory);
router.get('/summary', protect, getGameSummary);

module.exports = router;
