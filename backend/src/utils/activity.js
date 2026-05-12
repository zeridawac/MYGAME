const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ user, type, title, coins = 0, points = 0, xp = 0, metadata = {} }) => {
  if (!user || !type || !title) return null;

  return ActivityLog.create({
    user,
    type,
    title,
    coins,
    points,
    xp,
    metadata,
  });
};

module.exports = {
  logActivity,
};
