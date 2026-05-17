import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeDollarSign,
  Banknote,
  Bell,
  ClipboardCheck,
  Flame,
  Gift,
  Gamepad2,
  Landmark,
  LineChart,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react';
import api from '../api/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import StatCard from '../components/StatCard.jsx';
import { formatCoins, formatDhFromCoins } from '../utils/coins.js';

const navCards = [
  { to: '/games', title: 'الألعاب', text: 'عجلة يومية ومكافآت سريعة', icon: Gamepad2 },
  { to: '/trading', title: 'التداول', text: 'صفقات شراء وبيع افتراضية بدقيقة واحدة', icon: LineChart },
  { to: '/gifts', title: 'الهدايا', text: 'تفعيل كوبونات ومكافآت', icon: Gift },
  { to: '/tasks', title: 'المهام', text: 'اربح نقاطا عبر إنجازات بسيطة', icon: ClipboardCheck },
  { to: '/withdrawals', title: 'السحب', text: 'طلبات سحب العملات', icon: Wallet },
  { to: '/bank', title: 'معلومات البنك', text: 'حفظ بيانات الدفع', icon: Landmark },
];

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data } = await api.get('/users/me/dashboard');
        setDashboard(data);
        updateUser(data.user);
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [showToast, updateUser]);

  if (loading) {
    return <Loading />;
  }

  const currentUser = dashboard?.user || user;
  const xpTarget = Math.max(100, currentUser.level * 100);
  const xpPercent = Math.min(100, Math.round((currentUser.xp / xpTarget) * 100));

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">REDA INVEST GAME</span>
          <h2>أهلا {currentUser.username}، محفظتك جاهزة للحركة.</h2>
          <p>تابع الرصيد، اجمع المكافآت اليومية، وطوّر مستواك من لوحة واحدة.</p>
        </div>
        <div className="level-orbit">
          <Trophy size={34} />
          <strong>المستوى {currentUser.level}</strong>
          <span>{xpPercent}% XP</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={Banknote}
          label="رصيد الكوينات"
          value={formatCoins(currentUser.coins)}
          tone="gold"
          footer={`${formatDhFromCoins(currentUser.coins)} DH`}
        />
        <StatCard
          icon={BadgeDollarSign}
          label="القيمة بالدرهم"
          value={`${formatDhFromCoins(currentUser.coins)} DH`}
          tone="green"
          footer="1000 كوين = 100 DH"
        />
        <StatCard icon={Sparkles} label="النقاط" value={Math.round(currentUser.points)} tone="cyan" />
        <StatCard icon={Flame} label="السلسلة اليومية" value={`${currentUser.streak} يوم`} tone="rose" />
        <StatCard
          icon={BadgeDollarSign}
          label="قيمة المحفظة"
          value={dashboard?.portfolioSummary?.currentValue || 0}
          tone="green"
          footer={`ربح/خسارة ${dashboard?.portfolioSummary?.profitLoss || 0}`}
        />
      </section>

      <section className="panel xp-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">التقدم</span>
            <h3>مستوى الخبرة</h3>
          </div>
          <strong>
            {Math.round(currentUser.xp)} / {xpTarget}
          </strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${xpPercent}%` }} />
        </div>
      </section>

      <section className="split-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">اختصارات</span>
              <h3>تنقل سريع</h3>
            </div>
          </div>
          <div className="action-grid">
            {navCards.map((card) => (
              <Link className="action-card" to={card.to} key={card.to}>
                <card.icon size={22} />
                <strong>{card.title}</strong>
                <span>{card.text}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">آخر الأخبار</span>
              <h3>الإعلانات</h3>
            </div>
            <Bell size={20} />
          </div>
          {dashboard?.announcements?.length ? (
            <div className="announcement-list">
              {dashboard.announcements.map((item) => (
                <article className="announcement-item" key={item._id}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد إعلانات" text="ستظهر تحديثات الإدارة هنا." />
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
