const fs = require('fs/promises');
const mongoose = require('mongoose');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const StoreOrder = require('../models/StoreOrder');
const StoreProduct = require('../models/StoreProduct');

const STORE_UPLOAD_BASE = '/uploads/store-products';
const STORE_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'store-products');
const TEMU_IMPORT_ERROR = 'تعذر جلب بيانات المنتج';
const TEMU_PRICE_ERROR = 'تعذر استخراج سعر المنتج';
const DH_TO_COINS = 10;
const MIN_PRODUCT_PRICE_DH = 5;

const starterProducts = [
  {
    title: 'سماعات بلوتوث برو',
    description: 'تصميم أنيق، صوت عميق، وعلبة شحن صغيرة مناسبة للاستخدام اليومي.',
    category: 'إلكترونيات',
    originalPrice: 5200,
    discountPercent: 30,
    finalPrice: 3640,
    stockQuantity: 18,
    featured: true,
  },
  {
    title: 'ساعة ذكية رياضية',
    description: 'شاشة واضحة، تتبع خطوات، وتنبيهات سريعة بواجهة عصرية.',
    category: 'إلكترونيات',
    originalPrice: 7400,
    discountPercent: 35,
    finalPrice: 4810,
    stockQuantity: 9,
    featured: true,
  },
  {
    title: 'حقيبة ظهر فاخرة',
    description: 'حقيبة خفيفة مع جيوب منظمة ولمسة داكنة تناسب التنقل اليومي.',
    category: 'إكسسوارات',
    originalPrice: 3600,
    discountPercent: 25,
    finalPrice: 2700,
    stockQuantity: 21,
  },
  {
    title: 'قسيمة منتجات رقمية',
    description: 'قسيمة داخلية للحصول على مزايا رقمية عند توفر العروض القادمة.',
    category: 'منتجات رقمية',
    originalPrice: 3000,
    discountPercent: 50,
    finalPrice: 1500,
    stockQuantity: 60,
    featured: true,
  },
  {
    title: 'نظارات شمسية سوداء',
    description: 'إطار خفيف وعدسات داكنة بتصميم عصري ومظهر قوي.',
    category: 'إكسسوارات',
    originalPrice: 2800,
    discountPercent: 20,
    finalPrice: 2240,
    stockQuantity: 14,
  },
  {
    title: 'هودي أسود Premium',
    description: 'قطعة مريحة بستايل داكن وناعم مناسبة لكل يوم.',
    category: 'ملابس',
    originalPrice: 4200,
    discountPercent: 30,
    finalPrice: 2940,
    stockQuantity: 12,
  },
  {
    title: 'يد تحكم ألعاب',
    description: 'تحكم مريح، أزرار سريعة، وتجربة لعب أكثر سلاسة.',
    category: 'ألعاب',
    originalPrice: 6100,
    discountPercent: 40,
    finalPrice: 3660,
    stockQuantity: 7,
  },
  {
    title: 'مصباح مكتب LED',
    description: 'إضاءة هادئة بدرجات متعددة ولمسة مكتبية أنيقة.',
    category: 'إلكترونيات',
    originalPrice: 2500,
    discountPercent: 30,
    finalPrice: 1750,
    stockQuantity: 25,
  },
];

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return normalizeNumber(value, null);
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const stripTemuTitle = (value = '') =>
  decodeHtml(value)
    .replace(/\s*[-|]\s*Temu.*$/i, '')
    .replace(/^Temu\s*[-|]\s*/i, '')
    .trim();

const sanitizeImageUrl = (url = '') => {
  const cleanUrl = decodeHtml(
    String(url).replace(/\\u002F/g, '/').replace(/\\u0026/g, '&').replace(/\\\//g, '/')
  ).trim();
  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const parseMetaValues = (html, keys) => {
  const values = [];
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      'gi'
    );
    let match = pattern.exec(html);
    while (match) {
      values.push(decodeHtml(match[1] || match[2] || ''));
      match = pattern.exec(html);
    }
  }

  return values;
};

