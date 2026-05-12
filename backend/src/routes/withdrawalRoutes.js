const express = require('express');
const {
  listMyWithdrawals,
  createWithdrawal,
} = require('../controllers/withdrawalController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listMyWithdrawals);
router.post('/', protect, createWithdrawal);

module.exports = router;
