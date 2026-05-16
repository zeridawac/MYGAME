import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Crown,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoinDh } from '../utils/coins.js';

const TIMEFRAMES = [
  { key: '1m', label: '1m', minutes: 1 },
  { key: '5m', label: '5m', minutes: 5 },
  { key: '15m', label: '15m', minutes: 15 },
  { key: '1h', label: '1h', minutes: 60 },
  { key: '4h', label: '4h', minutes: 240 },
  { key: '1D', label: '1D', minutes: 1440 },
];

const MARKET_EVENTS = [
  { label: 'انهيار مفاجئ', mood: 'panic', impact: -5.8, volume: 2.5 },
  { label: 'اختراق وهمي', mood: 'trap', impact: 3.6, volume: 1.9 },
  { label: 'ضخ تلاعبي', mood: 'pump', impact: 6.2, volume: 2.8 },
  { label: 'تعافي السوق', mood: 'recovery', impact: 3.1, volume: 1.7 },
  { label: 'دخول حوت', mood: 'whale', impact: 7.4, volume: 3.4 },
  { label: 'تفريغ حوت', mood: 'dump', impact: -6.7, volume: 3 },
  { label: 'خوف مؤقت', mood: 'fear', impact: -2.2, volume: 1.4 },
  { label: 'تجميع ذكي', mood: 'accumulation', impact: 1.8, volume: 1.3 },
];

const CASINO_SEGMENTS = [
  'x2',
  'ربح',
  'Pump',
  'Whale',
  'VIP',
  'Jackpot',
  'Mystery',
  'Shield',
  'Crash',
  'Rug',
  'Tax',
  'Freeze',
];

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));
const randomBetween = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatMarketNumber = (value) => {
  const number = Number(value || 0);

  if (number >= 1_000_000_000) return `${round(number / 1_000_000_000, 2)}B`;
  if (number >= 1_000_000) return `${round(number / 1_000_000, 2)}M`;
  if (number >= 1_000) return `${round(number / 1_000, 2)}K`;
  return round(number, 2);
};

const getTimeframe = (key) => TIMEFRAMES.find((item) => item.key === key) || TIMEFRAMES[0];

const getAssetProfile = (asset) => {
  const symbolSeed = String(asset?.symbol || 'RDA')
    .split('')
    .reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const volatility = 1 + (symbolSeed % 8) / 4;
  const supply = 850_000 + (symbolSeed % 11) * 185_000;

  return { volatility, supply };
};

const createCandle = ({ open, close, time, volatility, volumeBase, event }) => {
  const top = Math.max(open, close);
  const bottom = Math.min(open, close);
  const wickBoost = randomBetween(0.15, 1.15) * volatility;
  const whaleWick = Math.random() < 0.08 ? randomBetween(1.2, 3.5) * volatility : 0;
  const high = top * (1 + (wickBoost + whaleWick) / 100);
  const low = Math.max(0.1, bottom * (1 - (wickBoost + whaleWick * 0.7) / 100));
  const volume = Math.round(volumeBase * randomBetween(0.72, 1.34) * (event?.volume || 1));

  return {
    time,
    open: round(open),
    high: round(high),
    low: round(low),
    close: round(close),
    volume,
    event: event?.label || '',
  };
};

const createHistoricalCandles = (asset, timeframeKey, count = 120) => {
  const timeframe = getTimeframe(timeframeKey);
  const { volatility } = getAssetProfile(asset);
  const candles = [];
  const basePrice = Number(asset?.price || 40);
  let close = Math.max(1, basePrice * randomBetween(0.84, 1.16));
  let driftMemory = 0;
  const volumeBase = Math.max(20_000, basePrice * 900 + volatility * 12_000);
  const startTime = Date.now() - count * timeframe.minutes * 60_000;

  for (let index = 0; index < count; index += 1) {
    const open = close;
    const shouldEvent = Math.random() < 0.12;
    const event = shouldEvent ? MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)] : null;
    const psychology = event ? event.impact : 0;
    driftMemory = driftMemory * 0.7 + randomBetween(-0.18, 0.18);
    const movement = randomBetween(-1.25, 1.35) * volatility + driftMemory + psychology;
    close = Math.max(0.5, open * (1 + movement / 100));
    candles.push(
      createCandle({
        open,
        close,
        time: startTime + index * timeframe.minutes * 60_000,
        volatility,
        volumeBase,
        event,
      })
    );
  }

  return candles;
};

