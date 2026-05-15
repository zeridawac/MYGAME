const fs = require('fs/promises');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');

const PORTAL_CHAT_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'portal-chat');
const PORTAL_CHAT_PUBLIC_BASE = '/uploads/portal-chat';

const ensureUploadDir = async () => {
  await fs.mkdir(PORTAL_CHAT_UPLOAD_DIR, { recursive: true });
};

const getSafeFilePath = (filename) => {
  const safeName = path.basename(String(filename || ''));

  if (!safeName || safeName !== filename) {
    const error = new Error('اسم الملف غير صالح');
    error.statusCode = 400;
    throw error;
  }

  const filePath = path.join(PORTAL_CHAT_UPLOAD_DIR, safeName);
  const rootPath = path.resolve(PORTAL_CHAT_UPLOAD_DIR);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(`${rootPath}${path.sep}`)) {
    const error = new Error('مسار الملف غير صالح');
    error.statusCode = 400;
    throw error;
  }

  return { filePath, safeName };
};

const getMediaType = (filename = '') => {
  const extension = path.extname(filename).toLowerCase();

  if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return 'image';
  }

  if (['.mp4', '.webm', '.mov'].includes(extension)) {
    return 'video';
  }

  return 'file';
};

const presentFile = (dirent, stats) => ({
  name: dirent.name,
  size: stats.size,
  uploadedAt: stats.birthtime || stats.mtime,
  modifiedAt: stats.mtime,
  type: getMediaType(dirent.name),
  url: `${PORTAL_CHAT_PUBLIC_BASE}/${encodeURIComponent(dirent.name)}`,
});

const listPortalChatUploads = asyncHandler(async (req, res) => {
  await ensureUploadDir();
  const entries = await fs.readdir(PORTAL_CHAT_UPLOAD_DIR, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const stats = await fs.stat(path.join(PORTAL_CHAT_UPLOAD_DIR, entry.name));
        return presentFile(entry, stats);
      })
  );

  files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  res.json({
    success: true,
    uploadDir: PORTAL_CHAT_UPLOAD_DIR,
    files,
  });
});

const deletePortalChatUpload = asyncHandler(async (req, res) => {
  await ensureUploadDir();
  const { filePath, safeName } = getSafeFilePath(req.params.filename);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404);
      throw new Error('الملف غير موجود');
    }

    throw error;
  }

  res.json({
    success: true,
    message: 'تم حذف الملف',
    filename: safeName,
  });
});

const deleteAllPortalChatUploads = asyncHandler(async (req, res) => {
  await ensureUploadDir();
  const entries = await fs.readdir(PORTAL_CHAT_UPLOAD_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());

  await Promise.all(files.map((entry) => fs.unlink(path.join(PORTAL_CHAT_UPLOAD_DIR, entry.name))));

  res.json({
    success: true,
    message: 'تم حذف جميع الملفات',
    deletedCount: files.length,
  });
});

module.exports = {
  PORTAL_CHAT_UPLOAD_DIR,
  deleteAllPortalChatUploads,
  deletePortalChatUpload,
  listPortalChatUploads,
};
