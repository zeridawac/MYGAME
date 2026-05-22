const fs = require('fs/promises');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const PortalChat = require('../models/PortalChat');
const User = require('../models/User');

const ROOM_KEY = 'main';
const USER_CODE = 'الشتا كتصب';
const USER_CODE_SHORT = 'شتا كتصب';
const ADMIN_CODE = 'admin';
const DEFAULT_COIN_BALANCE = 500;
const MAX_MESSAGES = 500;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const UPLOAD_PUBLIC_BASE = '/uploads/portal-chat';
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'portal-chat');
const MEDIA_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/webm': 'audio',
  'audio/ogg': 'audio',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/wav': 'audio',
  'audio/x-wav': 'audio',
};

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
  mediaUrl: message.mediaUrl || message.imageUrl,
  mediaName: message.mediaName || message.imageName,
  mediaMime: message.mediaMime || message.imageMime,
  mediaSize: message.mediaSize || message.imageSize,
  mediaType: message.mediaType || (message.imageUrl ? 'image' : ''),
  rewardCoins: message.rewardCoins,
  readByUserAt: message.readByUserAt,
  createdAt: message.createdAt,
});

const presentReward = (reward) => ({
  id: reward._id.toString(),
  messageId: reward.messageId?.toString() || null,
  mediaType: reward.mediaType,
  coins: reward.coins,
  createdAt: reward.createdAt,
});

const getMediaType = (mimeType = '', fallbackUrl = '') => {
  if (MEDIA_TYPES[mimeType]) {
    return MEDIA_TYPES[mimeType];
  }

  const extension = path.extname(fallbackUrl).toLowerCase();

  if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return 'image';
  }

  if (['.mp4', '.webm', '.mov'].includes(extension)) {
    return 'video';
  }

  if (['.ogg', '.mp3', '.m4a', '.wav'].includes(extension)) {
    return 'audio';
  }

  return '';
};

const removeUploadedMedia = async (messages) => {
  const paths = messages
    .flatMap((message) => [message.mediaPath, message.imagePath])
    .filter(Boolean)
    .map((filePath) => path.resolve(filePath))
    .filter((filePath) => filePath.startsWith(path.resolve(UPLOAD_ROOT)));

  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`Failed to remove portal media: ${filePath}`);
        }
      }
    })
  );
};

const ensureCoinFields = (room) => {
  let changed = false;

  if (typeof room.coinBalance !== 'number') {
    room.coinBalance = DEFAULT_COIN_BALANCE;
    changed = true;
  }

  if (!Array.isArray(room.rewardHistory)) {
    room.rewardHistory = [];
    changed = true;
  }

  return changed;
};

