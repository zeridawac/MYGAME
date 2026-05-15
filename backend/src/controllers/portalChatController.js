const asyncHandler = require('../utils/asyncHandler');
const PortalChat = require('../models/PortalChat');

const ROOM_KEY = 'main';
const USER_CODE = 'الشتا كتصب';
const ADMIN_CODE = 'admin';
const MAX_MESSAGES = 500;

const normalizeCode = (value) => String(value || '').trim();

const getPortalRole = (req) => {
  const code = normalizeCode(req.get('x-portal-code') || req.body?.code || req.query?.code);

  if (code === USER_CODE) {
    return 'user';
  }

  if (code.toLowerCase() === ADMIN_CODE) {
    return 'admin';
  }

  const error = new Error('الكود السري غير صحيح');
  error.statusCode = 401;
  throw error;
};

const presentMessage = (message) => ({
  id: message._id.toString(),
  sender: message.sender,
  text: message.text,
  createdAt: message.createdAt,
});

const getSharedRoom = async () => {
  return PortalChat.findOneAndUpdate(
    { roomKey: ROOM_KEY },
    { $setOnInsert: { roomKey: ROOM_KEY, messages: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const sendRoom = (res, room) => {
  res.json({
    success: true,
    roomKey: ROOM_KEY,
    messages: room.messages.map(presentMessage),
    updatedAt: room.updatedAt,
    lastClearedAt: room.lastClearedAt,
  });
};

const listPortalMessages = asyncHandler(async (req, res) => {
  getPortalRole(req);
  const room = await getSharedRoom();
  sendRoom(res, room);
});

const createPortalMessage = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);
  const text = String(req.body?.text || '').trim();

  if (!text) {
    res.status(400);
    throw new Error('الرسالة لا يمكن أن تكون فارغة');
  }

  if (text.length > 2000) {
    res.status(400);
    throw new Error('الرسالة طويلة جدا');
  }

  const room = await getSharedRoom();
  room.messages.push({
    sender,
    text,
    createdAt: new Date(),
  });

  if (room.messages.length > MAX_MESSAGES) {
    room.messages = room.messages.slice(room.messages.length - MAX_MESSAGES);
  }

  await room.save();
  sendRoom(res, room);
});

const clearPortalMessages = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'admin') {
    res.status(403);
    throw new Error('حذف الرسائل متاح للأدمن فقط');
  }

  const room = await getSharedRoom();
  room.messages = [];
  room.lastClearedAt = new Date();
  await room.save();

  sendRoom(res, room);
});

module.exports = {
  listPortalMessages,
  createPortalMessage,
  clearPortalMessages,
};
