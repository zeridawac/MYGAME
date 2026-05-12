const presentUser = (user) => ({
  id: user._id,
  username: user.username,
  isAdmin: user.isAdmin,
  points: user.points,
  coins: user.coins,
  level: user.level,
  xp: user.xp,
  streak: user.streak,
  spinCount: user.spinCount,
  lastSpinDate: user.lastSpinDate,
  lastLoginDate: user.lastLoginDate,
  bankDetails: user.bankDetails || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

module.exports = presentUser;