const parseJsonSafely = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const walkJson = (value, visitor) => {
  if (!value || typeof value !== 'object') return;
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor));
    return;
  }
  Object.values(value).forEach((item) => walkJson(item, visitor));
};

const normalizePrice = (value) => {
  if (value === null || value === undefined) return 0;
  const match = String(value).replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  const parsed = Number(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractJsonLdProducts = (html) => {
  const products = [];
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = scriptPattern.exec(html);

  while (match) {
    const json = parseJsonSafely(decodeHtml(match[1]));
    walkJson(json, (node) => {
      const rawType = node['@type'];
      const types = Array.isArray(rawType) ? rawType : [rawType];
      if (types.some((type) => String(type).toLowerCase() === 'product')) {
        products.push(node);
      }
    });
    match = scriptPattern.exec(html);
  }

  return products;
};

const normalizeCurrency = (value = '') => {
  const token = String(value).trim().toUpperCase();
  if (['MAD', 'DH', 'DHS', 'د.م', 'درهم'].includes(token)) return 'MAD';
  if (['USD', '$', 'US$'].includes(token)) return 'USD';
  if (['EUR', '€'].includes(token)) return 'EUR';
  return token || 'MAD';
};

const currencyToDh = (currency) => {
  const normalized = normalizeCurrency(currency);
  if (normalized === 'USD') return 10;
  if (normalized === 'EUR') return 11;
  return 1;
};

const buildPriceCandidate = (amount, currency = 'MAD', kind = 'unknown', source = 'page') => {
  const parsedAmount = normalizePrice(amount);
  if (!parsedAmount || parsedAmount <= 0 || parsedAmount > 1000000) return null;
  const normalizedCurrency = normalizeCurrency(currency);
  const dhPrice = parsedAmount * currencyToDh(normalizedCurrency);
  if (dhPrice < MIN_PRODUCT_PRICE_DH) return null;

  return {
    amount: Number(parsedAmount.toFixed(2)),
    currency: normalizedCurrency,
    dhPrice: Number(dhPrice.toFixed(2)),
    kind,
    source,
  };
};

const collectPrice = (collection, amount, currency, kind, source) => {
  const candidate = buildPriceCandidate(amount, currency, kind, source);
  if (candidate) collection.push(candidate);
};

const shouldSkipPriceContext = (context = '') =>
  /shipping|delivery|coupon|voucher|tax|fee|threshold|minimum|ship|free|points|review|sold|rating|piece|qty/i.test(
    context
  );

const inferVisiblePriceKind = (context = '') => {
  if (/original|retail|list|was|before|market|strike|السعر\s*الأصلي|قبل|بدل|ancien|prix\s*initial/i.test(context)) {
    return 'original';
  }
  if (/sale|now|current|discount|deal|price|السعر|خصم|حاليا|maintenant|prix/i.test(context)) {
    return 'current';
  }
  return 'unknown';
};

const extractPriceCandidates = (html, jsonProduct) => {
  const candidates = [];
  const offer = Array.isArray(jsonProduct?.offers) ? jsonProduct.offers[0] : jsonProduct?.offers;
  const jsonCurrency = offer?.priceCurrency || jsonProduct?.priceCurrency || 'MAD';

  collectPrice(candidates, jsonProduct?.price, jsonCurrency, 'current', 'json-ld');
  collectPrice(candidates, offer?.price, jsonCurrency, 'current', 'json-ld');
  collectPrice(candidates, offer?.lowPrice, jsonCurrency, 'current', 'json-ld');
  collectPrice(candidates, offer?.highPrice, jsonCurrency, 'original', 'json-ld');

  const metaCurrency = parseMetaValues(html, ['product:price:currency', 'og:price:currency'])[0] || jsonCurrency;
  const metaPrice = parseMetaValues(html, ['product:price:amount', 'og:price:amount'])[0];
  collectPrice(candidates, metaPrice, metaCurrency, 'current', 'meta');

  const normalizedHtml = decodeHtml(html.replace(/\\u002F/g, '/').replace(/\\\//g, '/'));
  const keyPatterns = [
    {
      kind: 'current',
      pattern:
        /"(?:salePrice|salesPrice|currentPrice|discountPrice|finalPrice|price|priceAmount)"\s*:\s*(?:"[^"]*?([0-9]+(?:[.,][0-9]+)?)"|\{[^{}]{0,260}?(?:"amount"|"value"|"price")\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?[^{}]*\})/gi,
    },
    {
      kind: 'original',
      pattern:
        /"(?:originalPrice|retailPrice|marketPrice|listPrice|wasPrice|strikePrice|beforePrice)"\s*:\s*(?:"[^"]*?([0-9]+(?:[.,][0-9]+)?)"|\{[^{}]{0,260}?(?:"amount"|"value"|"price")\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?[^{}]*\})/gi,
    },
  ];

  keyPatterns.forEach(({ kind, pattern }) => {
    let match = pattern.exec(normalizedHtml);
    while (match) {
      const currencyWindow = normalizedHtml.slice(Math.max(0, match.index - 180), match.index + 260);
      const currencyMatch = currencyWindow.match(/"(?:currency|priceCurrency|currencyCode)"\s*:\s*"([A-Z$€]{1,5}|MAD|USD|EUR|DH)"/i);
      collectPrice(candidates, match[1] || match[2], currencyMatch?.[1] || metaCurrency, kind, 'embedded-json');
      match = pattern.exec(normalizedHtml);
    }
  });

  const visibleText = normalizedHtml.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const currencyBeforePattern = /(?:MAD|USD|EUR|DH|DHS|\$|€|درهم|د\.م)\s*([0-9]+(?:[.,][0-9]+)?)/gi;
  const currencyAfterPattern = /([0-9]+(?:[.,][0-9]+)?)\s*(?:MAD|USD|EUR|DH|DHS|\$|€|درهم|د\.م)/gi;

  let match = currencyBeforePattern.exec(visibleText);
  while (match) {
    const currency = match[0].replace(match[1], '').trim();
    const context = visibleText.slice(Math.max(0, match.index - 90), match.index + 120);
    if (!shouldSkipPriceContext(context)) {
      collectPrice(candidates, match[1], currency, inferVisiblePriceKind(context), 'visible-text');
    }
    match = currencyBeforePattern.exec(visibleText);
  }

  match = currencyAfterPattern.exec(visibleText);
  while (match) {
    const currency = match[0].replace(match[1], '').trim();
    const context = visibleText.slice(Math.max(0, match.index - 90), match.index + 120);
    if (!shouldSkipPriceContext(context)) {
      collectPrice(candidates, match[1], currency, inferVisiblePriceKind(context), 'visible-text');
    }
    match = currencyAfterPattern.exec(visibleText);
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}-${candidate.currency}-${candidate.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const extractDiscount = (html) => {
  const text = decodeHtml(html);
  const match =
    text.match(/-\s*(\d{1,2})\s*%/) ||
    text.match(/(\d{1,2})\s*%\s*(?:off|discount|خصم)/i) ||
    text.match(/خصم\s*(\d{1,2})\s*%/i);

  if (!match) return 0;
  const discount = Number(match[1]);
  return Number.isFinite(discount) ? Math.max(0, Math.min(95, discount)) : 0;
};

const extractImages = (html, jsonProduct) => {
  const jsonImages = Array.isArray(jsonProduct?.image) ? jsonProduct.image : [jsonProduct?.image];
  const metaImages = parseMetaValues(html, ['og:image', 'og:image:secure_url', 'twitter:image']);
  const normalizedHtml = decodeHtml(
    html
      .replace(/\\u002F/g, '/')
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/')
  );
  const urlMatches = normalizedHtml.match(/(?:https?:)?\/\/[^"'<>\\\s]+/gi) || [];
  const attributeMatches = [];
  const attributePattern = /(?:src|data-src|data-original|href|content)=["']([^"']+)["']/gi;
  let attributeMatch = attributePattern.exec(normalizedHtml);
  while (attributeMatch) {
    attributeMatches.push(attributeMatch[1]);
    attributeMatch = attributePattern.exec(normalizedHtml);
  }
  const jsonDiscovered = [];
  walkJson(jsonProduct, (node) => {
    Object.entries(node).forEach(([key, value]) => {
      if (!/image|img|thumb|gallery|pic|url/i.test(key)) return;
      if (typeof value === 'string') jsonDiscovered.push(value);
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') jsonDiscovered.push(item);
          if (item?.url) jsonDiscovered.push(item.url);
          if (item?.imageUrl) jsonDiscovered.push(item.imageUrl);
        });
      }
    });
  });

  const imageLike = [...jsonImages, ...jsonDiscovered, ...metaImages, ...attributeMatches, ...urlMatches]
    .map((url) => {
      const normalized = String(url || '').startsWith('//') ? `https:${url}` : url;
      return sanitizeImageUrl(normalized);
    })
    .filter((url) => {
      if (!url) return false;
      const lowered = url.toLowerCase();
      return (
        /\.(jpg|jpeg|png|webp)(?:$|\?)/i.test(lowered) ||
        lowered.includes('img.kwcdn.com') ||
        lowered.includes('image') ||
        lowered.includes('thumb') ||
        lowered.includes('gallery')
      );
    });

  const byBaseUrl = new Map();
  imageLike.forEach((url) => {
    const key = url.split('?')[0].replace(/_(?:100x100|200x200|300x300|400x400|thumbnail)/gi, '');
    if (!byBaseUrl.has(key)) byBaseUrl.set(key, url);
  });

  return [...byBaseUrl.values()].slice(0, 12);
};

const guessCategory = (title = '') => {
  const text = title.toLowerCase();
  if (/phone|earbud|headphone|watch|charger|led|camera|tablet|laptop|speaker|usb|سماعة|ساعة|هاتف|شاحن|مصباح/.test(text)) {
    return 'إلكترونيات';
  }
  if (/shirt|hoodie|dress|shoe|jacket|pants|ملابس|قميص|حذاء|هودي|جاكيت/.test(text)) {
    return 'ملابس';
  }
  if (/game|toy|controller|kids|لعبة|ألعاب|تحكم/.test(text)) {
    return 'ألعاب';
  }
  if (/bag|case|sunglasses|ring|necklace|watch band|حقيبة|نظارات|خاتم|إكسسوار/.test(text)) {
    return 'إكسسوارات';
  }
  return 'منتجات رقمية';
};

const stableNumber = (value, min, max) => {
  const seed = String(value || 'temu')
    .split('')
    .reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return min + (seed % (max - min + 1));
};

const parseRemoteImages = (value) => {
  const parsed = typeof value === 'string' ? parseJsonSafely(value) : value;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((image, index) => {
      const url = sanitizeImageUrl(typeof image === 'string' ? image : image?.url);
      if (!url) return null;
      return {
        url,
        path: '',
        name: String(image?.name || `temu-image-${index + 1}`).slice(0, 120),
        mimeType: String(image?.mimeType || 'external/image'),
        size: 0,
      };
    })
    .filter(Boolean)
    .slice(0, 10);
};

const assertTemuUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    const host = parsed.hostname.toLowerCase();
    const allowedHost =
      host === 'temu.com' ||
      host.endsWith('.temu.com') ||
      host === 'temu.to' ||
      host.endsWith('.temu.to') ||
      host === 'temuapp.com' ||
      host.endsWith('.temuapp.com');

    if (!['http:', 'https:'].includes(parsed.protocol) || !allowedHost) {
      throw new Error(TEMU_IMPORT_ERROR);
    }
    return parsed.toString();
  } catch {
    throw new Error(TEMU_IMPORT_ERROR);
  }
};

const fetchTemuHtml = async (url) => {
  if (typeof fetch !== 'function') {
    throw new Error(TEMU_IMPORT_ERROR);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ar,en-US;q=0.9,en;q=0.8',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(TEMU_IMPORT_ERROR);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const buildImportedProductPreview = (url, html) => {
  const [jsonProduct = {}] = extractJsonLdProducts(html);
  const title =
    stripTemuTitle(jsonProduct.name) ||
    stripTemuTitle(parseMetaValues(html, ['og:title', 'twitter:title'])[0]) ||
    stripTemuTitle((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const description =
    decodeHtml(jsonProduct.description) ||
    decodeHtml(parseMetaValues(html, ['og:description', 'description', 'twitter:description'])[0]) ||
    title;
  const images = extractImages(html, jsonProduct).map((imageUrl, index) => ({
    url: imageUrl,
    name: `temu-image-${index + 1}`,
    mimeType: 'external/image',
  }));
  const rating = normalizeNumber(jsonProduct.aggregateRating?.ratingValue, null);
  const prices = extractPriceCandidates(html, jsonProduct);
  const sourceRank = { 'visible-text': 0, meta: 1, 'json-ld': 2, 'embedded-json': 3 };
  const bySourceThenPrice = (a, b) => (sourceRank[a.source] ?? 9) - (sourceRank[b.source] ?? 9) || a.dhPrice - b.dhPrice;
  const visibleUnknownCandidates = prices
    .filter((candidate) => candidate.kind === 'unknown' && candidate.source === 'visible-text')
    .sort((a, b) => a.dhPrice - b.dhPrice);
  const currentCandidates = prices
    .filter((candidate) => candidate.kind === 'current')
    .sort(bySourceThenPrice);
  const unknownCandidates = prices
    .filter((candidate) => candidate.kind === 'unknown')
    .sort((a, b) => a.dhPrice - b.dhPrice);
  const currentCandidate =
    visibleUnknownCandidates.length >= 2 ? visibleUnknownCandidates[0] : currentCandidates[0] || unknownCandidates[0];
  const originalCandidates = prices
    .filter((candidate) => candidate.kind === 'original')
    .sort((a, b) => b.dhPrice - a.dhPrice);
  const visibleOriginalCandidate =
    visibleUnknownCandidates.length >= 2 && currentCandidate
      ? visibleUnknownCandidates.filter((candidate) => candidate.dhPrice > currentCandidate.dhPrice).pop()
      : null;
  const originalCandidate =
    originalCandidates.find((candidate) => currentCandidate && candidate.dhPrice > currentCandidate.dhPrice) ||
    visibleOriginalCandidate ||
    (unknownCandidates.length > 1 && currentCandidate
      ? unknownCandidates.filter((candidate) => candidate.dhPrice > currentCandidate.dhPrice).pop()
      : null);
  const currentPriceDh = currentCandidate?.dhPrice || 0;
  const originalPriceDh = originalCandidate?.dhPrice || currentPriceDh;
  if (!currentCandidate || currentPriceDh <= 0) {
    throw new Error(TEMU_PRICE_ERROR);
  }
  const finalPrice = Math.round(currentPriceDh * DH_TO_COINS);
  const originalPrice = Math.max(finalPrice, Math.round(originalPriceDh * DH_TO_COINS));
  const discountPercent =
    originalPrice > finalPrice ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;

  if (!title || !images.length) {
    throw new Error(TEMU_IMPORT_ERROR);
  }

  const detectedDiscount = extractDiscount(html);
  const stockQuantity = stableNumber(`${title}-${url}`, 6, 24);
  const promoBadge = discountPercent >= 45 ? 'عرض محدود' : discountPercent >= 30 ? 'خصم قوي' : 'وصل حديثا';

  return {
    title,
    description,
    category: guessCategory(title),
    originalPrice,
    discountPercent: Math.max(0, Math.min(95, discountPercent)),
    finalPrice,
    stockQuantity,
    featured: discountPercent >= 30,
    active: true,
    rating: rating && rating >= 0 && rating <= 5 ? Number(rating.toFixed(1)) : null,
    promoBadge,
    sourceUrl: url,
    sourceProvider: 'temu',
    sourceCurrency: currentCandidate?.currency || 'MAD',
    sourcePriceAmount: currentCandidate?.amount || null,
    sourcePriceDh: Number(currentPriceDh.toFixed(2)),
    sourceOriginalPriceAmount: originalCandidate?.amount || null,
    sourceOriginalPriceDh: originalCandidate ? Number(originalPriceDh.toFixed(2)) : null,
    detectedDiscount,
    images,
  };
};

const presentProduct = (product) => ({
  id: product._id.toString(),
  _id: product._id,
  title: product.title,
  description: product.description,
  category: product.category,
  originalPrice: product.originalPrice,
  discountPercent: product.discountPercent,
  finalPrice: product.finalPrice,
  stockQuantity: product.stockQuantity,
  rating: product.rating,
  promoBadge: product.promoBadge,
  sourceUrl: product.sourceUrl,
  sourceProvider: product.sourceProvider,
  sourceCurrency: product.sourceCurrency,
  sourcePriceAmount: product.sourcePriceAmount,
  sourcePriceDh: product.sourcePriceDh,
  sourceOriginalPriceAmount: product.sourceOriginalPriceAmount,
  sourceOriginalPriceDh: product.sourceOriginalPriceDh,
  featured: product.featured,
  active: product.active,
  images: product.images || [],
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const presentOrder = (order) => ({
  id: order._id.toString(),
  _id: order._id,
  user: order.user,
  items: order.items,
  totalCoins: order.totalCoins,
  status: order.status,
  createdAt: order.createdAt,
});

const ensureStarterProducts = async () => {
  const count = await StoreProduct.countDocuments();
  if (count > 0) return;

  await StoreProduct.insertMany(starterProducts);
};

const buildImagesFromFiles = (files = []) =>
  files.map((file) => ({
    url: `${STORE_UPLOAD_BASE}/${file.filename}`,
    path: file.path,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

const removeProductFiles = async (product) => {
  const files = (product.images || [])
    .map((image) => image.path)
    .filter(Boolean)
    .map((filePath) => path.resolve(filePath))
    .filter((filePath) => filePath.startsWith(path.resolve(STORE_UPLOAD_ROOT)));

  await Promise.all(
    files.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`Failed to delete store image: ${filePath}`);
        }
      }
    })
  );
};

const listProducts = asyncHandler(async (req, res) => {
  await ensureStarterProducts();

  const category = String(req.query.category || '').trim();
  const query = { active: true };
  if (category) query.category = category;

  const products = await StoreProduct.find(query).sort({ featured: -1, createdAt: -1 });
  const categories = await StoreProduct.distinct('category', { active: true });

  res.json({
    success: true,
    products: products.map(presentProduct),
    categories,
  });
});

const getProduct = asyncHandler(async (req, res) => {
  await ensureStarterProducts();

  if (!isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  const product = await StoreProduct.findOne({ _id: req.params.id, active: true });
  if (!product) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  const related = await StoreProduct.find({
    _id: { $ne: product._id },
    active: true,
    category: product.category,
  })
    .sort({ featured: -1, createdAt: -1 })
    .limit(6);

  res.json({
    success: true,
    product: presentProduct(product),
    related: related.map(presentProduct),
  });
});

const checkout = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) {
    res.status(400);
    throw new Error('السلة فارغة');
  }

  const normalizedItems = items
    .map((item) => ({
      productId: String(item.productId || item.id || '').trim(),
      quantity: Math.max(1, Math.min(20, Math.floor(Number(item.quantity || 1)))),
    }))
    .filter((item) => item.productId);

  if (!normalizedItems.length || normalizedItems.some((item) => !isValidObjectId(item.productId))) {
    res.status(400);
    throw new Error('السلة فارغة');
  }

  const products = await StoreProduct.find({
    _id: { $in: normalizedItems.map((item) => item.productId) },
    active: true,
  });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const orderItems = [];

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400);
      throw new Error('أحد المنتجات لم يعد متاحا');
    }

    if (product.stockQuantity < item.quantity) {
      res.status(400);
      throw new Error(`الكمية غير متوفرة: ${product.title}`);
    }

    orderItems.push({
      product,
      quantity: item.quantity,
      unitPrice: product.finalPrice,
      totalPrice: product.finalPrice * item.quantity,
    });
  }

  const totalCoins = orderItems.reduce((total, item) => total + item.totalPrice, 0);

  if (req.user.coins < totalCoins) {
    res.status(400);
    throw new Error('رصيد الكوينات غير كاف');
  }

  req.user.coins -= totalCoins;

  for (const item of orderItems) {
    item.product.stockQuantity -= item.quantity;
    await item.product.save();
  }

  await req.user.save();

  const order = await StoreOrder.create({
    user: req.user._id,
    totalCoins,
    items: orderItems.map((item) => ({
      product: item.product._id,
      title: item.product.title,
      imageUrl: item.product.images?.[0]?.url || '',
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
    })),
  });

  res.status(201).json({
    success: true,
    message: 'تم تسجيل طلبك بنجاح، وسيتم التوصل بالمنتجات فور فتح الموقع بشكل كامل',
    order: presentOrder(order),
    user: presentUser(req.user),
  });
});

const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await StoreOrder.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);

  res.json({
    success: true,
    orders: orders.map(presentOrder),
  });
});

