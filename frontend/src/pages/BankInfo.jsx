import { useEffect, useState } from 'react';
import { Landmark, Save } from 'lucide-react';
import api from '../api/config.js';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BankInfo = () => {
  const [form, setForm] = useState({
    bankName: '',
    fullName: '',
    accountNumber: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const loadBankDetails = async () => {
      try {
        const { data } = await api.get('/bank');
        setForm({
          bankName: data.bankDetails?.bankName || '',
          fullName: data.bankDetails?.fullName || '',
          accountNumber: data.bankDetails?.accountNumber || '',
          phone: data.bankDetails?.phone || '',
        });
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    loadBankDetails();
  }, [showToast]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.put('/bank', form);
      updateUser(data.user);
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack">
      <section className="panel narrow-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">بيانات الدفع</span>
            <h2>معلومات البنك</h2>
          </div>
          <Landmark size={22} />
        </div>

        <form className="stack-form" onSubmit={save}>
          <label>
            <span>اسم البنك</span>
            <input
              value={form.bankName}
              onChange={(event) => setForm({ ...form, bankName: event.target.value })}
              required
            />
          </label>
          <label>
            <span>الاسم الكامل</span>
            <input
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              required
            />
          </label>
          <label>
            <span>RIB / رقم الحساب</span>
            <input
              value={form.accountNumber}
              onChange={(event) => setForm({ ...form, accountNumber: event.target.value })}
              required
            />
          </label>
          <label>
            <span>الهاتف</span>
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            <Save size={18} />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
          </button>
        </form>
      </section>
    </div>
  );
};

export default BankInfo;
