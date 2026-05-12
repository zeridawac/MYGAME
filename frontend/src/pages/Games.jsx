import { useEffect, useState } from 'react';
import { Box, CalendarCheck, Gift, History, RotateCw, Sparkles, Ticket, X } from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const Games = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [busyGame, setBusyGame] = useState(null);
  const [result, setResult] = useState(null);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const spinState = summary.find((item) => item.gameKey === 'spin');
  const remainingSpins = spinState ? spinState.remainingPlays : Math.max(0, 2 - (user?.spinCount || 0));

  const loadGameData = async () => {
    try {
      const [historyResponse, summaryResponse] = await Promise.all([
        api.get('/games/history'),
        api.get('/games/summary'),
      ]);
      setHistory(historyResponse.data.history);
      setSummary(summaryResponse.data.games);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGameData();
  }, []);

  const finishPlay = async (data, successMessage = data.message) => {
    setResult(data.reward);
    updateUser(data.user);
    setHistory((current) => [data.history, ...current].slice(0, 30));
    showToast(successMessage, 'success');
    const { data: summaryData } = await api.get('/games/summary');
    setSummary(summaryData.games);
  };

  const spin = async () => {
    setSpinning(true);
    setResult(null);

    try {
      const { data } = await api.post('/games/spin');
      window.setTimeout(async () => {
        try {
          await finishPlay(data);
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          setSpinning(false);
        }
      }, 1100);
    } catch (error) {
      setSpinning(false);
      showToast(error.message, 'error');
    }
  };

  const playMiniGame = async (gameKey, endpoint, payload = {}) => {
    setBusyGame(gameKey);
    setResult(null);

    try {
      const { data } = await api.post(endpoint, payload);
      await finishPlay(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusyGame(null);
    }
  };

  const getRemaining = (gameKey) => {
    return summary.find((item) => item.gameKey === gameKey)?.remainingPlays ?? 0;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack games-page">
      <section className="panel game-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Spin Wheel</span>
            <h2>عجلة الحظ اليومية</h2>
          </div>
          <div className="user-pill">
            <Gift size={18} />
            <span>{remainingSpins} محاولات متبقية</span>
          </div>
        </div>

        <div className="wheel-zone">
          <div className={`spin-wheel ${spinning ? 'is-spinning' : ''}`}>
            <span>عملات</span>
            <span>نقاط</span>
            <span>XP</span>
            <span>حظ</span>
            <span>ذهب</span>
            <span>نمو</span>
          </div>
          <button className="primary-button wheel-button" type="button" onClick={spin} disabled={spinning}>
            <RotateCw size={18} />
            <span>{spinning ? 'تدور...' : 'ابدأ الدوران'}</span>
          </button>
        </div>
      </section>

      <section className="games-grid">
        <article className="mini-game-card scratch-card">
          <Ticket size={28} />
          <div>
            <span className="eyebrow">Scratch</span>
            <h3>بطاقة الحظ</h3>
            <p>اكشف بطاقة سريعة واربح مكافأة عشوائية.</p>
          </div>
          <strong>{getRemaining('scratch')} محاولات</strong>
          <button
            className="primary-button"
            type="button"
            disabled={busyGame === 'scratch'}
            onClick={() => playMiniGame('scratch', '/games/scratch')}
          >
            <Sparkles size={18} />
            <span>{busyGame === 'scratch' ? 'جاري الكشف...' : 'اكشف البطاقة'}</span>
          </button>
        </article>

        <article className="mini-game-card">
          <Box size={28} />
          <div>
            <span className="eyebrow">Lucky Box</span>
            <h3>صندوق الحظ</h3>
            <p>اختر صندوقا واحصل على جائزة مخفية.</p>
          </div>
          <strong>{getRemaining('luckyBox')} محاولات</strong>
          <div className="box-row">
            {[1, 2, 3].map((box) => (
              <button
                className="icon-prize"
                type="button"
                key={box}
                disabled={busyGame === 'luckyBox'}
                onClick={() => playMiniGame('luckyBox', '/games/lucky-box', { selectedBox: box })}
              >
                <Box size={20} />
                <span>{box}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="mini-game-card daily-card">
          <CalendarCheck size={28} />
          <div>
            <span className="eyebrow">Daily</span>
            <h3>المكافأة اليومية</h3>
            <p>استلم هدية يومية ثابتة مرة واحدة كل يوم.</p>
          </div>
          <strong>{getRemaining('dailyReward')} متاحة</strong>
          <button
            className="ghost-button"
            type="button"
            disabled={busyGame === 'dailyReward'}
            onClick={() => playMiniGame('dailyReward', '/games/daily-reward')}
          >
            <Gift size={18} />
            <span>{busyGame === 'dailyReward' ? 'جاري الاستلام...' : 'استلام اليومية'}</span>
          </button>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">السجل</span>
            <h3>آخر المكافآت</h3>
          </div>
          <History size={20} />
        </div>

        {history.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المكافأة</th>
                  <th>اللعبة</th>
                  <th>عملات</th>
                  <th>نقاط</th>
                  <th>XP</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id}>
                    <td>{item.label}</td>
                    <td>{item.gameName || 'عجلة الحظ'}</td>
                    <td>{item.coins}</td>
                    <td>{item.points}</td>
                    <td>{item.xp}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString('ar-MA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="لا يوجد سجل بعد" text="ابدأ أول دوران لتسجيل المكافآت." />
        )}
      </section>

      {result ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="result-modal">
            <button type="button" className="icon-button modal-close" onClick={() => setResult(null)}>
              <X size={18} />
            </button>
            <Sparkles size={32} />
            <h3>{result.label}</h3>
            <p>
              +{result.coins} عملة، +{result.points} نقطة، +{result.xp} XP
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Games;
