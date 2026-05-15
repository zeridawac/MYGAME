import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  BriefcaseBusiness,
  LineChart,
  RefreshCw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoinDh } from '../utils/coins.js';

const Investments = () => {
  const [assets, setAssets] = useState([]);
  const [portfolio, setPortfolio] = useState({ positions: [], totalValue: 0 });
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsResponse, portfolioResponse] = await Promise.all([
        api.get('/investments/assets'),
        api.get('/investments/portfolio'),
      ]);
      setAssets(assetsResponse.data.assets);
      setPortfolio(portfolioResponse.data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chartData = useMemo(
    () =>
      assets.map((asset) => ({
        name: asset.symbol,
        السعر: asset.price,
      })),
    [assets]
  );

  const trade = async (type, assetId) => {
    const quantity = Number(quantities[assetId] || 1);
    setBusy(true);

    try {
      const { data } = await api.post(`/investments/${type}`, { assetId, quantity });
      updateUser(data.user);
      showToast(data.message, 'success');
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">السوق الافتراضي</span>
          <h2>شراء وبيع أصول استثمارية باستخدام العملات.</h2>
          <p>الأسعار تتحرك محليا بتغيرات صغيرة عند تحميل السوق، بدون أي اتصال خارجي.</p>
        </div>
        <button className="ghost-button" type="button" onClick={loadData}>
          <RefreshCw size={18} />
          <span>تحديث السوق</span>
        </button>
      </section>

      <section className="split-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">الرسم البياني</span>
              <h3>أسعار الأصول</h3>
            </div>
            <LineChart size={20} />
          </div>
          {assets.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#a6b1c2" />
                  <YAxis stroke="#a6b1c2" />
                  <Tooltip
                    contentStyle={{
                      background: '#10151f',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="السعر" fill="#3ee2c5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="لا توجد أصول" text="يمكن للمدير إضافة أصول من لوحة الإدارة." />
          )}
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">محفظتي</span>
              <h3>ملخص الاستثمار</h3>
            </div>
            <BriefcaseBusiness size={20} />
          </div>
          <div className="portfolio-total">
            <span>القيمة الحالية</span>
            <strong>{portfolio.totalValue || 0} عملة</strong>
            <small>رصيدك المتاح: {formatCoinDh(user?.coins || 0)}</small>
          </div>
          {portfolio.positions?.length ? (
            <div className="mini-list">
              {portfolio.positions.map((position) => (
                <article key={position.asset._id}>
                  <div>
                    <strong>{position.asset.nameAr}</strong>
                    <span>{position.quantity} وحدات</span>
                  </div>
                  <div>
                    <strong>{position.currentValue} عملة</strong>
                    <span className={position.profitLoss >= 0 ? 'positive' : 'negative'}>
                      {position.profitLoss >= 0 ? '+' : ''}
                      {position.profitLoss}
                    </span>
                  </div>
                  <div className="trade-row">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={quantities[position.asset._id] || 1}
                      onChange={(event) =>
                        setQuantities({ ...quantities, [position.asset._id]: event.target.value })
                      }
                    />
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => trade('sell', position.asset._id)}
                      disabled={busy}
                    >
                      <ArrowDownCircle size={17} />
                      <span>بيع</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="محفظتك فارغة" text="اشتر أول أصل لتظهر المحفظة هنا." />
          )}
        </div>
      </section>

      <section className="asset-grid">
        {assets.map((asset) => (
          <article className="asset-card" key={asset._id}>
            <div className="asset-top">
              <div className="asset-symbol">{asset.symbol}</div>
              <span className={asset.changePercent >= 0 ? 'positive' : 'negative'}>
                {asset.changePercent >= 0 ? '+' : ''}
                {asset.changePercent}%
              </span>
            </div>
            <h3>{asset.nameAr}</h3>
            <p>{asset.description}</p>
            <div className="asset-price">
              <BadgeDollarSign size={18} />
              <strong>{asset.price} عملة</strong>
            </div>
            <div className="trade-row">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantities[asset._id] || 1}
                onChange={(event) => setQuantities({ ...quantities, [asset._id]: event.target.value })}
              />
              <button
                className="primary-button compact-button"
                type="button"
                onClick={() => trade('buy', asset._id)}
                disabled={busy}
              >
                <ArrowUpCircle size={17} />
                <span>شراء</span>
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default Investments;
