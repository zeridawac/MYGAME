const asyncHandler = require('../utils/asyncHandler');
const Announcement = require('../models/Announcement');

const listAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    success: true,
    announcements,
  });
});

module.exports = {
  listAnnouncements,
};