const getSharedRoom = async () => {
  const room = await PortalChat.findOneAndUpdate(
    { roomKey: ROOM_KEY },
    { $setOnInsert: { roomKey: ROOM_KEY, messages: [], coinBalance: DEFAULT_COIN_BALANCE, rewardHistory: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (ensureCoinFields(room)) {
    await room.save();
  }

  return room;
};

const sendRoom = (res, room) => {
  ensureCoinFields(room);

  res.json({
    success: true,
    roomKey: ROOM_KEY,
    messages: room.messages.map(presentMessage),
    coinBalance: room.coinBalance,
    rewardHistory: room.rewardHistory.map(presentReward),
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
  const media = req.body?.media || req.body?.image || {};
  const mediaUrl = String(media.url || '').trim();
  const hasMedia = Boolean(mediaUrl);
  const mediaMime = String(media.mimeType || '').slice(0, 80);
  const mediaType = getMediaType(mediaMime, mediaUrl);

  if (!text && !hasMedia) {
    res.status(400);
    throw new Error('الرسالة لا يمكن أن تكون فارغة');
  }

  if (text.length > 2000) {
    res.status(400);
    throw new Error('الرسالة طويلة جدا');
  }

  if (hasMedia && !mediaUrl.startsWith(`${UPLOAD_PUBLIC_BASE}/`)) {
    res.status(400);
    throw new Error('رابط الوسائط غير صالح');
  }

  if (hasMedia && !mediaType) {
    res.status(400);
    throw new Error('نوع الوسائط غير مدعوم');
  }

  const mediaFileName = hasMedia ? path.basename(mediaUrl) : '';
  const mediaPath = hasMedia ? path.join(UPLOAD_ROOT, mediaFileName) : '';

  const room = await getSharedRoom();
  room.messages.push({
    sender,
    text,
    imageUrl: mediaType === 'image' ? mediaUrl : '',
    imageName: mediaType === 'image' ? String(media.name || '').slice(0, 180) : '',
    imageMime: mediaType === 'image' ? mediaMime : '',
    imageSize: mediaType === 'image' ? Number(media.size || 0) : 0,
    imagePath: mediaType === 'image' ? mediaPath : '',
    mediaUrl,
    mediaName: String(media.name || '').slice(0, 180),
    mediaMime,
    mediaSize: Number(media.size || 0),
    mediaPath,
    mediaType,
    readByUserAt: null,
    createdAt: new Date(),
  });

  if (room.messages.length > MAX_MESSAGES) {
    await removeUploadedMedia(room.messages.slice(0, room.messages.length - MAX_MESSAGES));
    room.messages = room.messages.slice(room.messages.length - MAX_MESSAGES);
  }

  await room.save();
  sendRoom(res, room);
});

const uploadPortalMedia = asyncHandler(async (req, res) => {
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
    throw new Error('يجب اختيار صورة أو فيديو');
  }

  const mediaType = getMediaType(req.file.mimetype, req.file.filename);

  if (!mediaType) {
    await fs.unlink(req.file.path).catch(() => {});
    res.status(400);
    throw new Error('نوع الوسائط غير مدعوم');
  }

  if (mediaType === 'image' && req.file.size > MAX_IMAGE_SIZE) {
    await fs.unlink(req.file.path).catch(() => {});
    res.status(400);
    throw new Error('حجم الصورة كبير جداً، الحد الأقصى هو 10MB.');
  }

  if (mediaType === 'video' && req.file.size > MAX_VIDEO_SIZE) {
    await fs.unlink(req.file.path).catch(() => {});
    res.status(400);
    throw new Error('حجم الفيديو كبير جداً، الحد الأقصى هو 100MB.');
  }

  if (mediaType === 'audio' && req.file.size > MAX_AUDIO_SIZE) {
    await fs.unlink(req.file.path).catch(() => {});
    res.status(400);
    throw new Error('حجم الرسالة الصوتية كبير جداً، الحد الأقصى هو 25MB.');
  }

  console.log('[portal-chat upload] stored file:', {
    destination: req.file.destination,
    path: req.file.path,
    filename: req.file.filename,
    publicUrl: `${UPLOAD_PUBLIC_BASE}/${req.file.filename}`,
  });

  res.status(201).json({
    success: true,
    media: {
      url: `${UPLOAD_PUBLIC_BASE}/${req.file.filename}`,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      type: mediaType,
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

const rewardPortalMedia = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'admin') {
    res.status(403);
    throw new Error('منح الكوينات متاح للأدمن فقط');
  }

  const messageId = String(req.body?.messageId || '').trim();
  const coins = Number(req.body?.coins);

  if (!messageId) {
    res.status(400);
    throw new Error('يجب اختيار رسالة الوسائط');
  }

  if (!Number.isInteger(coins) || coins <= 0) {
    res.status(400);
    throw new Error('أدخل عدد كوينات صحيح أكبر من صفر');
  }

  if (coins > 1000000) {
    res.status(400);
    throw new Error('عدد الكوينات كبير جداً');
  }

  const room = await getSharedRoom();
  ensureCoinFields(room);

  const targetMessage = room.messages.id(messageId);

  if (!targetMessage || !targetMessage.mediaUrl) {
    res.status(404);
    throw new Error('رسالة الوسائط غير موجودة');
  }

  const mediaType = targetMessage.mediaType || getMediaType(targetMessage.mediaMime, targetMessage.mediaUrl);

  if (!['image', 'video'].includes(mediaType)) {
    res.status(400);
    throw new Error('هذه الرسالة لا تحتوي على وسائط قابلة للإعجاب');
  }

  room.coinBalance += coins;
  room.rewardHistory.push({
    messageId: targetMessage._id,
    mediaType,
    coins,
    createdAt: new Date(),
  });

  room.messages.push({
    sender: 'system',
    text: mediaType === 'video'
      ? `الأدمن أعجب بالفيديو وقد حصلت على ${coins} كوين`
      : `الأدمن أعجب بالصورة وقد حصلت على ${coins} كوين`,
    rewardCoins: coins,
    createdAt: new Date(),
  });

  if (room.messages.length > MAX_MESSAGES) {
    await removeUploadedMedia(room.messages.slice(0, room.messages.length - MAX_MESSAGES));
    room.messages = room.messages.slice(room.messages.length - MAX_MESSAGES);
  }

  await room.save();
  sendRoom(res, room);
});

const resetPortalCoins = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'admin') {
    res.status(403);
    throw new Error('إعادة ضبط الكوينات متاحة للأدمن فقط');
  }

  const nextBalance = req.body?.coinBalance === undefined ? DEFAULT_COIN_BALANCE : Number(req.body.coinBalance);

  if (!Number.isFinite(nextBalance) || nextBalance < 0) {
    res.status(400);
    throw new Error('أدخل رصيد كوينات صحيح وغير سالب');
  }

  const room = await getSharedRoom();
  room.coinBalance = nextBalance;
  room.rewardHistory = [];
  await room.save();

  sendRoom(res, room);
});

const transferPortalCoinsToUser = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'user') {
    res.status(403);
    throw new Error('تحويل الكوينات متاح للمستخدم فقط');
  }

  const targetUser = await User.findOne({ username: 'imane' });

  if (!targetUser) {
    res.status(404);
    throw new Error('تعذر العثور على الحساب');
  }

  await getSharedRoom();

  const roomBeforeTransfer = await PortalChat.findOneAndUpdate(
    { roomKey: ROOM_KEY, coinBalance: { $gt: 0 } },
    { $set: { coinBalance: 0 } },
    { new: false }
  );

  if (!roomBeforeTransfer) {
    const room = await getSharedRoom();
    sendRoom(res, room);
    return;
  }

  const transferredCoins = Math.max(0, Number(roomBeforeTransfer.coinBalance || 0));

  if (transferredCoins > 0) {
    try {
      const updateResult = await User.updateOne({ _id: targetUser._id }, { $inc: { coins: transferredCoins } });

      if (updateResult.matchedCount !== 1) {
        await PortalChat.updateOne({ roomKey: ROOM_KEY }, { $inc: { coinBalance: transferredCoins } });
        res.status(404);
        throw new Error('تعذر العثور على الحساب');
      }
    } catch (error) {
      if (!res.statusCode || res.statusCode < 400) {
        await PortalChat.updateOne({ roomKey: ROOM_KEY }, { $inc: { coinBalance: transferredCoins } });
      }
      throw error;
    }
  }

  const room = await getSharedRoom();
  sendRoom(res, room);
});

const clearPortalMessages = asyncHandler(async (req, res) => {
  const sender = getPortalRole(req);

  if (sender !== 'admin') {
    res.status(403);
    throw new Error('حذف الرسائل متاح للأدمن فقط');
  }

  const room = await getSharedRoom();
  await removeUploadedMedia(room.messages);
  room.messages = [];
  room.lastClearedAt = new Date();
  await room.save();

  sendRoom(res, room);
});

module.exports = {
  listPortalMessages,
  createPortalMessage,
  uploadPortalMedia,
  markAdminMessagesRead,
  rewardPortalMedia,
  resetPortalCoins,
  transferPortalCoinsToUser,
  clearPortalMessages,
};
