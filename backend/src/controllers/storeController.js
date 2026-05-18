const fs = require('fs/promises');
const crypto = require('crypto');
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
const MIN_IMPORT_REALISTIC_PRICE_DH = 20;
const DEFAULT_IMPORT_DISCOUNT = 30;
const MAX_RELIABLE_IMPORT_DISCOUNT = 50;
const MIN_PRODUCT_IMAGE_BYTES = 6 * 1024;
const MAX_PRODUCT_IMAGE_BYTES = 12 * 1024 * 1024;
const MIN_PRODUCT_IMAGE_DIMENSION = 180;

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

const defaultClothingSizes = ['S', 'M', 'L', 'XL', 'XXL'];

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'نعم'].includes(String(value).trim().toLowerCase());
};

const normalizeSizes = (value) => {
  let rawSizes = value;
  if (typeof value === 'string') {
    try {
      rawSizes = JSON.parse(value);
    } catch {
      rawSizes = value.split(',');
    }
  }

  if (!Array.isArray(rawSizes)) return [];

  const seen = new Set();
  return rawSizes
    .map((size) => String(size || '').trim())
    .filter(Boolean)
    .map((size) => size.slice(0, 18))
    .filter((size) => {
      const key = size.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 16);
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

const decodeEscapedText = (value = '') =>
  decodeHtml(
    String(value)
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\\//g, '/')
      .replace(/\\n|\\r|\\t/g, ' ')
  );

const stripTags = (value = '') => decodeEscapedText(value).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');

const normalizePrice = (value, divisor = 1) => {
  if (value === null || value === undefined) return 0;
  const match = decodeEscapedText(value).match(/(\d[\d\s.,']*)/);
  if (!match) return 0;

  let clean = match[1].replace(/[\s']/g, '');
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    clean = lastComma > lastDot ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const parts = clean.split(',');
    clean = parts.at(-1)?.length === 3 ? clean.replace(/,/g, '') : clean.replace(',', '.');
  } else if (lastDot !== -1) {
    const parts = clean.split('.');
    clean = parts.at(-1)?.length === 3 && parts.length <= 2 ? clean.replace(/\./g, '') : clean;
  }

  const parsed = Number(clean);
  const normalized = Number.isFinite(parsed) ? parsed / divisor : 0;
  return Number.isFinite(normalized) ? normalized : 0;
};

const compactImportDebug = (debug = {}) => ({
  success: Boolean(debug.success),
  failureReason: debug.failureReason || '',
  parserSourceUsed: debug.parserSourceUsed || '',
  rawExtractedPrice: debug.rawExtractedPrice || null,
  rawExtractedOriginalPrice: debug.rawExtractedOriginalPrice || null,
  importDiscountRule: debug.importDiscountRule || '',
  selectorsTried: (debug.selectorsTried || []).slice(0, 20),
  parserSources: (debug.parserSources || []).slice(0, 20),
  detectedPrices: (debug.detectedPrices || []).slice(0, 60),
  imageValidation: (debug.imageValidation || []).slice(0, 20),
  selected: debug.selected || null,
  rawImagesFound: debug.rawImagesFound || 0,
  imagesFound: debug.imagesFound || 0,
});

const createImportDebug = (url) => ({
  url,
  success: false,
  failureReason: '',
  parserSourceUsed: '',
  rawExtractedPrice: null,
  rawExtractedOriginalPrice: null,
  importDiscountRule: '',
  selectorsTried: [],
  parserSources: [],
  detectedPrices: [],
  imageValidation: [],
  selected: null,
  rawImagesFound: 0,
  imagesFound: 0,
});

const logTemuImportDebug = (debug, label = 'Temu import debug') => {
  try {
    console.error(`[${label}]`, JSON.stringify(compactImportDebug(debug), null, 2));
  } catch {
    console.error(`[${label}]`, debug?.failureReason || 'Unknown import failure');
  }
};

const createTemuImportError = (message, debug, failureReason = message) => {
  debug.failureReason = failureReason;
  debug.success = false;
  logTemuImportDebug(debug, 'Temu import failure');
  const error = new Error(message);
  error.debug = compactImportDebug(debug);
  return error;
};

const extractScriptSources = (html, debug) => {
  const sources = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match = scriptPattern.exec(html);
  let index = 0;

  while (match) {
    index += 1;
    const attrs = match[1] || '';
    const content = match[2] || '';
    const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1] || '';
    const type = (attrs.match(/\btype=["']([^"']+)["']/i) || [])[1] || '';
    const lowered = `${id} ${type} ${content.slice(0, 120)}`.toLowerCase();
    let source = `script-${index}`;

    if (id === '__NEXT_DATA__' || lowered.includes('__next_data__')) source = '__NEXT_DATA__';
    else if (lowered.includes('nuxt')) source = 'window.NUXT';
    else if (lowered.includes('hydration') || lowered.includes('__initial') || lowered.includes('__apollo')) source = 'hydration-state';
    else if (type.includes('ld+json')) source = 'json-ld';
    else if (type.includes('json')) source = 'json-script';

    const text = decodeEscapedText(content);
    const json = parseJsonSafely(decodeHtml(content).trim()) || parseJsonSafely(text.trim());
    sources.push({ source, attrs, text, json });
    match = scriptPattern.exec(html);
  }

  if (debug) {
    debug.parserSources.push(
      ...sources
        .filter((item) => item.source !== 'script-1' || item.json || /price|product|temu|goods|sku/i.test(item.text))
        .map((item) => ({
          source: item.source,
          parsedJson: Boolean(item.json),
          length: item.text.length,
        }))
        .slice(0, 20)
    );
  }

  return sources;
};

const extractJsonLdProducts = (html, scriptSources = []) => {
  const products = [];
  const jsonLdSources = scriptSources.length
    ? scriptSources.filter((item) => item.source === 'json-ld')
    : extractScriptSources(html).filter((item) => item.source === 'json-ld');

  jsonLdSources.forEach((source) => {
    const json = source.json || parseJsonSafely(source.text);
    walkJson(json, (node) => {
      const rawType = node['@type'];
      const types = Array.isArray(rawType) ? rawType : [rawType];
      if (types.some((type) => String(type).toLowerCase() === 'product')) {
        products.push(node);
      }
    });
  });

  return products;
};

const normalizeCurrency = (value = '') => {
  const token = decodeEscapedText(value).trim().toUpperCase();
  if (/^(MAD|DH|DHS|D\.?H\.?|د\.?\s*م|درهم|دراهم)$/i.test(token)) return 'MAD';
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

const serializePriceCandidate = (candidate) =>
  candidate
    ? {
        amount: candidate.amount,
        currency: candidate.currency,
        dhPrice: candidate.dhPrice,
        kind: candidate.kind,
        source: candidate.source,
        key: candidate.key || '',
        rawText: candidate.rawText || '',
    }
    : null;

const isVisiblePriceSource = (source = '') => ['selector', 'visible-html'].includes(source);
const isHydratedPriceSource = (source = '') => ['__NEXT_DATA__', 'window.NUXT', 'hydration-state', 'json-script'].includes(source);
const isStructuredPriceSource = (source = '') => ['json-ld', 'json-ld-walk', 'meta', 'embedded-json'].includes(source);
const isMadPrice = (candidate) => normalizeCurrency(candidate?.currency) === 'MAD';
const isRealisticImportPrice = (candidate) =>
  candidate && candidate.dhPrice >= MIN_IMPORT_REALISTIC_PRICE_DH && candidate.dhPrice <= 100000;

const productContextScore = (candidate) => {
  const context = decodeEscapedText(`${candidate?.context || ''} ${candidate?.key || ''} ${candidate?.rawText || ''}`).toLowerCase();
  let score = 0;
  if (/buy|cart|checkout|purchase|order|sku|product|goods|sale|discount|deal|price|promo|اشتر|شراء|السلة|منتج|السعر|خصم|عرض/i.test(context)) score += 2;
  if (/coupon|shipping|delivery|voucher|tax|fee|review|rating|sold|points|installment/i.test(context)) score -= 4;
  if (candidate?.kind === 'current') score += 2;
  if (candidate?.kind === 'unknown') score += 1;
  if (candidate?.kind === 'original') score -= 1;
  return score;
};

const buildPriceCandidate = (amount, currency = 'MAD', kind = 'unknown', source = 'page', meta = {}) => {
  const parsedAmount = normalizePrice(amount, meta.divisor || 1);
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
    key: meta.key || '',
    rawText: String(meta.rawText || amount || '').slice(0, 140),
    context: String(meta.context || '').slice(0, 260),
  };
};

const collectPrice = (collection, amount, currency, kind, source, meta = {}) => {
  const candidate = buildPriceCandidate(amount, currency, kind, source, meta);
  if (candidate) collection.push(candidate);
};

const shouldSkipPriceContext = (context = '') =>
  /shipping|delivery|coupon|voucher|tax|fee|threshold|minimum|ship|free|points|review|sold|rating|piece|qty|quantity|stock|inventory|followers|comment|share|score|installment/i.test(
    decodeEscapedText(context)
  );

const inferVisiblePriceKind = (context = '') => {
  const text = decodeEscapedText(context);
  if (/original|origin|retail|list|was|before|market|strike|regular|old|base|السعر\s*الأصلي|قبل|بدل|ancien|prix\s*initial/i.test(text)) {
    return 'original';
  }
  if (/sale|now|current|discount|deal|final|promo|activity|price|السعر|خصم|حاليا|maintenant|prix/i.test(text)) {
    return 'current';
  }
  return 'unknown';
};

const inferKeyPriceKind = (key = '') => {
  const text = String(key).toLowerCase();
  if (/original|origin|retail|market|list|was|strike|before|regular|base|line|reference/.test(text)) {
    return 'original';
  }
  if (/sale|sales|current|discount|final|promo|promotion|deal|activity|min|sku|display|actual|offer/.test(text)) {
    return 'current';
  }
  return /price/.test(text) ? 'current' : 'unknown';
};

const findCurrencyNear = (text = '', index = 0, fallback = 'MAD') => {
  const windowText = decodeEscapedText(text.slice(Math.max(0, index - 260), index + 360));
  const currencyMatch =
    windowText.match(/"(?:currency|priceCurrency|currencyCode|currencySymbol)"\s*:\s*"([^"]+)"/i) ||
    windowText.match(/\b(MAD|USD|EUR|DHS?|DH|\$|€|د\.?\s*م|درهم|دراهم)\b/i);
  return currencyMatch?.[1] || fallback;
};

const extractAmountFromPriceValue = (value, key = '') => {
  if (typeof value === 'number' || typeof value === 'string') {
    return {
      amount: value,
      divisor: /cent|cents|minor|fen|penny/i.test(key) ? 100 : 1,
      rawText: value,
    };
  }

  if (!value || typeof value !== 'object') return null;

  const amountKeys = [
    'amount',
    'value',
    'val',
    'price',
    'priceValue',
    'priceText',
    'priceStr',
    'priceString',
    'formattedPrice',
    'displayPrice',
    'centAmount',
    'amountInCents',
    'priceInCents',
  ];

  for (const amountKey of amountKeys) {
    if (value[amountKey] !== undefined && value[amountKey] !== null) {
      return {
        amount: value[amountKey],
        divisor: /cent|cents|minor|fen|penny/i.test(`${key}-${amountKey}`) ? 100 : 1,
        rawText: typeof value[amountKey] === 'object' ? JSON.stringify(value[amountKey]).slice(0, 120) : value[amountKey],
      };
    }
  }

  return null;
};

const getNodeCurrency = (node, fallback = 'MAD') =>
  node?.currency ||
  node?.currencyCode ||
  node?.priceCurrency ||
  node?.currencySymbol ||
  node?.amountCurrency ||
  fallback;

const collectPricesFromJsonObject = (json, source, candidates) => {
  walkJson(json, (node) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;

    const keys = Object.keys(node);
    const hasPriceSibling = keys.some((key) => /price|sale|retail|market|discount|original|strike|amount/i.test(key));
    const currency = getNodeCurrency(node, 'MAD');

    Object.entries(node).forEach(([key, value]) => {
      const lowerKey = String(key).toLowerCase();
      if (/discount|off|percent|percentage|rate/.test(lowerKey) && !/price/.test(lowerKey)) return;
      const keyLooksPrice = /price|sale|retail|market|discount|original|strike|amount|cent/i.test(key);
      if (!keyLooksPrice) return;
      if (/^(amount|value|val|centAmount)$/i.test(key) && !hasPriceSibling) return;

      const amountInfo = extractAmountFromPriceValue(value, key);
      if (!amountInfo) return;

      collectPrice(candidates, amountInfo.amount, currency, inferKeyPriceKind(key), source, {
        key,
        divisor: amountInfo.divisor,
        rawText: amountInfo.rawText,
        context: JSON.stringify(node).slice(0, 260),
      });
    });
  });
};

const scanCurrencyText = (text, source, candidates, debug, defaultCurrency = 'MAD') => {
  const normalizedText = decodeEscapedText(text);
  const currencyToken = '(?:MAD|USD|EUR|DHS?|DH|دراهم|درهم|د\\.?\\s*م|\\$|€)';
  const numberToken = "[0-9][0-9\\s.,']{0,14}";
  const patterns = [
    {
      label: 'currency-before-number',
      regex: new RegExp(`(${currencyToken})\\s*(${numberToken})`, 'gi'),
      amountIndex: 2,
      currencyIndex: 1,
    },
    {
      label: 'number-before-currency',
      regex: new RegExp(`(${numberToken})\\s*(${currencyToken})`, 'gi'),
      amountIndex: 1,
      currencyIndex: 2,
    },
  ];

  patterns.forEach(({ label, regex, amountIndex, currencyIndex }) => {
    let match = regex.exec(normalizedText);
    let matches = 0;
    while (match) {
      matches += 1;
      const context = normalizedText.slice(Math.max(0, match.index - 120), match.index + 180);
      if (!shouldSkipPriceContext(context)) {
        collectPrice(candidates, match[amountIndex], match[currencyIndex] || defaultCurrency, inferVisiblePriceKind(context), source, {
          key: label,
          rawText: match[0],
          context,
        });
      }
      match = regex.exec(normalizedText);
    }

    if (debug && source === 'selector') {
      debug.selectorsTried.push({ selector: label, matches });
    }
  });
};

const scanKeyValuePrices = (text, source, candidates, fallbackCurrency = 'MAD') => {
  const normalizedText = decodeEscapedText(text);
  const priceKeys =
    'salePrice|salesPrice|currentPrice|discountPrice|finalPrice|priceAmount|priceText|priceStr|priceString|goodsPrice|activityPrice|promoPrice|promotionPrice|dealPrice|minPrice|minSalePrice|skuPrice|displayPrice|actualPrice|offerPrice|price';
  const originalKeys =
    'originalPrice|originPrice|marketPrice|listPrice|wasPrice|strikePrice|strikeThroughPrice|beforePrice|basisPrice|retailPrice|linePrice|regularPrice|referencePrice';
  const patterns = [
    { kind: 'current', keys: priceKeys },
    { kind: 'original', keys: originalKeys },
  ];

  patterns.forEach(({ kind, keys }) => {
    const quotedPattern = new RegExp(`["'](${keys})["']\\s*:\\s*["']([^"']{1,140})["']`, 'gi');
    const numberPattern = new RegExp(`["'](${keys})["']\\s*:\\s*([0-9]+(?:[.,][0-9]+)?)`, 'gi');
    const objectPattern = new RegExp(`["'](${keys})["']\\s*:\\s*\\{([^{}]{1,520})\\}`, 'gi');
    const bareQuotedPattern = new RegExp(`(?:^|[,{])\\s*(${keys})\\s*:\\s*["']([^"']{1,140})["']`, 'gi');
    const bareNumberPattern = new RegExp(`(?:^|[,{])\\s*(${keys})\\s*:\\s*([0-9]+(?:[.,][0-9]+)?)`, 'gi');
    const bareObjectPattern = new RegExp(`(?:^|[,{])\\s*(${keys})\\s*:\\s*\\{([^{}]{1,520})\\}`, 'gi');

    [quotedPattern, numberPattern, bareQuotedPattern, bareNumberPattern].forEach((pattern) => {
      let match = pattern.exec(normalizedText);
      while (match) {
        const currency = findCurrencyNear(normalizedText, match.index, fallbackCurrency);
        const context = normalizedText.slice(Math.max(0, match.index - 120), match.index + 220);
        if (!shouldSkipPriceContext(context)) {
          collectPrice(candidates, match[2], currency, kind, source, {
            key: match[1],
            rawText: match[2],
            context,
          });
        }
        match = pattern.exec(normalizedText);
      }
    });

    [objectPattern, bareObjectPattern].forEach((pattern) => {
      let match = pattern.exec(normalizedText);
      while (match) {
        const block = match[2];
        const amountMatch =
          block.match(/["']?(?:amount|value|val|price|priceText|displayPrice|formattedPrice)["']?\s*:\s*["']?([^"',}]{1,80})/i) ||
          block.match(/([0-9]+(?:[.,][0-9]+)?)/);
        const currencyMatch = block.match(/["']?(?:currency|currencyCode|priceCurrency|currencySymbol)["']?\s*:\s*["']([^"']+)/i);
        if (amountMatch) {
          collectPrice(candidates, amountMatch[1], currencyMatch?.[1] || findCurrencyNear(normalizedText, match.index, fallbackCurrency), kind, source, {
            key: match[1],
            rawText: amountMatch[1],
            context: block,
          });
        }
        match = pattern.exec(normalizedText);
      }
    });
  });
};

const scanSelectorLikePrices = (html, candidates, debug) => {
  const selectors = [
    {
      selector: '[data-testid*="price"]',
      regex: /<[^>]+data-testid=["'][^"']*price[^"']*["'][^>]*>([\s\S]{0,700}?)<\/[^>]+>/gi,
    },
    {
      selector: '[data-test*="price"]',
      regex: /<[^>]+data-test=["'][^"']*price[^"']*["'][^>]*>([\s\S]{0,700}?)<\/[^>]+>/gi,
    },
    {
      selector: '[aria-label*="price"]',
      regex: /<[^>]+aria-label=["']([^"']*price[^"']*)["'][^>]*>/gi,
    },
    {
      selector: '[class*="price"]',
      regex: /<[^>]+class=["'][^"']*(?:price|Price|sale|discount|original|retail)[^"']*["'][^>]*>([\s\S]{0,700}?)<\/[^>]+>/gi,
    },
    {
      selector: '[class*="current"]',
      regex: /<[^>]+class=["'][^"']*(?:current|now|deal|promo)[^"']*["'][^>]*>([\s\S]{0,700}?)<\/[^>]+>/gi,
    },
  ];

  selectors.forEach(({ selector, regex }) => {
    let match = regex.exec(html);
    let matches = 0;
    const beforeCount = candidates.length;
    while (match) {
      matches += 1;
      scanCurrencyText(match[0], 'selector', candidates, null);
      scanKeyValuePrices(match[1] || match[0], 'selector', candidates);
      match = regex.exec(html);
    }
    debug.selectorsTried.push({ selector, matches, candidates: candidates.length - beforeCount });
  });
};

const extractPriceCandidates = (html, jsonProduct, scriptSources = [], debug) => {
  const candidates = [];
  const offer = Array.isArray(jsonProduct?.offers) ? jsonProduct.offers[0] : jsonProduct?.offers;
  const jsonCurrency = offer?.priceCurrency || jsonProduct?.priceCurrency || 'MAD';

  collectPrice(candidates, jsonProduct?.price, jsonCurrency, 'current', 'json-ld', { key: 'Product.price' });
  collectPrice(candidates, offer?.price, jsonCurrency, 'current', 'json-ld', { key: 'Offer.price' });
  collectPrice(candidates, offer?.lowPrice, jsonCurrency, 'current', 'json-ld', { key: 'Offer.lowPrice' });
  collectPrice(candidates, offer?.highPrice, jsonCurrency, 'original', 'json-ld', { key: 'Offer.highPrice' });
  collectPricesFromJsonObject(jsonProduct, 'json-ld-walk', candidates);

  const metaCurrency =
    parseMetaValues(html, ['product:price:currency', 'og:price:currency', 'twitter:data1:currency'])[0] || jsonCurrency;
  const metaPrice = parseMetaValues(html, [
    'product:price:amount',
    'og:price:amount',
    'product:sale_price:amount',
    'twitter:data1',
    'twitter:label1',
  ])[0];
  const metaOriginalPrice = parseMetaValues(html, [
    'product:original_price:amount',
    'og:price:standard_amount',
    'product:retail_price:amount',
  ])[0];
  collectPrice(candidates, metaPrice, metaCurrency, 'current', 'meta', { key: 'meta-current', rawText: metaPrice });
  collectPrice(candidates, metaOriginalPrice, metaCurrency, 'original', 'meta', {
    key: 'meta-original',
    rawText: metaOriginalPrice,
  });

  const normalizedHtml = decodeEscapedText(html);
  scanSelectorLikePrices(normalizedHtml, candidates, debug);
  scanKeyValuePrices(normalizedHtml, 'embedded-json', candidates, metaCurrency);
  scanCurrencyText(stripTags(normalizedHtml), 'visible-html', candidates, debug, metaCurrency);
  scanCurrencyText(normalizedHtml, 'page-source', candidates, debug, metaCurrency);

  scriptSources.forEach((source) => {
    if (source.json) {
      collectPricesFromJsonObject(source.json, source.source, candidates);
    }
    if (/price|amount|sale|retail|market|MAD|DH|درهم|دراهم/i.test(source.text)) {
      scanKeyValuePrices(source.text, source.source, candidates, metaCurrency);
      scanCurrencyText(source.text, source.source, candidates, debug, metaCurrency);
    }
  });

  const seen = new Set();
  const uniqueCandidates = candidates.filter((candidate) => {
    const key = `${candidate.kind}-${candidate.currency}-${candidate.amount}-${candidate.source}-${candidate.key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (debug) {
    debug.detectedPrices = uniqueCandidates.map(serializePriceCandidate);
  }

  return uniqueCandidates;
};

const extractDiscount = (html, scriptSources = []) => {
  const text = decodeEscapedText([html, ...scriptSources.map((source) => source.text)].join(' '));
  const match =
    text.match(/-\s*(\d{1,2})\s*%/) ||
    text.match(/(\d{1,2})\s*%\s*(?:off|discount|خصم|sale)/i) ||
    text.match(/(?:discount|discountRate|discountPercent|offRate)["']?\s*[:=]\s*["']?(\d{1,2})/i) ||
    text.match(/خصم\s*(\d{1,2})\s*%/i);

  if (!match) return 0;
  const discount = Number(match[1]);
  return Number.isFinite(discount) ? Math.max(0, Math.min(95, discount)) : 0;
};

const upgradeImageUrl = (url = '') => {
  try {
    const parsed = new URL(url);
    ['imageMogr2', 'thumbnail', 'resize', 'x-oss-process'].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return url;
  }
};

const isLikelyPlaceholderImageUrl = (url = '') => {
  const lowered = String(url).toLowerCase();
  return (
    !lowered ||
    lowered.startsWith('data:') ||
    lowered.includes('.svg') ||
    lowered.includes('/svg') ||
    lowered.includes('sprite') ||
    lowered.includes('icon') ||
    lowered.includes('logo') ||
    lowered.includes('avatar') ||
    lowered.includes('placeholder') ||
    lowered.includes('default-image') ||
    lowered.includes('loading') ||
    lowered.includes('blank') ||
    lowered.includes('transparent') ||
    lowered.includes('1x1')
  );
};

const isLikelyProductImageUrl = (url = '') => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathName = parsed.pathname.toLowerCase();
    const full = `${host}${pathName}${parsed.search.toLowerCase()}`;
    const trustedHost =
      host === 'img.kwcdn.com' ||
      host.endsWith('.img.kwcdn.com') ||
      host === 'aimg.kwcdn.com' ||
      host.endsWith('.kwcdn.com') ||
      host.includes('temucdn') ||
      host.includes('temu-img');

    if (!trustedHost && !/\.(jpe?g|png|webp)$/i.test(pathName)) return false;
    if (isLikelyPlaceholderImageUrl(full)) return false;

    return (
      /\.(jpe?g|png|webp)$/i.test(pathName) ||
      /\/product\/|\/goods\/|\/review\/|\/upload\/|\/image\/|\/img\//i.test(pathName) ||
      /imageView|imageMogr|thumbnail|format=webp|w=\d{3,}|width=\d{3,}/i.test(parsed.search)
    );
  } catch {
    return false;
  }
};

const expandImageUrlVariants = (url = '') => {
  const clean = sanitizeImageUrl(url);
  if (!clean) return [];
  const variants = [clean];
  const upgraded = upgradeImageUrl(clean);
  if (upgraded && upgraded !== clean) variants.push(upgraded);

  try {
    const parsed = new URL(clean);
    if (parsed.hostname.toLowerCase().includes('kwcdn.com')) {
      const high = new URL(clean);
      high.search = '';
      variants.push(high.toString());

      const webp = new URL(clean);
      webp.searchParams.set('imageView2', '2');
      webp.searchParams.set('w', '1200');
      webp.searchParams.set('q', '80');
      webp.searchParams.set('format', 'webp');
      variants.push(webp.toString());
    }
  } catch {
    // Ignore malformed variants; sanitizeImageUrl already handled the base URL.
  }

  return unique(variants).filter((item) => !isLikelyPlaceholderImageUrl(item));
};

const extractImages = (html, jsonProduct, scriptSources = [], debug) => {
  const jsonImages = Array.isArray(jsonProduct?.image) ? jsonProduct.image : [jsonProduct?.image];
  const metaImages = parseMetaValues(html, ['og:image', 'og:image:secure_url', 'twitter:image']);
  const normalizedHtml = decodeEscapedText(html);
  const urlMatches = normalizedHtml.match(/(?:https?:)?\/\/[^"'<>\\\s]+/gi) || [];
  const attributeMatches = [];
  const attributePattern = /(?:src|data-src|data-original|data-lazy-src|data-thumb|href|content)=["']([^"']+)["']/gi;
  let attributeMatch = attributePattern.exec(normalizedHtml);
  while (attributeMatch) {
    attributeMatches.push(attributeMatch[1]);
    attributeMatch = attributePattern.exec(normalizedHtml);
  }
  const jsonDiscovered = [];
  const collectJsonImages = (json) => walkJson(json, (node) => {
    Object.entries(node).forEach(([key, value]) => {
      if (!/image|img|thumb|thumbnail|gallery|pic|photo|mainUrl|url/i.test(key)) return;
      if (typeof value === 'string') jsonDiscovered.push(value);
      if (value?.url) jsonDiscovered.push(value.url);
      if (value?.imageUrl) jsonDiscovered.push(value.imageUrl);
      if (value?.thumbUrl) jsonDiscovered.push(value.thumbUrl);
      if (value?.originUrl) jsonDiscovered.push(value.originUrl);
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') jsonDiscovered.push(item);
          if (item?.url) jsonDiscovered.push(item.url);
          if (item?.imageUrl) jsonDiscovered.push(item.imageUrl);
          if (item?.thumbUrl) jsonDiscovered.push(item.thumbUrl);
          if (item?.originUrl) jsonDiscovered.push(item.originUrl);
        });
      }
    });
  });
  collectJsonImages(jsonProduct);
  scriptSources.forEach((source) => {
    if (source.json) collectJsonImages(source.json);
    const scriptUrls = source.text.match(/(?:https?:)?\/\/[^"'<>\\\s]+/gi) || [];
    jsonDiscovered.push(...scriptUrls);
  });

  const imageLike = [...jsonImages, ...jsonDiscovered, ...metaImages, ...attributeMatches, ...urlMatches]
    .flatMap((url) => {
      const normalized = String(url || '').startsWith('//') ? `https:${url}` : url;
      return expandImageUrlVariants(normalized);
    })
    .filter((url) => {
      if (!url || isLikelyPlaceholderImageUrl(url)) return false;
      return isLikelyProductImageUrl(url);
    });

  const byBaseUrl = new Map();
  imageLike.forEach((url) => {
    const key = url
      .split('?')[0]
      .replace(/_(?:80x80|100x100|160x160|200x200|300x300|400x400|thumbnail|thumb)/gi, '')
      .replace(/\/(?:thumb|thumbnail)\//gi, '/');
    const current = byBaseUrl.get(key);
    if (!current || url.length > current.length) byBaseUrl.set(key, url);
  });

  const images = [...byBaseUrl.values()].slice(0, 16);
  if (debug) debug.rawImagesFound = images.length;
  return images;
};

const imageExtensionFromContentType = (contentType = '') => {
  const normalized = contentType.toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  return 'jpg';
};

const readUInt24LE = (buffer, offset) => buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);

const getImageDimensions = (buffer, contentType = '') => {
  if (!buffer || buffer.length < 24) return null;
  const type = contentType.toLowerCase();

  if (type.includes('png') && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (type.includes('webp') && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X' && buffer.length >= 30) {
      return { width: readUInt24LE(buffer, 24) + 1, height: readUInt24LE(buffer, 27) + 1 };
    }
    if (chunk === 'VP8 ' && buffer.length >= 30) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L' && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  if ((type.includes('jpeg') || type.includes('jpg')) && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }

  return null;
};

const fetchImageBuffer = async (url, referer = '', cookieHeader = '') => {
  if (typeof fetch !== 'function') return { ok: false, reason: 'fetch is not available' };
  if (isLikelyPlaceholderImageUrl(url)) return { ok: false, reason: 'placeholder/icon url' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8',
        'accept-language': 'ar,en-US;q=0.9,en;q=0.8',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        referer: referer || 'https://www.temu.com/',
        'sec-fetch-dest': 'image',
        'sec-fetch-mode': 'no-cors',
        'sec-fetch-site': 'cross-site',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });

    if (response.status !== 200) return { ok: false, reason: `HTTP ${response.status}` };

    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return { ok: false, reason: `invalid content-type ${contentType || 'unknown'}` };
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength < MIN_PRODUCT_IMAGE_BYTES) return { ok: false, reason: `too small ${contentLength} bytes` };
    if (contentLength && contentLength > MAX_PRODUCT_IMAGE_BYTES) return { ok: false, reason: `too large ${contentLength} bytes` };

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < MIN_PRODUCT_IMAGE_BYTES) return { ok: false, reason: `too small ${buffer.length} bytes` };
    if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) return { ok: false, reason: `too large ${buffer.length} bytes` };

    const dimensions = getImageDimensions(buffer, contentType);
    if (dimensions && (dimensions.width < MIN_PRODUCT_IMAGE_DIMENSION || dimensions.height < MIN_PRODUCT_IMAGE_DIMENSION)) {
      return { ok: false, reason: `tiny image ${dimensions.width}x${dimensions.height}` };
    }

    return {
      ok: true,
      buffer,
      contentType,
      extension: imageExtensionFromContentType(contentType),
      size: buffer.length,
      width: dimensions?.width || null,
      height: dimensions?.height || null,
    };
  } catch (error) {
    return { ok: false, reason: error.name === 'AbortError' ? 'image fetch timeout' : error.message };
  } finally {
    clearTimeout(timeout);
  }
};

const publicStoreImagePath = (filename) => `${STORE_UPLOAD_BASE}/${filename}`;

const localStorePathFromPublicUrl = (url = '') => {
  const normalized = String(url || '').trim();
  if (!normalized.startsWith(STORE_UPLOAD_BASE)) return '';
  const filename = path.basename(normalized.split('?')[0]);
  return path.join(STORE_UPLOAD_ROOT, filename);
};

const storeImageBuffer = async (url, imageData, index = 0) => {
  await fs.mkdir(STORE_UPLOAD_ROOT, { recursive: true });
  const filename = `temu-${Date.now()}-${index}-${crypto.randomUUID()}.${imageData.extension}`;
  const filePath = path.join(STORE_UPLOAD_ROOT, filename);
  await fs.writeFile(filePath, imageData.buffer);

  return {
    url: publicStoreImagePath(filename),
    path: filePath,
    name: filename,
    mimeType: imageData.contentType,
    size: imageData.size,
  };
};

const validateAndStoreRemoteImages = async (urls = [], referer = '', debug, cookieHeader = '') => {
  const candidates = unique(urls.flatMap(expandImageUrlVariants).filter((url) => url && isLikelyProductImageUrl(url))).slice(0, 32);
  const results = [];
  const validationLog = [];

  for (const url of candidates) {
    if (results.length >= 10) break;
    const imageData = await fetchImageBuffer(url, referer, cookieHeader);
    validationLog.push({
      url: url.slice(0, 180),
      ok: imageData.ok,
      reason: imageData.reason || '',
      contentType: imageData.contentType || '',
      size: imageData.size || 0,
      width: imageData.width || null,
      height: imageData.height || null,
    });
    if (!imageData.ok) continue;

    try {
      results.push(await storeImageBuffer(url, imageData, results.length + 1));
    } catch (error) {
      validationLog.at(-1).ok = false;
      validationLog.at(-1).reason = error.message;
    }
  }

  if (debug) {
    debug.imageValidation = validationLog.slice(0, 20);
    debug.imagesFound = results.length;
  }

  return results;
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
      const rawUrl = typeof image === 'string' ? image : image?.url;
      const localPath = String(rawUrl || '').startsWith(STORE_UPLOAD_BASE) ? localStorePathFromPublicUrl(rawUrl) : '';
      const url = localPath ? String(rawUrl).split('?')[0] : sanitizeImageUrl(rawUrl);
      if (!url) return null;
      return {
        url,
        path: localPath,
        name: String(image?.name || `temu-image-${index + 1}`).slice(0, 120),
        mimeType: String(image?.mimeType || (localPath ? 'image/jpeg' : 'external/image')),
        size: Number(image?.size || 0),
      };
    })
    .filter(Boolean)
    .slice(0, 10);
};

const prepareRemoteImagesForSave = (value) =>
  parseRemoteImages(value)
    .filter((image) => image.url && !isLikelyPlaceholderImageUrl(image.url))
    .slice(0, 10);

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

    return {
      html: await response.text(),
      cookieHeader: String(response.headers.get('set-cookie') || '')
        .split(/,\s*(?=[^;,]+=)/)
        .map((cookie) => cookie.split(';')[0])
        .filter(Boolean)
        .join('; '),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const scorePriceCandidate = (candidate) => {
  const sourceScore = {
    selector: 0,
    'visible-html': 1,
    __NEXT_DATA__: 2,
    'window.NUXT': 2,
    'hydration-state': 2,
    'json-script': 3,
    'json-ld': 4,
    'json-ld-walk': 4,
    meta: 5,
    'embedded-json': 6,
    'page-source': 9,
  };
  const kindScore = candidate.kind === 'current' ? 0 : candidate.kind === 'unknown' ? 1 : 2;
  return (sourceScore[candidate.source] ?? 8) * 10 + kindScore - productContextScore(candidate);
};

const pickBestCurrentPrice = (candidates) => {
  const realistic = candidates.filter((candidate) => isRealisticImportPrice(candidate) && candidate.kind !== 'original');
  const sortedLargest = (items) =>
    [...items].sort((a, b) => productContextScore(b) - productContextScore(a) || b.dhPrice - a.dhPrice || scorePriceCandidate(a) - scorePriceCandidate(b));

  const visibleMad = sortedLargest(realistic.filter((candidate) => isVisiblePriceSource(candidate.source) && isMadPrice(candidate)));
  if (visibleMad.length) return visibleMad[0];

  const hydratedMad = sortedLargest(realistic.filter((candidate) => isHydratedPriceSource(candidate.source) && isMadPrice(candidate)));
  if (hydratedMad.length) return hydratedMad[0];

  const visibleAny = sortedLargest(realistic.filter((candidate) => isVisiblePriceSource(candidate.source)));
  if (visibleAny.length) return visibleAny[0];

  const hydratedAny = sortedLargest(realistic.filter((candidate) => isHydratedPriceSource(candidate.source)));
  if (hydratedAny.length) return hydratedAny[0];

  const structuredMad = sortedLargest(realistic.filter((candidate) => isStructuredPriceSource(candidate.source) && isMadPrice(candidate)));
  if (structuredMad.length) return structuredMad[0];

  const structuredAny = sortedLargest(realistic.filter((candidate) => isStructuredPriceSource(candidate.source)));
  if (structuredAny.length) {
    return structuredAny.sort((a, b) => scorePriceCandidate(a) - scorePriceCandidate(b) || b.dhPrice - a.dhPrice)[0];
  }

  const pageSourceMad = sortedLargest(realistic.filter((candidate) => candidate.source === 'page-source' && isMadPrice(candidate)));
  if (pageSourceMad.length) return pageSourceMad[0];

  const pageSourceAny = sortedLargest(realistic.filter((candidate) => candidate.source === 'page-source'));
  return pageSourceAny[0] || null;
};

const pickBestOriginalPrice = (candidates, currentCandidate) => {
  const higherThanCurrent = (candidate) => !currentCandidate || candidate.dhPrice > currentCandidate.dhPrice;
  const explicitOriginal = candidates
    .filter((candidate) => candidate.kind === 'original' && higherThanCurrent(candidate))
    .sort((a, b) => b.dhPrice - a.dhPrice || scorePriceCandidate(a) - scorePriceCandidate(b));

  if (explicitOriginal.length) return explicitOriginal[0];

  const unknownOriginal = candidates
    .filter((candidate) => candidate.kind === 'unknown' && higherThanCurrent(candidate))
    .sort((a, b) => b.dhPrice - a.dhPrice);

  return unknownOriginal[0] || null;
};

const selectImportPrices = (candidates, detectedDiscount, debug) => {
  const plausibleCandidates = candidates
    .filter((candidate) => candidate.dhPrice >= MIN_PRODUCT_PRICE_DH && candidate.dhPrice <= 100000)
    .sort((a, b) => scorePriceCandidate(a) - scorePriceCandidate(b) || a.dhPrice - b.dhPrice);

  const currentCandidate = pickBestCurrentPrice(plausibleCandidates);
  let originalCandidate = pickBestOriginalPrice(plausibleCandidates, currentCandidate);
  let derivedCurrentCandidate = null;

  if (!currentCandidate && originalCandidate && detectedDiscount > 0) {
    const derivedDhPrice = originalCandidate.dhPrice * (1 - detectedDiscount / 100);
    derivedCurrentCandidate = buildPriceCandidate(derivedDhPrice, 'MAD', 'current', 'derived-from-discount', {
      key: 'discount-derived',
      rawText: `${originalCandidate.dhPrice} DH - ${detectedDiscount}%`,
    });
  }

  const selectedCurrent = currentCandidate || derivedCurrentCandidate;
  if (!originalCandidate && selectedCurrent) {
    originalCandidate = pickBestOriginalPrice(plausibleCandidates, selectedCurrent);
  }

  if (debug) {
    debug.selected = {
      current: serializePriceCandidate(selectedCurrent),
      original: serializePriceCandidate(originalCandidate),
      discount: detectedDiscount || 0,
    };
    debug.rawExtractedPrice = selectedCurrent?.rawText || null;
    debug.rawExtractedOriginalPrice = originalCandidate?.rawText || null;
    debug.parserSourceUsed = selectedCurrent?.source || '';
  }

  return { currentCandidate: selectedCurrent, originalCandidate };
};

const deriveOriginalPriceFromDiscount = (finalPrice, discountPercent = DEFAULT_IMPORT_DISCOUNT) => {
  const safeDiscount = Math.max(0, Math.min(80, Number(discountPercent) || DEFAULT_IMPORT_DISCOUNT));
  if (safeDiscount <= 0) return Math.max(1, Math.round(finalPrice));
  return Math.max(Math.round(finalPrice), Math.round(finalPrice / (1 - safeDiscount / 100)));
};

const buildImportedProductPreview = async (url, html, cookieHeader = '') => {
  const debug = createImportDebug(url);
  const scriptSources = extractScriptSources(html, debug);
  const [jsonProduct = {}] = extractJsonLdProducts(html, scriptSources);
  const title =
    stripTemuTitle(jsonProduct.name) ||
    stripTemuTitle(parseMetaValues(html, ['og:title', 'twitter:title'])[0]) ||
    stripTemuTitle((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const description =
    decodeHtml(jsonProduct.description) ||
    decodeHtml(parseMetaValues(html, ['og:description', 'description', 'twitter:description'])[0]) ||
    title;
  const imageUrls = extractImages(html, jsonProduct, scriptSources, debug);
  const images = await validateAndStoreRemoteImages(imageUrls, url, debug, cookieHeader);
  const rating = normalizeNumber(jsonProduct.aggregateRating?.ratingValue, null);
  const prices = extractPriceCandidates(html, jsonProduct, scriptSources, debug);
  const detectedDiscount = extractDiscount(html, scriptSources);
  const { currentCandidate, originalCandidate } = selectImportPrices(prices, detectedDiscount, debug);
  const currentPriceDh = currentCandidate?.dhPrice || 0;
  const originalPriceDh = originalCandidate?.dhPrice || currentPriceDh;
  if (!currentCandidate || currentPriceDh <= 0) {
    throw createTemuImportError(TEMU_PRICE_ERROR, debug, 'لم يتم العثور على سعر حالي صالح بعد فحص المحددات والسكريبتات والميتا ومصدر الصفحة.');
  }
  const finalPrice = Math.round(currentPriceDh * DH_TO_COINS);
  const discountPercent = DEFAULT_IMPORT_DISCOUNT;
  const originalPrice = deriveOriginalPriceFromDiscount(finalPrice, discountPercent);

  if (!title || !images.length) {
    throw createTemuImportError(TEMU_IMPORT_ERROR, debug, !title ? 'تعذر العثور على عنوان المنتج.' : 'تعذر العثور على صور المنتج.');
  }

  const stockQuantity = stableNumber(`${title}-${url}`, 6, 24);
  const promoBadge = 'خصم 30%';
  debug.success = true;
  debug.failureReason = '';
  debug.parserSourceUsed = currentCandidate.source;
  debug.rawExtractedPrice = currentCandidate.rawText || `${currentCandidate.amount} ${currentCandidate.currency}`;
  debug.rawExtractedOriginalPrice = originalCandidate?.rawText || (originalCandidate ? `${originalCandidate.amount} ${originalCandidate.currency}` : null);
  debug.importDiscountRule =
    detectedDiscount > MAX_RELIABLE_IMPORT_DISCOUNT || !detectedDiscount
      ? `discount defaulted to ${DEFAULT_IMPORT_DISCOUNT}%`
      : `discount defaulted to ${DEFAULT_IMPORT_DISCOUNT}% by import policy`;

  return {
    title,
    description,
    category: guessCategory(title),
    originalPrice,
    discountPercent: Math.max(0, Math.min(95, discountPercent)),
    finalPrice,
    stockQuantity,
    featured: true,
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
    importDebug: compactImportDebug(debug),
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
  isClothing: Boolean(product.isClothing),
  sizes: product.sizes || [],
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

let lastImportedProductCleanupAt = 0;

const normalizeImportedStoreProducts = async () => {
  const now = Date.now();
  if (now - lastImportedProductCleanupAt < 5 * 60 * 1000) return;
  lastImportedProductCleanupAt = now;

  const products = await StoreProduct.find({ sourceProvider: 'temu' });
  await Promise.all(
    products.map(async (product) => {
      let changed = false;
      const finalPrice = Number(product.finalPrice || 0);
      const expectedOriginalPrice = finalPrice > 0 ? deriveOriginalPriceFromDiscount(finalPrice, DEFAULT_IMPORT_DISCOUNT) : product.originalPrice;

      if (finalPrice > 0 && (product.discountPercent !== DEFAULT_IMPORT_DISCOUNT || product.originalPrice > expectedOriginalPrice * 1.8)) {
        product.discountPercent = DEFAULT_IMPORT_DISCOUNT;
        product.originalPrice = expectedOriginalPrice;
        if (!product.promoBadge || /95|90|محدود/.test(product.promoBadge)) product.promoBadge = 'خصم 30%';
        changed = true;
      }

      const seen = new Set();
      const cleanImages = (product.images || []).filter((image) => {
        const key = String(image.url || '').split('?')[0];
        if (!key || seen.has(key) || isLikelyPlaceholderImageUrl(key)) return false;
        seen.add(key);
        return true;
      });

      if (cleanImages.length !== (product.images || []).length) {
        product.images = cleanImages;
        changed = true;
      }

      if (changed) await product.save();
    })
  );
};

const listProducts = asyncHandler(async (req, res) => {
  await ensureStarterProducts();
  await normalizeImportedStoreProducts();

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
  await normalizeImportedStoreProducts();

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
      size: String(item.size || '').trim().slice(0, 18),
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
  const requestedQuantities = normalizedItems.reduce((map, item) => {
    map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
    return map;
  }, new Map());
  const orderItems = [];

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400);
      throw new Error('أحد المنتجات لم يعد متاحا');
    }

    if (product.stockQuantity < requestedQuantities.get(item.productId)) {
      res.status(400);
      throw new Error(`الكمية غير متوفرة: ${product.title}`);
    }

    if (product.isClothing) {
      const availableSizes = product.sizes || [];
      if (!item.size) {
        res.status(400);
        throw new Error('المرجو اختيار المقاس');
      }
      if (availableSizes.length && !availableSizes.includes(item.size)) {
        res.status(400);
        throw new Error('المقاس غير متوفر');
      }
    }

    orderItems.push({
      product,
      quantity: item.quantity,
      size: product.isClothing ? item.size : '',
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
      size: item.size,
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
  await normalizeImportedStoreProducts();
  const products = await StoreProduct.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    products: products.map(presentProduct),
  });
});

const adminPreviewProductImport = asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'تم تعطيل الاستيراد التلقائي. يرجى إضافة المنتج يدوياً.',
  });
});

const adminCreateProduct = asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || 'منتجات رقمية').trim();
  const discountPercent = Math.max(0, Math.min(95, normalizeNumber(req.body.discountPercent)));
  const finalPrice = normalizeNumber(req.body.finalPrice);
  const originalPrice = normalizeNumber(req.body.originalPrice, deriveOriginalPriceFromDiscount(finalPrice, discountPercent));
  const stockQuantity = Math.max(0, Math.floor(normalizeNumber(req.body.stockQuantity)));
  const isClothing = normalizeBoolean(req.body.isClothing);
  const sizes = isClothing ? normalizeSizes(req.body.sizes) : [];
  const remoteImages = prepareRemoteImagesForSave(req.body.remoteImages);
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
    isClothing,
    sizes: isClothing && sizes.length ? sizes : isClothing ? defaultClothingSizes : [],
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
  if (req.body.isClothing !== undefined) product.isClothing = normalizeBoolean(req.body.isClothing, product.isClothing);
  if (req.body.sizes !== undefined) product.sizes = product.isClothing ? normalizeSizes(req.body.sizes) : [];
  if (product.isClothing && (!product.sizes || !product.sizes.length)) product.sizes = defaultClothingSizes;
  if (!product.isClothing) product.sizes = [];
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

  const newImages = [
    ...prepareRemoteImagesForSave(req.body.remoteImages),
    ...buildImagesFromFiles(req.files),
  ];
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
