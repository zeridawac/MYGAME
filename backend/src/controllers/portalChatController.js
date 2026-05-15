const fs = require('fs/promises');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const PortalChat = require('../models/PortalChat');

const ROOM_KEY = 'main';
const USER_CODE = 'الشتا كتصب';
const USER_CODE_SHORT = 'شتا كتصب';
const ADMIN_CODE = 'admin';
const MAX_MESSAGES = 500;
const UPLOAD_PUBLIC_BASE = '/uploads/portal-chat';
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'portal-chat');

const normalizeCode = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const getPortalRole = (req) => {
  const code = normalizeCode(req.get('x-portal-code') || req.body?.code || req.query?.code);

  if (code === USER_CODE || code === USER_CODE_SHORT) {
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
  imageUrl: message.imageUrl,
  imageName: message.imageName,
  imageMime: message.imageMime,
  imageSize: message.imageSize,
  readByUserAt: message.readByUserAt,
  createdAt: message.createdAt,
});

const removeUploadedImages = async (messages) => {
  const paths = messages
    .map((message) => message.imagePath)
    .filter(Boolean)
    .map((filePath) => path.resolve(filePath))
    .filter((filePath) => filePath.startsWith(path.resolve(UPLOAD_ROOT)));

  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`Failed to remove portal image: ${filePath}`);
        }
      }
    })
  );
};

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
  const image = req.body?.image || {};
  const imageUrl = String(image.url || '').trim();
  const hasImage = Boolean(imageUrl);

  if (!text && !hasImage) {
    res.status(400);
    throw new Error('الرسالة لا يمكن أن تكون فارغة');
  }

  if (text.length > 2000) {
    res.status(400);
    throw new Error('الرسالة طويلة جدا');
  }

  if (hasImage && !imageUrl.startsWith(`${UPLOAD_PUBLIC_BASE}/`)) {
    res.status(400);
    throw new Error('رابط الصورة غير صالح');
  }

  const imageFileName = hasImage ? path.basename(imageUrl) : '';

  const room = await getSharedRoom();
  room.messages.push({
    sender,
    text,
    imageUrl,
    imageName: String(image.name || '').slice(0, 180),
    imageMime: String(image.mimeType || '').slice(0, 80),
    imageSize: Number(image.size || 0),
    imagePath: hasImage ? path.join(UPLOAD_ROOT, imageFileName) : '',
    readByUserAt: null,
    createdAt: new Date(),
  });

  if (room.messages.length > MAX_MESSAGES) {
    await removeUploadedImages(room.messages.slice(0, room.messages.length - MAX_MESSAGES));
    room.messages = room.messages.slice(room.messages.length - MAX_MESSAGES);
  }

  await room.save();
  sendRoom(res, room);
});

const uploadPortalImage = asyncHandler(async (req, res) => {
  try {
    getPortalRole(req);
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    throw error;
  }

  if (!req.file) {
    res.status(400);
    throw new Error('يجب اختيار صورة');
  }

  res.status(201).json({
    success: true,
    image: {
      url: `${UPLOAD_PUBLIC_BASE}/${req.file.filename}`,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    },
  });
});

const markAdminMessagesRead = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'user') {
    res.status(403);
    throw new Error('تأكيد القراءة متاح للمستخدم فقط');
  }

  const room = await getSharedRoom();
  let changed = false;
  const now = new Date();

  room.messages.forEach((message) => {
    if (message.sender === 'admin' && !message.readByUserAt) {
      message.readByUserAt = now;
      changed = true;
    }
  });

  if (changed) {
    await room.save();
  }

  sendRoom(res, room);
});

const clearPortalMessages = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'admin') {
    res.status(403);
    throw new Error('حذف الرسائل متاح للأدمن فقط');
  }

  const room = await getSharedRoom();
  await removeUploadedImages(room.messages);
  room.messages = [];
  room.lastClearedAt = new Date();
  await room.save();

  sendRoom(res, room);
});

module.exports = {
  listPortalMessages,
  createPortalMessage,
  uploadPortalImage,
  markAdminMessagesRead,
  clearPortalMessages,
};
