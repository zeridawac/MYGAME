import { useEffect, useState } from 'react';
import { Gift, Send, TicketCheck } from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const Gifts = () => {
  const [code, setCode] = useState('');
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const loadRedemptions = async () => {
    try {
      const { data } = await api.get('/coupons/redemptions');
      setRedemptions(data.redemptions);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRedemptions();
  }, []);

  const redeem = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const { data } = await api.post('/coupons/redeem', { code });
      setRedemptions((current) => [data.redemption, ...current]);
      updateUser(data.user);
      setCode('');
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero gift-hero">
        <div>
          <span className="eyebrow">الهدايا</span>
          <h2>أدخل كوبون الهدية واحصل على العملات أو النقاط فورا.</h2>
          <p>الكوبونات قد تكون محدودة الاستخدام أو مرة واحدة لكل مستخدم حسب إعداد الإدارة.</p>
        </div>
        <Gift size={48} />
      </section>

      <section className="split-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">كود جديد</span>
              <h3>تفعيل هدية</h3>
            </div>
            <TicketCheck size={20} />
          </div>
          <form className="stack-form" onSubmit={redeem}>
            <label>
              <span>كود الهدية</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="WELCOME600"
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={submitting}>
              <Send size={18} />
              <span>{submitting ? 'جاري التفعيل...' : 'تفعيل الكود'}</span>
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">السجل</span>
              <h3>الهدايا المستعملة</h3>
            </div>
          </div>
          {redemptions.length ? (
            <div className="mini-list">
              {redemptions.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>{item.code}</strong>
                    <span>{new Date(item.createdAt).toLocaleDateString('ar-MA')}</span>
                  </div>
                  <div>
                    <strong>+{item.coins} عملة</strong>
                    <span>+{item.points} نقطة</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد هدايا بعد" text="الكوبونات التي تستعملها ستظهر هنا." />
          )}
        </div>
      </section>
    </div>
  );
};

export default Gifts;
