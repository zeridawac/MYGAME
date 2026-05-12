const dateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

const isSameUtcDay = (dateA, dateB = new Date()) => {
  if (!dateA || !dateB) return false;
  return dateKey(dateA) === dateKey(dateB);
};

const isYesterdayUtc = (value, now = new Date()) => {
  if (!value) return false;

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  return dateKey(value) === dateKey(yesterday);
};

const startOfUtcDay = (value = new Date()) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

module.exports = {
  dateKey,
  isSameUtcDay,
  isYesterdayUtc,
  startOfUtcDay,
};