const adminListProducts = asyncHandler(async (req, res) => {
  await ensureStarterProducts();
  const products = await StoreProduct.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    products: products.map(presentProduct),
  });
});

const adminPreviewProductImport = asyncHandler(async (req, res) => {
  try {
    const sourceUrl = assertTemuUrl(req.body.url);
    const html = await fetchTemuHtml(sourceUrl);
    const product = buildImportedProductPreview(sourceUrl, html);

    res.json({
      success: true,
      message: 'تم جلب معاينة المنتج',
      product,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message === TEMU_PRICE_ERROR ? TEMU_PRICE_ERROR : TEMU_IMPORT_ERROR);
  }
});

const adminCreateProduct = asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || 'منتجات رقمية').trim();
  const originalPrice = normalizeNumber(req.body.originalPrice);
  const discountPercent = Math.max(0, Math.min(95, normalizeNumber(req.body.discountPercent)));
  const finalPrice = normalizeNumber(req.body.finalPrice);
  const stockQuantity = Math.max(0, Math.floor(normalizeNumber(req.body.stockQuantity)));
  const remoteImages = parseRemoteImages(req.body.remoteImages);
  const uploadedImages = buildImagesFromFiles(req.files);

  if (!title || !Number.isFinite(originalPrice) || originalPrice <= 0 || !Number.isFinite(finalPrice) || finalPrice <= 0) {
    res.status(400);
    throw new Error('بيانات المنتج غير مكتملة');
  }

  const product = await StoreProduct.create({
    title,
    description,
    category,
    originalPrice,
    discountPercent,
    finalPrice,
    stockQuantity,
    rating: normalizeOptionalNumber(req.body.rating),
    promoBadge: String(req.body.promoBadge || '').trim(),
    sourceUrl: String(req.body.sourceUrl || '').trim(),
    sourceProvider: String(req.body.sourceProvider || '').trim(),
    sourceCurrency: String(req.body.sourceCurrency || '').trim(),
    sourcePriceAmount: normalizeOptionalNumber(req.body.sourcePriceAmount),
    sourcePriceDh: normalizeOptionalNumber(req.body.sourcePriceDh),
    sourceOriginalPriceAmount: normalizeOptionalNumber(req.body.sourceOriginalPriceAmount),
    sourceOriginalPriceDh: normalizeOptionalNumber(req.body.sourceOriginalPriceDh),
    featured: req.body.featured === 'true' || req.body.featured === true,
    active: req.body.active !== 'false' && req.body.active !== false,
    images: [...remoteImages, ...uploadedImages].slice(0, 10),
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء المنتج',
    product: presentProduct(product),
  });
});

