const express = require('express');
const { getPublicSettings } = require('../controllers/settingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getPublicSettings);

module.exports = router;
