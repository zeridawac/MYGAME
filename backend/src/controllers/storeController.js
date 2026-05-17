const fs = require('fs/promises');
const mongoose = require('mongoose');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const StoreOrder = require('../models/StoreOrder');
const StoreProduct = require('../models/StoreProduct');

const STORE_UPLOAD_BASE = '/uploads/store-products';
const STORE_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'store-products');

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

const adminCreateProduct = asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || 'منتجات رقمية').trim();
  const originalPrice = normalizeNumber(req.body.originalPrice);
  const discountPercent = Math.max(0, Math.min(95, normalizeNumber(req.body.discountPercent)));
  const finalPrice = normalizeNumber(req.body.finalPrice);
  const stockQuantity = Math.max(0, Math.floor(normalizeNumber(req.body.stockQuantity)));

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
    featured: req.body.featured === 'true' || req.body.featured === true,
    active: req.body.active !== 'false' && req.body.active !== false,
    images: buildImagesFromFiles(req.files),
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
  if (req.body.featured !== undefined) product.featured = req.body.featured === 'true' || req.body.featured === true;
  if (req.body.active !== undefined) product.active = req.body.active === 'true' || req.body.active === true;

  const newImages = buildImagesFromFiles(req.files);
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
  adminUpdateProduct,
  checkout,
  getProduct,
  listMyOrders,
  listProducts,
};
