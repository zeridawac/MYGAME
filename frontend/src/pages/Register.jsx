import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, LockKeyhole, UserPlus, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const Register = () => {
  const [form, setForm] = useState({ username: '', password: '', inviteCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const { register, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to={user?.isAdmin ? '/admin' : '/trading'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await register(form);
      showToast('تم إنشاء الحساب بنجاح', 'success');
      navigate('/trading', { replace: true });
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <Link className="auth-choice-back" to="/">
        ← رجوع
      </Link>
      <section className="auth-panel">
        <div className="auth-brand">
          <span>دعوة خاصة</span>
          <h1>إنشاء حساب جديد</h1>
          <p>كل حساب يحتاج كود دعوة صالح حتى تبقى التجربة منظمة وآمنة محليا.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>اسم المستخدم</span>
            <div className="input-shell">
              <UserRound size={18} />
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                autoComplete="username"
                minLength={3}
                required
              />
            </div>
          </label>

          <label>
            <span>كلمة المرور</span>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </label>

          <label>
            <span>كود الدعوة</span>
            <div className="input-shell">
              <KeyRound size={18} />
              <input
                value={form.inviteCode}
                onChange={(event) =>
                  setForm({ ...form, inviteCode: event.target.value.toUpperCase() })
                }
                required
              />
            </div>
          </label>

          <button className="primary-button" type="submit" disabled={submitting}>
            <UserPlus size={18} />
            <span>{submitting ? 'جاري الإنشاء...' : 'إنشاء الحساب'}</span>
          </button>
        </form>

        <p className="auth-switch">
          لديك حساب؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