const adminUpdateProduct = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  const product = await StoreProduct.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  if (req.body.title !== undefined) product.title = String(req.body.title).trim();
  if (req.body.description !== undefined) product.description = String(req.body.description).trim();
  if (req.body.category !== undefined) product.category = String(req.body.category).trim();
  if (req.body.originalPrice !== undefined) {
    const nextOriginalPrice = normalizeNumber(req.body.originalPrice, product.originalPrice);
    if (!Number.isFinite(nextOriginalPrice) || nextOriginalPrice <= 0) {
      res.status(400);
      throw new Error('بيانات المنتج غير مكتملة');
    }
    product.originalPrice = nextOriginalPrice;
  }
  if (req.body.discountPercent !== undefined) {
    product.discountPercent = Math.max(0, Math.min(95, normalizeNumber(req.body.discountPercent, product.discountPercent)));
  }
  if (req.body.finalPrice !== undefined) {
    const nextFinalPrice = normalizeNumber(req.body.finalPrice, product.finalPrice);
    if (!Number.isFinite(nextFinalPrice) || nextFinalPrice <= 0) {
      res.status(400);
      throw new Error('بيانات المنتج غير مكتملة');
    }
    product.finalPrice = nextFinalPrice;
  }
  if (req.body.stockQuantity !== undefined) product.stockQuantity = Math.max(0, Math.floor(normalizeNumber(req.body.stockQuantity, product.stockQuantity)));
  if (req.body.rating !== undefined) product.rating = normalizeOptionalNumber(req.body.rating);
  if (req.body.promoBadge !== undefined) product.promoBadge = String(req.body.promoBadge).trim();
  if (req.body.sourceUrl !== undefined) product.sourceUrl = String(req.body.sourceUrl).trim();
  if (req.body.sourceProvider !== undefined) product.sourceProvider = String(req.body.sourceProvider).trim();
  if (req.body.sourceCurrency !== undefined) product.sourceCurrency = String(req.body.sourceCurrency).trim();
  if (req.body.sourcePriceAmount !== undefined) product.sourcePriceAmount = normalizeOptionalNumber(req.body.sourcePriceAmount);
  if (req.body.sourcePriceDh !== undefined) product.sourcePriceDh = normalizeOptionalNumber(req.body.sourcePriceDh);
  if (req.body.sourceOriginalPriceAmount !== undefined) product.sourceOriginalPriceAmount = normalizeOptionalNumber(req.body.sourceOriginalPriceAmount);
  if (req.body.sourceOriginalPriceDh !== undefined) product.sourceOriginalPriceDh = normalizeOptionalNumber(req.body.sourceOriginalPriceDh);
  if (req.body.featured !== undefined) product.featured = req.body.featured === 'true' || req.body.featured === true;
  if (req.body.active !== undefined) product.active = req.body.active === 'true' || req.body.active === true;

  const newImages = [...parseRemoteImages(req.body.remoteImages), ...buildImagesFromFiles(req.files)];
  if (newImages.length) {
    product.images = [...product.images, ...newImages].slice(0, 10);
  }

  await product.save();

  res.json({
    success: true,
    message: 'تم تحديث المنتج',
    product: presentProduct(product),
  });
});

const adminDeleteProduct = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  const product = await StoreProduct.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  await removeProductFiles(product);
  await product.deleteOne();

  res.json({
    success: true,
    message: 'تم حذف المنتج',
  });
});

const adminListOrders = asyncHandler(async (req, res) => {
  const orders = await StoreOrder.find()
    .populate('user', 'username coins')
    .sort({ createdAt: -1 })
    .limit(80);

  res.json({
    success: true,
    orders: orders.map(presentOrder),
  });
});

module.exports = {
  adminCreateProduct,
  adminDeleteProduct,
  adminListOrders,
  adminListProducts,
  adminPreviewProductImport,
  adminUpdateProduct,
  checkout,
  getProduct,
  listMyOrders,
  listProducts,
};
