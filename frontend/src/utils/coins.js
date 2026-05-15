const numberFormatter = new Intl.NumberFormat('ar-MA', {
  maximumFractionDigits: 2,
});

export const COIN_TO_DH_RATE = 0.1;

export const coinToDh = (coins = 0) => {
  return Number(coins || 0) * COIN_TO_DH_RATE;
};

export const formatCoins = (coins = 0) => {
  return numberFormatter.format(Math.round(Number(coins || 0)));
};

export const formatDhFromCoins = (coins = 0) => {
  return numberFormatter.format(coinToDh(coins));
};

export const formatCoinDh = (coins = 0) => {
  return `${formatCoins(coins)} كوين = ${formatDhFromCoins(coins)} DH`;
};