const createNextCandle = (asset, timeframeKey, previous) => {
  const timeframe = getTimeframe(timeframeKey);
  const { volatility } = getAssetProfile(asset);
  const roll = Math.random();
  const event = roll < 0.24 ? MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)] : null;
  const open = previous?.close || Number(asset?.price || 40);
  const baseMovement = randomBetween(-1.15, 1.2) * volatility;
  const movement = baseMovement + (event?.impact || 0);
  const close = Math.max(0.5, open * (1 + movement / 100));

  return {
    candle: createCandle({
      open,
      close,
      time: (previous?.time || Date.now()) + timeframe.minutes * 60_000,
      volatility,
      volumeBase: Math.max(20_000, open * 900 + volatility * 12_000),
      event,
    }),
    event,
  };
};

const getMarketMetrics = (asset, candles) => {
  const { supply } = getAssetProfile(asset);
  const last = candles[candles.length - 1];
  const first = candles[Math.max(0, candles.length - 42)] || candles[0] || last;
  const dailyPercent = first ? round(((last.close - first.open) / first.open) * 100, 2) : 0;
  const avgRange =
    candles.slice(-32).reduce((sum, candle) => sum + ((candle.high - candle.low) / candle.open) * 100, 0) /
    Math.max(1, candles.slice(-32).length);
  const volume = candles.slice(-24).reduce((sum, candle) => sum + candle.volume, 0);

  return {
    price: last?.close || Number(asset?.price || 0),
    volume,
    marketCap: (last?.close || asset?.price || 0) * supply,
    dailyPercent,
    trend: dailyPercent >= 0 ? 'صاعد' : 'هابط',
    volatilityLevel: avgRange > 5 ? 'ناري' : avgRange > 3 ? 'مرتفع' : avgRange > 1.6 ? 'متوسط' : 'هادئ',
  };
};

const CandleChart = ({ candles, zoom }) => {
  const visibleCount = clamp(Math.round(92 / zoom), 34, 120);
  const visibleCandles = candles.slice(-visibleCount);
  const minPrice = Math.min(...visibleCandles.map((item) => item.low));
  const maxPrice = Math.max(...visibleCandles.map((item) => item.high));
  const maxVolume = Math.max(...visibleCandles.map((item) => item.volume));
  const priceRange = Math.max(1, maxPrice - minPrice);
  const width = 1000;
  const chartTop = 20;
  const chartHeight = 250;
  const volumeTop = 292;
  const volumeHeight = 58;
  const spacing = width / Math.max(1, visibleCandles.length);
  const bodyWidth = clamp(spacing * 0.52, 4, 12);
  const yForPrice = (price) => chartTop + ((maxPrice - price) / priceRange) * chartHeight;
  const last = visibleCandles[visibleCandles.length - 1];
  const grid = Array.from({ length: 5 }, (_, index) => minPrice + (priceRange / 4) * index);

  return (
    <div className="candle-chart-shell">
      <svg className="candle-chart" viewBox={`0 0 ${width} 372`} preserveAspectRatio="none" role="img" aria-label="رسم شموع السوق">
        <defs>
          <linearGradient id="chartGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(62,226,197,0)" />
            <stop offset="50%" stopColor="rgba(62,226,197,0.25)" />
            <stop offset="100%" stopColor="rgba(62,226,197,0)" />
          </linearGradient>
        </defs>

        {grid.map((price) => {
          const y = yForPrice(price);
          return (
            <g key={price}>
              <line className="chart-grid-line" x1="0" x2={width} y1={y} y2={y} />
              <text className="chart-axis-label" x="990" y={y - 6}>
                {formatMarketNumber(price)}
              </text>
            </g>
          );
        })}

        {last ? (
          <>
            <line className="last-price-line" x1="0" x2={width} y1={yForPrice(last.close)} y2={yForPrice(last.close)} />
            <rect className="last-price-tag-bg" x="870" y={yForPrice(last.close) - 18} width="116" height="24" rx="6" />
            <text className="last-price-tag" x="928" y={yForPrice(last.close) - 2} textAnchor="middle">
              {round(last.close, 2)}
            </text>
          </>
        ) : null}

        {visibleCandles.map((candle, index) => {
          const x = index * spacing + spacing / 2;
          const isBullish = candle.close >= candle.open;
          const yOpen = yForPrice(candle.open);
          const yClose = yForPrice(candle.close);
          const yHigh = yForPrice(candle.high);
          const yLow = yForPrice(candle.low);
          const bodyY = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(2, Math.abs(yOpen - yClose));
          const volumeHeightValue = Math.max(3, (candle.volume / maxVolume) * volumeHeight);

          return (
            <g className={`candle-node ${isBullish ? 'is-bullish' : 'is-bearish'}`} key={`${candle.time}-${index}`}>
              <line className="candle-wick" x1={x} x2={x} y1={yHigh} y2={yLow} />
              <rect className="candle-body" x={x - bodyWidth / 2} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" />
              <rect
                className="volume-bar"
                x={x - bodyWidth / 2}
                y={volumeTop + volumeHeight - volumeHeightValue}
                width={bodyWidth}
                height={volumeHeightValue}
                rx="2"
              />
            </g>
          );
        })}

        <rect className="chart-bottom-glow" x="0" y="270" width={width} height="20" fill="url(#chartGlow)" />
      </svg>
    </div>
  );
};

