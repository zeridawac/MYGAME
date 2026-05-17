const palette = [
  ['#20d4a6', '#15231f'],
  ['#f7c948', '#251d08'],
  ['#70a7ff', '#101b30'],
  ['#ff6b8a', '#2a0f18'],
  ['#b08cff', '#1b1430'],
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const resolveStoreAssetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};

export const productImageUrl = (product, index = 0) => {
  const image = product?.images?.[index] || product?.images?.[0];
  const directUrl = image?.url || product?.imageUrl || product?.url;
  if (directUrl) return resolveStoreAssetUrl(directUrl);

  const seed = String(product?.title || 'REDA')
    .split('')
    .reduce((total, letter) => total + letter.charCodeAt(0), 0);
  const [accent, bg] = palette[seed % palette.length];
  const title = String(product?.title || 'REDA').slice(0, 32);
  const category = String(product?.category || 'STORE').slice(0, 24);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <radialGradient id="g" cx="32%" cy="22%" r="72%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.92"/>
          <stop offset="58%" stop-color="${bg}" stop-opacity="1"/>
          <stop offset="100%" stop-color="#070b11" stop-opacity="1"/>
        </radialGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
      </defs>
      <rect width="900" height="900" rx="58" fill="url(#g)"/>
      <circle cx="700" cy="170" r="160" fill="${accent}" opacity="0.18" filter="url(#blur)"/>
      <circle cx="190" cy="740" r="210" fill="#ffffff" opacity="0.07" filter="url(#blur)"/>
      <rect x="144" y="160" width="612" height="520" rx="42" fill="#ffffff" opacity="0.08" stroke="#ffffff" stroke-opacity="0.14"/>
      <path d="M250 605 L450 250 L650 605 Z" fill="${accent}" opacity="0.28"/>
      <circle cx="450" cy="424" r="96" fill="#ffffff" opacity="0.14"/>
      <text x="450" y="735" fill="#f8fbff" font-family="Arial, sans-serif" font-size="46" font-weight="800" text-anchor="middle">${title}</text>
      <text x="450" y="792" fill="#d5deea" font-family="Arial, sans-serif" font-size="28" text-anchor="middle">${category}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
