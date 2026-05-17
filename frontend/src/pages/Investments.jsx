import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock3,
  Coins,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import api from '../api/config.js';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoinDh } from '../utils/coins.js';

const QUICK_AMOUNTS = [50, 100, 250, 500];
const TRADE_DURATION_SECONDS = 60;
const PAYOUT_MULTIPLIER = 1.75;

const priceFormatter = new Intl.NumberFormat('ar-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const coinFormatter = new Intl.NumberFormat('ar-MA', {
  maximumFractionDigits: 2,
});

const timeFormatter = new Intl.DateTimeFormat('ar-MA', {
  hour: '2-digit',
  minute: '2-digit',
});

const formatPrice = (value) => priceFormatter.format(Number(value || 0));
const formatCoins = (value) => coinFormatter.format(Number(value || 0));
const formatCountdown = (seconds) => `00:${String(Math.max(0, seconds)).padStart(2, '0')}`;

const directionMeta = {
  buy: {
    label: 'شراء',
    resultVerb: 'أعلى',
    icon: TrendingUp,
  },
  sell: {
    label: 'بيع',
    resultVerb: 'أقل',
    icon: TrendingDown,
  },
};

const TradingChart = ({ candles = [], currentPrice }) => {
  const visibleCandles = candles.slice(-76);
  const hasData = visibleCandles.length > 1;

  if (!hasData) {
    return (
      <div className="binary-chart-empty">
        <Activity size={26} />
        <span>جاري تجهيز الشارت...</span>
      </div>
    );
  }

  const width = 1040;
  const height = 390;
  const chartTop = 22;
  const chartHeight = 292;
  const volumeTop = 334;
  const volumeHeight = 38;
  const highs = visibleCandles.map((item) => Number(item.high));
  const lows = visibleCandles.map((item) => Number(item.low));
  const maxPrice = Math.max(...highs, Number(currentPrice || 0));
  const minPrice = Math.min(...lows, Number(currentPrice || Infinity));
  const priceRange = Math.max(1, maxPrice - minPrice);
  const maxVolume = Math.max(...visibleCandles.map((item) => Number(item.volume || 0)), 1);
  const spacing = width / visibleCandles.length;
  const candleWidth = Math.max(4, Math.min(11, spacing * 0.64));
  const yForPrice = (price) => chartTop + ((maxPrice - Number(price)) / priceRange) * chartHeight;
  const xForIndex = (index) => index * spacing + spacing / 2;
  const grid = Array.from({ length: 6 }, (_, index) => minPrice + (priceRange / 5) * index);
  const verticalGrid = Array.from({ length: 9 }, (_, index) => (width / 8) * index);
  const supportPrice = minPrice + priceRange * 0.22;
  const resistancePrice = minPrice + priceRange * 0.78;

  const linePath = visibleCandles
    .map((candle, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForPrice(candle.close)}`)
    .join(' ');
  const currentY = yForPrice(currentPrice || visibleCandles[visibleCandles.length - 1].close);

  return (
    <div className="binary-chart-shell">
      <svg className="binary-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="شارت تداول">
        <defs>
          <linearGradient id="binaryAreaGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(46, 229, 157, 0.24)" />
            <stop offset="100%" stopColor="rgba(46, 229, 157, 0)" />
          </linearGradient>
          <filter id="chartSoftGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {verticalGrid.map((x) => (
          <line className="binary-grid-line binary-grid-vertical" x1={x} x2={x} y1={chartTop} y2={volumeTop + volumeHeight} key={x} />
        ))}

        {grid.map((price) => {
          const y = yForPrice(price);
          return (
            <g key={price}>
              <line className="binary-grid-line" x1="0" x2={width} y1={y} y2={y} />
              <text className="binary-grid-label" x="1014" y={y - 7} textAnchor="end">
                {formatPrice(price)}
              </text>
            </g>
          );
        })}

        <path className="binary-area" d={`${linePath} L ${xForIndex(visibleCandles.length - 1)} ${volumeTop} L ${xForIndex(0)} ${volumeTop} Z`} />
        <path className="binary-price-line" d={linePath} filter="url(#chartSoftGlow)" />

        {visibleCandles.map((candle, index) => {
          const x = xForIndex(index);
          const up = candle.close >= candle.open;
          const yOpen = yForPrice(candle.open);
          const yClose = yForPrice(candle.close);
          const yHigh = yForPrice(candle.high);
          const yLow = yForPrice(candle.low);
          const bodyY = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(3, Math.abs(yOpen - yClose));
          const renderedVolume = Math.max(2, (Number(candle.volume || 0) / maxVolume) * volumeHeight);

          return (
            <g className={`binary-candle ${up ? 'is-up' : 'is-down'}`} key={`${candle.time}-${index}`}>
              <line className="binary-candle-wick" x1={x} x2={x} y1={yHigh} y2={yLow} />
              <rect className="binary-candle-body" x={x - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} rx="1.8" />
              <rect className="binary-volume-bar" x={x - candleWidth / 2} y={volumeTop + volumeHeight - renderedVolume} width={candleWidth} height={renderedVolume} rx="2" />
            </g>
          );
        })}

        <line className="binary-zone-line binary-zone-resistance" x1="0" x2={width} y1={yForPrice(resistancePrice)} y2={yForPrice(resistancePrice)} />
        <line className="binary-zone-line binary-zone-support" x1="0" x2={width} y1={yForPrice(supportPrice)} y2={yForPrice(supportPrice)} />
        <text className="binary-zone-label" x="26" y={yForPrice(resistancePrice) - 8}>
          مقاومة
        </text>
        <text className="binary-zone-label" x="26" y={yForPrice(supportPrice) - 8}>
          دعم
        </text>

        <line className="binary-current-line" x1="0" x2={width} y1={currentY} y2={currentY} />
        <circle className="binary-live-dot" cx={xForIndex(visibleCandles.length - 1)} cy={currentY} r="7" />
        <rect className="binary-price-tag-bg" x="872" y={currentY - 18} width="146" height="28" rx="10" />
        <text className="binary-price-tag" x="945" y={currentY + 1} textAnchor="middle">
          {formatPrice(currentPrice)}
        </text>
      </svg>
    </div>
  );
};

const StatPill = ({ icon: Icon, label, value, tone = 'neutral' }) => (
  <article className={`trading-stat trading-stat-${tone}`}>
    <Icon size={18} />
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </article>
);

const TradeStatus = ({ trade, currentPrice, countdown }) => {
  if (!trade) {
    return (
      <div className="active-trade-empty">
        <Clock3 size={22} />
        <div>
          <strong>لا توجد صفقة مفتوحة</strong>
          <span>افتح صفقة شراء أو بيع وسيبدأ عداد دقيقة واحدة.</span>
        </div>
      </div>
    );
  }

  const DirectionIcon = directionMeta[trade.direction]?.icon || Activity;

  return (
    <div className={`active-trade-card active-trade-${trade.direction}`}>
      <div className="active-trade-top">
        <div>
          <span>الصفقة المفتوحة</span>
          <strong>
            <DirectionIcon size={18} />
            {directionMeta[trade.direction]?.label}
          </strong>
        </div>
        <div className="trade-countdown">{formatCountdown(countdown)}</div>
      </div>

      <div className="active-trade-grid">
        <span>سعر الدخول</span>
        <strong>{formatPrice(trade.entryPrice)}</strong>
        <span>السعر الحالي</span>
        <strong>{formatPrice(currentPrice)}</strong>
        <span>المبلغ</span>
        <strong>{formatCoins(trade.amount)} كوين</strong>
        <span>العائد المتوقع</span>
        <strong>{formatCoins(trade.expectedPayout)} كوين</strong>
      </div>

      <p>
        تربح إذا انتهى السعر {directionMeta[trade.direction]?.resultVerb} من سعر الدخول عند انتهاء الدقيقة.
      </p>
    </div>
  );
};

const Investments = () => {
  const [market, setMarket] = useState(null);
  const [activeTrade, setActiveTrade] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [selectedDirection, setSelectedDirection] = useState('buy');
  const [amount, setAmount] = useState(100);
  const [countdown, setCountdown] = useState(TRADE_DURATION_SECONDS);
  const [resultNotice, setResultNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const currentPrice = market?.price || activeTrade?.currentPrice || 0;
  const safeAmount = Number(amount || 0);
  const expectedPayout = useMemo(() => Math.round(safeAmount * PAYOUT_MULTIPLIER * 100) / 100, [safeAmount]);
  const canTrade = safeAmount >= (market?.minTradeAmount || 10) && safeAmount <= Number(user?.coins || 0) && !activeTrade && !opening;

  const applyTradePayload = useCallback(
    (data, options = {}) => {
      if (data.market) setMarket(data.market);
      setActiveTrade(data.activeTrade || null);
      if (data.recentTrades) {
        setRecentTrades(data.recentTrades);
      } else if (!options.keepRecentTrades) {
        setRecentTrades([]);
      }
      if (data.user) updateUser(data.user);

      if (data.settledTrades?.length) {
        const latest = data.settledTrades[0];
        setResultNotice(latest);
        showToast(latest.status === 'won' ? 'ربحت الصفقة' : 'خسرت الصفقة', latest.status === 'won' ? 'success' : 'info');
      }
    },
    [showToast, updateUser]
  );

  const loadTrades = useCallback(
    async ({ initial = false, quiet = false } = {}) => {
      if (initial) setLoading(true);
      if (!initial && !quiet) setRefreshing(true);

      try {
        const { data } = await api.get('/trading/trades');
        applyTradePayload(data);
      } catch (error) {
        if (!quiet) showToast(error.message, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyTradePayload, showToast]
  );

  const loadMarket = useCallback(async () => {
    try {
      const { data } = await api.get('/trading/market');
      setMarket(data.market);
    } catch {
      // The trades poll already surfaces API errors to the user.
    }
  }, []);

  useEffect(() => {
    loadTrades({ initial: true });
  }, [loadTrades]);

  useEffect(() => {
    const marketInterval = window.setInterval(loadMarket, 1000);
    return () => window.clearInterval(marketInterval);
  }, [loadMarket]);

  useEffect(() => {
    const tradesInterval = window.setInterval(() => loadTrades({ quiet: true }), 2500);
    return () => window.clearInterval(tradesInterval);
  }, [loadTrades]);

  useEffect(() => {
    if (!activeTrade?.expiryTime) {
      setCountdown(TRADE_DURATION_SECONDS);
      return undefined;
    }

    const updateCountdown = () => {
      const next = Math.max(0, Math.ceil((new Date(activeTrade.expiryTime).getTime() - Date.now()) / 1000));
      setCountdown(next);
      if (next === 0) {
        loadTrades({ quiet: true });
      }
    };

    updateCountdown();
    const countdownInterval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(countdownInterval);
  }, [activeTrade?.expiryTime, loadTrades]);

  const openTrade = async () => {
    const tradeAmount = Number(amount);

    if (!Number.isFinite(tradeAmount) || tradeAmount < (market?.minTradeAmount || 10)) {
      showToast(`أقل مبلغ للتداول هو ${market?.minTradeAmount || 10} كوين`, 'error');
      return;
    }

    if (tradeAmount > Number(user?.coins || 0)) {
      showToast('رصيد الكوينات غير كاف لفتح هذه الصفقة', 'error');
      return;
    }

    setOpening(true);
    setResultNotice(null);

    try {
      const { data } = await api.post('/trading/trades', {
        direction: selectedDirection,
        amount: tradeAmount,
      });
      applyTradePayload(data, { keepRecentTrades: true });
      showToast(data.message || 'تم فتح الصفقة بنجاح', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack trading-page">
      <section className="hero-panel compact-hero trading-hero">
        <div>
          <span className="eyebrow">غرفة التداول</span>
          <h2>التداول</h2>
          <p>راقب حركة السعر، اختر الاتجاه، وافتح صفقات دقيقة واحدة باستخدام رصيد الكوينات.</p>
        </div>
        <button className="ghost-button trading-refresh" type="button" onClick={() => loadTrades()} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'spin-icon' : ''} />
          <span>تحديث</span>
        </button>
      </section>

      <section className="trading-balance-strip">
        <StatPill icon={Wallet} label="رصيدك" value={formatCoinDh(user?.coins || 0)} tone="gold" />
        <StatPill icon={Activity} label="الأصل" value={market?.asset?.symbol || 'RDA/DH'} tone="cyan" />
        <StatPill icon={Coins} label="العائد" value="75%" tone="green" />
      </section>

      {resultNotice ? (
        <section className={`trade-result-banner trade-result-${resultNotice.status}`}>
          <strong>{resultNotice.status === 'won' ? 'ربحت' : 'خسرت'}</strong>
          <span>
            {resultNotice.status === 'won'
              ? `تمت إضافة ${formatCoins(resultNotice.payout)} كوين إلى رصيدك.`
              : `انتهت الصفقة بخسارة ${formatCoins(resultNotice.amount)} كوين.`}
          </span>
          <button type="button" onClick={() => setResultNotice(null)}>
            إخفاء
          </button>
        </section>
      ) : null}

      <section className="trading-terminal">
        <div className="trading-chart-panel">
          <div className="trading-chart-head">
            <div>
              <span>{market?.asset?.nameAr || 'ريدا درهم'}</span>
              <h3>{market?.asset?.symbol || 'RDA/DH'}</h3>
            </div>
            <div className="trading-live-price">
              <strong>{formatPrice(currentPrice)}</strong>
              <span>السعر الحالي</span>
            </div>
          </div>

          <TradingChart candles={market?.candles || []} currentPrice={currentPrice} />

          <div className="trading-chart-footer">
            <span>سيولة متغيرة</span>
            <span>مناطق دعم ومقاومة</span>
            <span>حركة لحظية</span>
          </div>
        </div>

        <aside className="trade-ticket">
          <div className="trade-ticket-head">
            <div>
              <span>فتح صفقة</span>
              <strong>مدة الصفقة: دقيقة واحدة</strong>
            </div>
            <Clock3 size={20} />
          </div>

          <div className="direction-buttons" role="group" aria-label="اختيار اتجاه الصفقة">
            {Object.entries(directionMeta).map(([key, item]) => {
              const Icon = item.icon;
              return (
                <button
                  className={`direction-button direction-${key} ${selectedDirection === key ? 'active' : ''}`}
                  type="button"
                  key={key}
                  onClick={() => setSelectedDirection(key)}
                  disabled={Boolean(activeTrade)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <label className="trade-amount-field">
            <span>مبلغ التداول بالكوينات</span>
            <input
              type="number"
              min={market?.minTradeAmount || 10}
              step="10"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={Boolean(activeTrade)}
            />
          </label>

          <div className="amount-chip-grid">
            {QUICK_AMOUNTS.map((value) => (
              <button
                className={Number(amount) === value ? 'active' : ''}
                type="button"
                key={value}
                onClick={() => setAmount(value)}
                disabled={Boolean(activeTrade)}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="trade-payout-card">
            <span>العائد عند الربح</span>
            <strong>{formatCoins(expectedPayout)} كوين</strong>
            <small>رأس المال + 75% ربح</small>
          </div>

          <button className={`open-trade-button open-${selectedDirection}`} type="button" onClick={openTrade} disabled={!canTrade}>
            {opening ? 'جاري الفتح...' : `فتح صفقة ${directionMeta[selectedDirection].label}`}
          </button>

          <p className="trading-safety-note">
            اختر المبلغ والاتجاه بعناية قبل فتح الصفقة. النتيجة تحسم عند نهاية الدقيقة.
          </p>
        </aside>
      </section>

      <section className="trade-bottom-grid">
        <TradeStatus trade={activeTrade} currentPrice={currentPrice} countdown={countdown} />

        <div className="trade-history-card">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">السجل</span>
              <h3>آخر الصفقات</h3>
            </div>
            <Coins size={20} />
          </div>

          {recentTrades.length ? (
            <div className="trade-history-list">
              {recentTrades.map((trade) => (
                <article className={`trade-history-item trade-history-${trade.status}`} key={trade.id}>
                  <div>
                    <strong>{directionMeta[trade.direction]?.label}</strong>
                    <span>{timeFormatter.format(new Date(trade.startTime))}</span>
                  </div>
                  <div>
                    <strong>{formatCoins(trade.amount)} كوين</strong>
                    <span>{formatPrice(trade.entryPrice)} → {formatPrice(trade.finalPrice)}</span>
                  </div>
                  <b>{trade.status === 'won' ? 'ربحت' : 'خسرت'}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="trade-history-empty">
              <span>لم تفتح أي صفقة بعد.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Investments;
