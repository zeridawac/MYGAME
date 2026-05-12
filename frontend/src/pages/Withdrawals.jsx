import { useEffect, useState } from 'react';
import { CircleDollarSign, Clock3, SendHorizontal } from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const statusLabels = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [form, setForm] = useState({ amount: '', note: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const loadWithdrawals = async () => {
    try {
      const { data } = await api.get('/withdrawals');
      setWithdrawals(data.withdrawals);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const submitWithdrawal = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const { data } = await api.post('/withdrawals', form);
      setWithdrawals((current) => [data.withdrawal, ...current]);
      updateUser(data.user);
      setForm({ amount: '', note: '' });
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
      <section className="split-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">طلب جديد</span>
              <h2>سحب العملات</h2>
            </div>
            <CircleDollarSign size={22} />
          </div>
          <form className="stack-form" onSubmit={submitWithdrawal}>
            <label>
              <span>المبلغ</span>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                required
              />
            </label>
            <label>
              <span>ملاحظة اختيارية</span>
              <textarea
                rows="4"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </label>
            <button className="primary-button" type="submit" disabled={submitting}>
              <SendHorizontal size={18} />
              <span>{submitting ? 'جاري الإرسال...' : 'إرسال طلب السحب'}</span>
            </button>
          </form>
          <p className="helper-text">رصيدك الحالي: {Math.round(user?.coins || 0)} عملة</p>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">السجل</span>
              <h3>طلبات السحب</h3>
            </div>
            <Clock3 size={20} />
          </div>
          {withdrawals.length ? (
            <div className="mini-list">
              {withdrawals.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>{item.amount} عملة</strong>
                    <span>{new Date(item.createdAt).toLocaleDateString('ar-MA')}</span>
                  </div>
                  <span className={`status-badge status-${item.status}`}>
                    {statusLabels[item.status]}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد طلبات" text="طلبات السحب الجديدة ستظهر هنا." />
          )}
        </div>
      </section>
    </div>
  );
};

export default Withdrawals;
