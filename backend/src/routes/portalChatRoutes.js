const express = require('express');
const {
  clearPortalMessages,
  createPortalMessage,
  listPortalMessages,
} = require('../controllers/portalChatController');

const router = express.Router();

router.get('/', listPortalMessages);
router.post('/messages', createPortalMessage);
router.delete('/messages', clearPortalMessages);

module.exports = router;
