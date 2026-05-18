const express = require('express');
const { register, login, me, updateLocation } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/location', protect, updateLocation);

module.exports = router;
