const express = require('express');
const { listAnnouncements } = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listAnnouncements);

module.exports = router;
