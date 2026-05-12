const defaultAssets = [
  {
    symbol: 'RDA',
    name: 'Reda Growth Coin',
    nameAr: 'عملة رضا للنمو',
    price: 42,
    changePercent: 1.8,
    description: 'عملة نمو افتراضية للمحافظ المتوازنة.',
  },
  {
    symbol: 'ATLAS',
    name: 'Atlas Energy',
    nameAr: 'أطلس للطاقة',
    price: 75,
    changePercent: -0.7,
    description: 'أصل افتراضي يحاكي قطاع الطاقة والبنية التحتية.',
  },
  {
    symbol: 'SAHARA',
    name: 'Sahara Tech',
    nameAr: 'الصحراء للتقنية',
    price: 118,
    changePercent: 2.3,
    description: 'أصل تقني افتراضي عالي التذبذب.',
  },
  {
    symbol: 'NOUR',
    name: 'Nour Reserve',
    nameAr: 'نور الاحتياطي',
    price: 24,
    changePercent: 0.4,
    description: 'أصل دفاعي افتراضي بحركة سعرية هادئة.',
  },
];

const defaultGameConfigs = [
  {
    gameKey: 'spin',
    nameAr: 'عجلة الحظ',
    dailyLimit: 2,
    active: true,
    rewards: [
      { label: 'ربح ذهبي', coins: 120, points: 20, xp: 35, weight: 2 },
      { label: 'دفعة نقاط', coins: 40, points: 65, xp: 25, weight: 3 },
      { label: 'خبرة مضاعفة', coins: 25, points: 15, xp: 80, weight: 2 },
      { label: 'مكافأة سريعة', coins: 75, points: 30, xp: 30, weight: 3 },
      { label: 'حظ المستثمر', coins: 180, points: 45, xp: 45, weight: 1 },
      { label: 'جولة هادئة', coins: 15, points: 10, xp: 15, weight: 4 },
    ],
  },
  {
    gameKey: 'scratch',
    nameAr: 'بطاقة الحظ',
    dailyLimit: 3,
    active: true,
    rewards: [
      { label: 'بطاقة فضية', coins: 35, points: 20, xp: 15, weight: 4 },
      { label: 'بطاقة ذهبية', coins: 90, points: 35, xp: 30, weight: 2 },
      { label: 'بطاقة ممتازة', coins: 160, points: 55, xp: 45, weight: 1 },
    ],
  },
  {
    gameKey: 'luckyBox',
    nameAr: 'صندوق الحظ',
    dailyLimit: 3,
    active: true,
    rewards: [
      { label: 'صندوق صغير', coins: 25, points: 15, xp: 10, weight: 5 },
      { label: 'صندوق نادر', coins: 100, points: 40, xp: 25, weight: 2 },
      { label: 'صندوق فاخر', coins: 220, points: 70, xp: 55, weight: 1 },
    ],
  },
  {
    gameKey: 'dailyReward',
    nameAr: 'المكافأة اليومية',
    dailyLimit: 1,
    active: true,
    rewards: [
      { label: 'هدية الدخول اليومي', coins: 80, points: 40, xp: 30, weight: 1 },
    ],
  },
];

module.exports = {
  defaultAssets,
  defaultGameConfigs,
};
