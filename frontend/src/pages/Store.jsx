import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ShoppingCart, Sparkles, Trash2, Zap } from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoinDh, formatCoins } from '../utils/coins.js';
import { productImageUrl } from '../utils/storeImages.js';

const StoreProductCard = ({ product, onAdd }) => (
  <article className="store-product-card">
    <Link className="store-product-image" to={`/store/${product.id}`}>
      <img src={productImageUrl(product)} alt={product.title} />
      {product.discountPercent > 0 ? <span className="store-discount-badge">-{product.discountPercent}%</span> : null}
      {product.promoBadge || product.featured ? (
        <b className="store-hot-badge">{product.promoBadge || 'عرض قوي'}</b>
      ) : null}
    </Link>
    <div className="store-product-body">
      <Link to={`/store/${product.id}`}>
        <h3>{product.title}</h3>
      </Link>
      <div className="store-price-row">
        {product.originalPrice > product.finalPrice ? <del>{formatCoins(product.originalPrice)} كوين</del> : null}
        <strong>{formatCoins(product.finalPrice)} كوين</strong>
      </div>
      <div className="store-card-bottom">
        <span>{product.stockQuantity > 0 ? `باقي ${product.stockQuantity}` : 'نفد المخزون'}</span>
        <button type="button" onClick={() => onAdd(product)} disabled={product.stockQuantity <= 0}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  </article>
);

const StoreShelf = ({ title, eyebrow, products, onAdd }) => {
  if (!products.length) return null;

  return (
    <section className="store-shelf">
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="store-shelf-row">
        {products.map((product) => (
          <StoreProductCard product={product} onAdd={onAdd} key={`${title}-${product.id}`} />
        ))}
      </div>
    </section>
  );
};

const Store = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const cart = useCart();

  const filteredProducts = useMemo(
    () => (activeCategory ? products.filter((product) => product.category === activeCategory) : products),
    [activeCategory, products]
  );
  const todayDeals = useMemo(
    () => [...products].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 8),
    [products]
  );
  const bestSellers = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.stockQuantity - b.stockQuantity)
        .slice(0, 8),
    [products]
  );
  const newArrivals = useMemo(() => products.slice(0, 8), [products]);

  const loadStore = async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/store/products'),
        api.get('/store/orders'),
      ]);
      setProducts(productsRes.data.products || []);
      setCategories(productsRes.data.categories || []);
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  const addToCart = (product) => {
    cart.addItem(product);
    setCartOpen(true);
    showToast('تمت إضافة المنتج للسلة', 'success');
  };

  const checkout = async () => {
    if (!cart.items.length) {
      showToast('السلة فارغة', 'error');
      return;
    }

    setCheckoutBusy(true);
    try {
      const { data } = await api.post('/store/checkout', {
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      updateUser(data.user);
      cart.clearCart();
      setOrders((current) => [data.order, ...current]);
      setCartOpen(false);
      showToast(data.message, 'success');
      await loadStore();
    } catch (error) {
      showToast(error.message || 'رصيد الكوينات غير كاف', 'error');
    } finally {
      setCheckoutBusy(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack store-page">
      <section className="hero-panel compact-hero store-hero">
        <div>
          <span className="eyebrow">المتجر</span>
          <h2>تسوق بالكوينات فقط</h2>
          <p>عروض كثيرة، بطاقات منتجات سريعة، وسلة شراء خفيفة تناسب الهاتف.</p>
        </div>
        <button className="store-cart-button" type="button" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={20} />
          <span>{cart.itemCount}</span>
        </button>
      </section>

      <section className="store-promo-strip">
        <article>
          <Sparkles size={18} />
          <span>خصومات يومية</span>
        </article>
        <article>
          <Zap size={18} />
          <span>مخزون محدود</span>
        </article>
        <article>
          <ShoppingBag size={18} />
          <span>{formatCoinDh(user?.coins || 0)}</span>
        </article>
      </section>

      <StoreShelf title="الأكثر مبيعاً" eyebrow="Hot" products={bestSellers} onAdd={addToCart} />
      <StoreShelf title="وصل حديثاً" eyebrow="New" products={newArrivals} onAdd={addToCart} />
      <StoreShelf title="عروض اليوم" eyebrow="Deals" products={todayDeals} onAdd={addToCart} />

      <div className="store-category-row">
        <button className={!activeCategory ? 'active' : ''} type="button" onClick={() => setActiveCategory('')}>
          الكل
        </button>
        {categories.map((category) => (
          <button
            className={activeCategory === category ? 'active' : ''}
            type="button"
            key={category}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {filteredProducts.length ? (
        <section className="store-grid">
          {filteredProducts.map((product) => (
            <StoreProductCard product={product} onAdd={addToCart} key={product.id} />
          ))}
        </section>
      ) : (
        <EmptyState title="لا توجد منتجات" text="ستظهر المنتجات المتاحة هنا." />
      )}

      <section className="panel store-orders-panel">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">السجل</span>
            <h3>آخر المشتريات</h3>
          </div>
        </div>
        {orders.length ? (
          <div className="mini-list">
            {orders.slice(0, 5).map((order) => (
              <article key={order.id}>
                <div>
                  <strong>{order.items.length} منتج</strong>
                  <span>{new Date(order.createdAt).toLocaleDateString('ar-MA')}</span>
                </div>
                <strong>{formatCoins(order.totalCoins)} كوين</strong>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد مشتريات بعد" text="مشترياتك بالكوينات ستظهر هنا." />
        )}
      </section>

      {cartOpen ? (
        <div className="store-cart-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="store-cart-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow">السلة</span>
                <h3>سلة التسوق</h3>
              </div>
              <button className="icon-button" type="button" onClick={() => setCartOpen(false)}>
                ×
              </button>
            </div>

            {cart.items.length ? (
              <>
                <div className="store-cart-list">
                  {cart.items.map((item) => (
                    <article key={item.productId}>
                      <img src={productImageUrl(item)} alt={item.title} />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{formatCoins(item.finalPrice)} كوين</span>
                        <div className="store-qty-row">
                          <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}>
                            <Minus size={14} />
                          </button>
                          <b>{item.quantity}</b>
                          <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}>
                            <Plus size={14} />
                          </button>
                          <button type="button" onClick={() => cart.removeItem(item.productId)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="store-cart-total">
                  <span>المجموع</span>
                  <strong>{formatCoins(cart.totalCoins)} كوين</strong>
                </div>
                <button className="primary-button" type="button" onClick={checkout} disabled={checkoutBusy}>
                  <ShoppingBag size={18} />
                  <span>{checkoutBusy ? 'جاري الشراء...' : 'إتمام الشراء'}</span>
                </button>
              </>
            ) : (
              <EmptyState title="السلة فارغة" text="أضف منتجا للبدء." />
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default Store;
