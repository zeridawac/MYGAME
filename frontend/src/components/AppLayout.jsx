import {
  BadgeDollarSign,
  Banknote,
  Crown,
  Gift,
  Home,
  LogOut,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCoinDh } from '../utils/coins.js';

const baseNav = [
  { to: '/dashboard', label: 'الرئيسية', icon: Home },
  { to: '/trading', label: 'التداول', icon: BadgeDollarSign },
  { to: '/store', label: 'المتجر', icon: ShoppingBag },
  { to: '/gifts', label: 'الهدايا', icon: Gift },
];

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.isAdmin
    ? [...baseNav, { to: '/admin', label: 'الإدارة', icon: ShieldCheck }]
    : baseNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        {navItems.map((item) => (
          <NavLink to={item.to} key={item.to}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={handleLogout}>
          <LogOut size={20} />
          <span>خروج</span>
        </button>
      </nav>
    </div>
  );
};

export default AppLayout;
