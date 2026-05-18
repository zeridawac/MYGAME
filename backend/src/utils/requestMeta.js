const getRequestIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwardedFor || req.socket?.remoteAddress || req.ip || '';
};

const timezoneToLocation = (timezone = '') => {
  const cleanTimezone = String(timezone || '').trim();
  const known = {
    'Africa/Casablanca': { country: 'Morocco', city: 'Casablanca' },
  };

  if (known[cleanTimezone]) return known[cleanTimezone];

  const parts = cleanTimezone.split('/');
  return {
    country: parts[0] || '',
    city: (parts[1] || '').replace(/_/g, ' '),
  };
};

const normalizeLocationPayload = (payload = {}) => {
  const timezone = String(payload.timezone || '').trim();
  const guessed = timezoneToLocation(timezone);
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  return {
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    accuracy: Number.isFinite(Number(payload.accuracy)) ? Number(payload.accuracy) : null,
    permission: String(payload.permission || (hasCoordinates ? 'granted' : 'unavailable')).trim(),
    unavailable: !hasCoordinates,
    country: String(payload.country || guessed.country || '').trim(),
    city: String(payload.city || guessed.city || '').trim(),
    timezone,
    updatedAt: new Date(),
  };
};

module.exports = {
  getRequestIp,
  normalizeLocationPayload,
};
