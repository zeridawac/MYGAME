const express = require('express');
const { listTasks, submitTask } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listTasks);
router.post('/:id/submit', protect, submitTask);

module.exports = router;