const MarketMetric = ({ label, value, tone }) => (
  <article className={`market-metric market-metric-${tone || 'neutral'}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </article>
);

const CasinoConfetti = ({ active }) => {
  if (!active) return null;

  return (
    <div className="casino-confetti" aria-hidden="true">
      {Array.from({ length: 22 }, (_, index) => (
        <span key={index} style={{ '--i': index }} />
      ))}
    </div>
  );
};

const SpinInvestWheel = ({ spinning, rotation, result }) => (
  <div className={`spin-invest-wheel ${spinning ? 'is-spinning' : ''} ${result?.outcome?.rarity === 'ultra' ? 'is-jackpot' : ''}`}>
    <div className="spin-invest-pointer" />
    <div className="spin-invest-disc" style={{ '--spin-rotation': `${rotation}deg` }}>
      {CASINO_SEGMENTS.map((segment, index) => (
        <span key={segment} style={{ '--segment-index': index }}>
          {segment}
        </span>
      ))}
      <div className="spin-invest-core">
        <Crown size={26} />
        <strong>INVEST</strong>
      </div>
    </div>
  </div>
);

const Investments = () => {
  const [assets, setAssets] = useState([]);
  const [portfolio, setPortfolio] = useState({ positions: [], totalValue: 0 });
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [timeframe, setTimeframe] = useState('1m');
  const [zoom, setZoom] = useState(1);
  const [candles, setCandles] = useState([]);
  const [marketPulse, setMarketPulse] = useState(null);
  const [casinoSpinning, setCasinoSpinning] = useState(false);
  const [casinoResult, setCasinoResult] = useState(null);
  const [casinoError, setCasinoError] = useState('');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const audioContextRef = useRef(null);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset._id === selectedAssetId) || assets[0] || null,
    [assets, selectedAssetId]
  );

  const marketMetrics = useMemo(() => {
    if (!selectedAsset || !candles.length) return null;
    return getMarketMetrics(selectedAsset, candles);
  }, [selectedAsset, candles]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsResponse, portfolioResponse] = await Promise.all([
        api.get('/investments/assets'),
        api.get('/investments/portfolio'),
      ]);
      setAssets(assetsResponse.data.assets);
      setPortfolio(portfolioResponse.data);
      setSelectedAssetId((current) => current || assetsResponse.data.assets[0]?._id || '');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedAsset) return;
    setCandles(createHistoricalCandles(selectedAsset, timeframe));
    setMarketPulse(null);
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    if (!selectedAsset) return undefined;

    const intervalId = window.setInterval(() => {
      setCandles((current) => {
        const next = createNextCandle(selectedAsset, timeframe, current[current.length - 1]);
        setMarketPulse(next.event);
        return [...current.slice(-140), next.candle];
      });
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    if (cooldownLeft <= 0) return undefined;

    const intervalId = window.setInterval(() => {
      setCooldownLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownLeft]);

  const playSpinSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = audioContextRef.current || new AudioContext();
      audioContextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type === 'jackpot' ? 'triangle' : 'sine';
      oscillator.frequency.value = type === 'loss' ? 145 : type === 'jackpot' ? 620 : 330;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    } catch {
      // Sound is optional and may be blocked by the browser.
    }
  };

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

  const spinInvest = async (premium = false) => {
    if (casinoSpinning || cooldownLeft > 0) return;

    setCasinoSpinning(true);
    setCasinoError('');
    setCasinoResult(null);
    setWheelRotation((current) => current + 1440 + Math.floor(Math.random() * 720));
    playSpinSound('start');

    try {
      const [{ data }] = await Promise.all([
        api.post('/investments/spin-invest', { premium }),
        delay(1900),
      ]);
      updateUser(data.user);
      setCasinoResult(data.spin);
      setCooldownLeft(data.spin.cooldownSeconds || 20);
      playSpinSound(data.spin.outcome.rarity === 'ultra' ? 'jackpot' : data.spin.outcome.kind === 'punishment' ? 'loss' : 'win');
      showToast(data.message, data.spin.outcome.kind === 'punishment' ? 'info' : 'success');
      await loadData();
    } catch (error) {
      setCasinoError(error.message);
      showToast(error.message, 'error');
    } finally {
      setCasinoSpinning(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack investments-page">
      <section className="hero-panel compact-hero investment-hero">
        <div>
          <span className="eyebrow">سوق حي افتراضي</span>
          <h2>تداول على شارت شموع متحرك مع سيكولوجية سوق متقلبة.</h2>
          <p>أسعار وهمية تتحرك محليا بموجات ضخ، تفريغ، حيتان وتعافيات مفاجئة.</p>
        </div>
        <button className="ghost-button" type="button" onClick={loadData}>
          <RefreshCw size={18} />
          <span>تحديث السوق</span>
        </button>
      </section>

      <section className="market-terminal panel">
        <div className="market-terminal-head">
          <div>
            <span className="eyebrow">Trading Terminal</span>
            <h3>{selectedAsset?.nameAr || 'السوق'} / {selectedAsset?.symbol}</h3>
          </div>
          {marketMetrics ? (
            <div className={`terminal-price ${marketMetrics.dailyPercent >= 0 ? 'positive' : 'negative'}`}>
              <strong>{round(marketMetrics.price, 2)}</strong>
              <span>{marketMetrics.dailyPercent >= 0 ? '+' : ''}{marketMetrics.dailyPercent}%</span>
            </div>
          ) : null}
        </div>

        <div className="asset-ticker-row">
          {assets.map((asset) => (
            <button
              className={asset._id === selectedAsset?._id ? 'active' : ''}
              type="button"
              key={asset._id}
              onClick={() => setSelectedAssetId(asset._id)}
            >
              <span>{asset.symbol}</span>
              <small className={asset.changePercent >= 0 ? 'positive' : 'negative'}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent}%
              </small>
            </button>
          ))}
        </div>

        <div className="terminal-tools">
          <div className="timeframe-tabs">
            {TIMEFRAMES.map((item) => (
              <button className={timeframe === item.key ? 'active' : ''} type="button" key={item.key} onClick={() => setTimeframe(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="zoom-controls">
            <button type="button" onClick={() => setZoom((current) => clamp(round(current + 0.2, 1), 0.8, 2.2))}>
              <ChevronUp size={16} />
              <span>Zoom</span>
            </button>
            <button type="button" onClick={() => setZoom((current) => clamp(round(current - 0.2, 1), 0.8, 2.2))}>
              <ChevronDown size={16} />
              <span>Out</span>
            </button>
          </div>
        </div>

        {candles.length ? <CandleChart candles={candles} zoom={zoom} /> : <EmptyState title="لا توجد بيانات" text="اختر أصلا لإظهار الشارت." />}

        <div className="market-psychology-strip">
          <Waves size={18} />
          <span>{marketPulse ? `${marketPulse.label} · ${marketPulse.mood}` : 'السوق يراقب السيولة... لا توجد حركة كبرى الآن'}</span>
        </div>

        {marketMetrics ? (
          <div className="market-metrics-grid">
            <MarketMetric label="السعر" value={round(marketMetrics.price, 2)} tone="cyan" />
            <MarketMetric label="الحجم" value={formatMarketNumber(marketMetrics.volume)} tone="gold" />
            <MarketMetric label="Market Cap" value={formatMarketNumber(marketMetrics.marketCap)} tone="green" />
            <MarketMetric label="اليومي" value={`${marketMetrics.dailyPercent >= 0 ? '+' : ''}${marketMetrics.dailyPercent}%`} tone={marketMetrics.dailyPercent >= 0 ? 'green' : 'red'} />
            <MarketMetric label="الاتجاه" value={marketMetrics.trend} tone={marketMetrics.dailyPercent >= 0 ? 'green' : 'red'} />
            <MarketMetric label="التذبذب" value={marketMetrics.volatilityLevel} tone="cyan" />
          </div>
        ) : null}
      </section>

      <section className="spin-invest-section">
        <div className="spin-invest-card">
          <CasinoConfetti active={casinoResult?.outcome?.rarity === 'ultra'} />
          <div className="section-heading">
            <div>
              <span className="eyebrow">Spin & Invest</span>
              <h3>لفة الاستثمار والكازينو</h3>
            </div>
            <Sparkles size={22} />
          </div>

          <SpinInvestWheel spinning={casinoSpinning} rotation={wheelRotation} result={casinoResult} />

          <div className="casino-actions">
            <button className="primary-button casino-free-button" type="button" onClick={() => spinInvest(false)} disabled={casinoSpinning || cooldownLeft > 0}>
              <Zap size={18} />
              <span>{cooldownLeft > 0 ? `${cooldownLeft}s` : 'لفة مجانية يومية'}</span>
            </button>
            <button className="ghost-button casino-premium-button" type="button" onClick={() => spinInvest(true)} disabled={casinoSpinning || cooldownLeft > 0}>
              <Trophy size={18} />
              <span>لفة بريميوم 75</span>
            </button>
          </div>

          {casinoError ? <p className="casino-error">{casinoError}</p> : null}

          {casinoResult ? (
            <div className={`casino-result casino-result-${casinoResult.outcome.kind}`}>
              <div>
                <span>{casinoResult.outcome.rarity}</span>
                <h4>{casinoResult.outcome.labelAr}</h4>
                <p>{casinoResult.outcome.description}</p>
              </div>
              <div className="casino-result-stats">
                <strong className={casinoResult.netCoins >= 0 ? 'positive' : 'negative'}>
                  {casinoResult.netCoins >= 0 ? '+' : ''}{casinoResult.netCoins} كوين
                </strong>
                <span>{casinoResult.outcome.marketShockPercent >= 0 ? '+' : ''}{casinoResult.outcome.marketShockPercent}% سوق</span>
                <span>{casinoResult.outcome.portfolioBoostPercent >= 0 ? '+' : ''}{casinoResult.outcome.portfolioBoostPercent}% محفظة</span>
              </div>
              {casinoResult.nearMiss ? (
                <div className="almost-won">
                  <Target size={16} />
                  <span>كنت قريب من {casinoResult.almostWon?.labelAr || 'جاكبوت نادر'}...</span>
                </div>
              ) : null}
              {casinoResult.surpriseCoins ? (
                <div className="surprise-reward">
                  <Sparkles size={16} />
                  <span>مفاجأة إضافية +{casinoResult.surpriseCoins} كوين</span>
                </div>
              ) : null}
              <div className="luck-streak">
                <Shield size={16} />
                <span>مؤشر الحظ: {casinoResult.luckStreak}/6</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel portfolio-panel">
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

      <section className="asset-grid investment-asset-grid">
        {assets.map((asset) => (
          <article className="asset-card investment-asset-card" key={asset._id}>
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
