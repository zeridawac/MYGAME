import { Link } from 'react-router-dom';
import { BadgeDollarSign, Gift, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCoinDh } from '../utils/coins.js';

const navCards = [
  { to: '/trading', title: 'التداول', text: 'صفقات دقيقة واحدة بالكوينات', icon: BadgeDollarSign },
  { to: '/gifts', title: 'الهدايا', text: 'فعّل كوبوناتك وارفع رصيدك', icon: Gift },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">REDA INVEST</span>
          <h2>مرحبا {user?.username}، اختر وجهتك.</h2>
          <p>واجهة مركزة للتداول والهدايا فقط، مع رصيد كوينات واضح وسريع القراءة.</p>
        </div>
        <div className="user-pill dashboard-balance-pill">
          <Wallet size={18} />
          <span>{formatCoinDh(user?.coins || 0)}</span>
        </div>
      </section>

      <section className="panel">
        <div className="action-grid minimal-action-grid">
          {navCards.map((card) => (
            <Link className="action-card" to={card.to} key={card.to}>
              <card.icon size={24} />
              <strong>{card.title}</strong>
              <span>{card.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
