import {
  BadgeDollarSign,
  Banknote,
  CircleGauge,
  ClipboardCheck,
  Crown,
  Gift,
  Gamepad2,
  Landmark,
  LogOut,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCoinDh } from '../utils/coins.js';

const baseNav = [
  { to: '/dashboard', label: 'الرئيسية', icon: CircleGauge },
  { to: '/games', label: 'الألعاب', icon: Gamepad2 },
  { to: '/trading', label: 'التداول', icon: BadgeDollarSign },
  { to: '/gifts', label: 'الهدايا', icon: Gift },
  { to: '/tasks', label: 'المهام', icon: ClipboardCheck },
  { to: '/withdrawals', label: 'السحب', icon: Wallet },
  { to: '/bank', label: 'البنك', icon: Landmark },
];

const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.isAdmin
    ? [...baseNav, { to: '/admin', label: 'الإدارة', icon: ShieldCheck }]
    : baseNav;
  const mobilePrimaryItems = baseNav.slice(0, 4);
  const mobileMoreItems = user?.isAdmin
    ? [...baseNav.slice(4), { to: '/admin', label: 'الإدارة', icon: ShieldCheck }]
    : baseNav.slice(4);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Crown size={24} />
          </div>
          <div>
            <strong>REDA INVEST</strong>
            <span>GAME</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
          {navItems.map((item) => (
            <NavLink to={item.to} key={item.to}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="logout-button" type="button" onClick={handleLogout}>
          <LogOut size={19} />
          <span>خروج</span>
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">لوحة التحكم</span>
            <h1>مرحبا، {user?.username}</h1>
          </div>
          <div className="user-pill">
            <Banknote size={18} />
            <span>{formatCoinDh(user?.coins || 0)}</span>
          </div>
        </header>
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="التنقل السفلي">
        {mobilePrimaryItems.map((item) => (
          <NavLink to={item.to} key={item.to} onClick={closeMobileMenu}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={20} />
          <span>المزيد</span>
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div className="mobile-sheet-backdrop" onClick={closeMobileMenu}>
          <section className="mobile-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">التنقل</span>
                <h3>المزيد</h3>
              </div>
              <button className="icon-button" type="button" onClick={closeMobileMenu}>
                <X size={18} />
              </button>
            </div>
            <div className="mobile-sheet-links">
              {mobileMoreItems.map((item) => (
                <NavLink to={item.to} key={item.to} onClick={closeMobileMenu}>
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <button type="button" onClick={handleLogout}>
                <LogOut size={20} />
                <span>خروج</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default AppLayout;
