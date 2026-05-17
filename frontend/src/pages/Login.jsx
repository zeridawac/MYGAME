import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={user?.isAdmin ? '/admin' : '/trading'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const nextUser = await login(form);
      showToast('تم تسجيل الدخول بنجاح', 'success');
      const targetPath = location.state?.from?.pathname;
      const safeTarget = targetPath && !['/games', '/tasks', '/withdrawals', '/bank'].includes(targetPath)
        ? targetPath
        : '/dashboard';
      navigate(nextUser.isAdmin ? '/admin' : safeTarget, {
        replace: true,
      });
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
          <span>REDA INVEST GAME</span>
          <h1>دخول المستثمرين</h1>
          <p>ادخل إلى منصة عربية مركزة للتداول والمتجر والهدايا وإدارة رصيد الكوينات.</p>
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
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <button className="primary-button" type="submit" disabled={submitting}>
            <LogIn size={18} />
            <span>{submitting ? 'جاري الدخول...' : 'تسجيل الدخول'}</span>
          </button>
        </form>

        <p className="auth-switch">
          لا تملك حسابا؟ <Link to="/register">إنشاء حساب بكود دعوة</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
