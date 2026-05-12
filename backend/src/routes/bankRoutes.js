const express = require('express');
const { getBankDetails, saveBankDetails } = require('../controllers/bankController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getBankDetails);
router.put('/', protect, saveBankDetails);

module.exports = router;
