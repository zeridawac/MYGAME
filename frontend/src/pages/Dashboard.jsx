import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeDollarSign,
  Flame,
  Gift,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import api from '../api/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCoinDh, formatCoins } from '../utils/coins.js';
import { productImageUrl } from '../utils/storeImages.js';

const quickCards = [
  { to: '/trading', title: 'التداول', text: 'صفقات دقيقة واحدة', icon: BadgeDollarSign },
  { to: '/store', title: 'المتجر', text: 'عروض بالكوينات', icon: ShoppingBag },
  { to: '/gifts', title: 'الهدايا', text: 'كوبونات ومكافآت', icon: Gift },
];

const DashboardProduct = ({ product }) => (
  <Link className="home-product-card" to={`/store/${product.id}`}>
    <img src={productImageUrl(product)} alt={product.title} />
    <div>
      <strong>{product.title}</strong>
      <span>{formatCoins(product.finalPrice)} كوين</span>
    </div>
    {product.discountPercent > 0 ? <b>-{product.discountPercent}%</b> : null}
  </Link>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [market, setMarket] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [productsRes, marketRes] = await Promise.allSettled([
          api.get('/store/products'),
          api.get('/trading/market'),
        ]);

        if (productsRes.status === 'fulfilled') {
          setProducts(productsRes.value.data.products || []);
        }
        if (marketRes.status === 'fulfilled') {
          setMarket(marketRes.value.data.market);
        }
      } catch {
        // Each section has a compact fallback, so the home stays usable.
      }
    };

    loadDashboard();
  }, []);

  const featured = useMemo(
    () => [...products].sort((a, b) => Number(b.featured) - Number(a.featured) || b.discountPercent - a.discountPercent).slice(0, 4),
    [products]
  );
  const newArrivals = useMemo(() => products.slice(0, 6), [products]);
  const hotDeals = useMemo(() => [...products].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 5), [products]);

  return (
    <div className="page-stack home-page">
      <section className="hero-panel compact-hero home-hero">
        <div>
          <span className="eyebrow">REDA INVEST</span>
          <h2>مرحبا {user?.username}</h2>
          <p>تابع رصيدك، افتح صفقة، أو التقط عرضا جديدا من المتجر.</p>
        </div>
        <div className="user-pill dashboard-balance-pill">
          <Wallet size={18} />
          <span>{formatCoinDh(user?.coins || 0)}</span>
        </div>
      </section>

      <section className="home-quick-stats">
        <article>
          <Wallet size={18} />
          <span>رصيدك</span>
          <strong>{formatCoinDh(user?.coins || 0)}</strong>
        </article>
        <article>
          <TrendingUp size={18} />
          <span>{market?.asset?.symbol || 'RDA/DH'}</span>
          <strong>{market?.price ? Number(market.price).toFixed(2) : '---'}</strong>
        </article>
        <article>
          <Flame size={18} />
          <span>عروض قوية</span>
          <strong>{hotDeals.length}</strong>
        </article>
      </section>

      <section className="home-action-strip">
        {quickCards.map((card) => (
          <Link className="home-action-card" to={card.to} key={card.to}>
            <card.icon size={20} />
            <strong>{card.title}</strong>
            <span>{card.text}</span>
          </Link>
        ))}
      </section>

      <section className="home-live-panel">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">التداول الآن</span>
            <h3>{market?.asset?.nameAr || 'غرفة التداول'}</h3>
          </div>
          <Link className="ghost-button table-button" to="/trading">
            فتح
          </Link>
        </div>
        <div className="home-market-row">
          <strong>{market?.asset?.symbol || 'RDA/DH'}</strong>
          <span>{market?.price ? Number(market.price).toFixed(4) : '---'}</span>
          <b>عائد 75%</b>
        </div>
      </section>

      {featured.length ? (
        <section className="home-section">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">مختارة لك</span>
              <h3>منتجات مميزة</h3>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="home-product-grid">
            {featured.map((product) => (
              <DashboardProduct product={product} key={product.id} />
            ))}
          </div>
        </section>
      ) : null}

      {hotDeals.length ? (
        <section className="home-section">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">تخفيضات</span>
              <h3>عروض اليوم</h3>
            </div>
            <Link className="ghost-button table-button" to="/store">
              الكل
            </Link>
          </div>
          <div className="home-deal-row">
            {hotDeals.map((product) => (
              <Link to={`/store/${product.id}`} key={product.id}>
                <img src={productImageUrl(product)} alt={product.title} />
                {product.discountPercent > 0 ? <span>-{product.discountPercent}%</span> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {newArrivals.length ? (
        <section className="home-section">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">وصل حديثا</span>
              <h3>آخر المنتجات</h3>
            </div>
          </div>
          <div className="home-mini-list">
            {newArrivals.slice(0, 3).map((product) => (
              <DashboardProduct product={product} key={product.id} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default Dashboard;
