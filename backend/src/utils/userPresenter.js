const hasVerifiedLocation = (user) => {
  const location = user.lastKnownLocation || {};
  return (
    !location.unavailable &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude))
  );
};

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
  locationVerified: hasVerifiedLocation(user),
  bankDetails: user.bankDetails || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

module.exports = presentUser;
