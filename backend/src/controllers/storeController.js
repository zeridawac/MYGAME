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
const DH_TO_COINS = 10;

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
  const cleanUrl = decodeHtml(String(url).replace(/\\u002F/g, '/').replace(/\\\//g, '/')).trim();
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

const extractPriceCandidates = (html, jsonProduct) => {
  const candidates = [];
  const offer = Array.isArray(jsonProduct?.offers) ? jsonProduct.offers[0] : jsonProduct?.offers;
  [jsonProduct?.price, offer?.price, offer?.lowPrice, offer?.highPrice].forEach((value) => {
    const price = normalizePrice(value);
    if (price > 0) candidates.push(price);
  });

  const text = decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' '));
  const pricePatterns = [
    /(?:MAD|DH|درهم|د\.م)\s*([0-9]+(?:[.,][0-9]+)?)/gi,
    /([0-9]+(?:[.,][0-9]+)?)\s*(?:MAD|DH|درهم|د\.م)/gi,
    /"price"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/gi,
    /"salePrice"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/gi,
    /"originalPrice"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/gi,
  ];

  pricePatterns.forEach((pattern) => {
    let match = pattern.exec(text);
    while (match) {
      const price = normalizePrice(match[1]);
      if (price > 0 && price < 100000) candidates.push(price);
      match = pattern.exec(text);
    }
  });

  return unique(candidates.map((price) => Number(price.toFixed(2))));
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
  const urlMatches = html.match(/https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'<>\\\s]*)?/gi) || [];

  return unique([...jsonImages, ...metaImages, ...urlMatches].map(sanitizeImageUrl)).slice(0, 10);
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
  const prices = extractPriceCandidates(html, jsonProduct).sort((a, b) => a - b);
  const currentPriceDh = prices[0] || 0;
  const explicitOriginalDh = prices.length > 1 ? prices[prices.length - 1] : 0;
  const detectedDiscount = extractDiscount(html);
  const originalPriceDh =
    explicitOriginalDh > currentPriceDh
      ? explicitOriginalDh
      : Math.ceil(currentPriceDh / (1 - (detectedDiscount || 25) / 100));
  const finalPrice = Math.max(1, Math.round(currentPriceDh * DH_TO_COINS));
  const originalPrice = Math.max(finalPrice, Math.round(originalPriceDh * DH_TO_COINS));
  const discountPercent =
    detectedDiscount ||
    (originalPrice > finalPrice ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0);

  if (!title || !images.length || !finalPrice) {
    throw new Error(TEMU_IMPORT_ERROR);
  }

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
    sourcePriceDh: Number(currentPriceDh.toFixed(2)),
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
  sourcePriceDh: product.sourcePriceDh,
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
    message: 'تم الشراء بنجاح',
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
    throw new Error(TEMU_IMPORT_ERROR);
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

  if (!title || !originalPrice || !finalPrice) {
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
    rating: normalizeNumber(req.body.rating, null),
    promoBadge: String(req.body.promoBadge || '').trim(),
    sourceUrl: String(req.body.sourceUrl || '').trim(),
    sourceProvider: String(req.body.sourceProvider || '').trim(),
    sourcePriceDh: normalizeNumber(req.body.sourcePriceDh, null),
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
  if (req.body.originalPrice !== undefined) product.originalPrice = Math.max(0, normalizeNumber(req.body.originalPrice, product.originalPrice));
  if (req.body.discountPercent !== undefined) {
    product.discountPercent = Math.max(0, Math.min(95, normalizeNumber(req.body.discountPercent, product.discountPercent)));
  }
  if (req.body.finalPrice !== undefined) product.finalPrice = Math.max(1, normalizeNumber(req.body.finalPrice, product.finalPrice));
  if (req.body.stockQuantity !== undefined) product.stockQuantity = Math.max(0, Math.floor(normalizeNumber(req.body.stockQuantity, product.stockQuantity)));
  if (req.body.rating !== undefined) product.rating = normalizeNumber(req.body.rating, null);
  if (req.body.promoBadge !== undefined) product.promoBadge = String(req.body.promoBadge).trim();
  if (req.body.sourceUrl !== undefined) product.sourceUrl = String(req.body.sourceUrl).trim();
  if (req.body.sourceProvider !== undefined) product.sourceProvider = String(req.body.sourceProvider).trim();
  if (req.body.sourcePriceDh !== undefined) product.sourcePriceDh = normalizeNumber(req.body.sourcePriceDh, null);
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
