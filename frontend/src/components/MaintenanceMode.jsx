import { Headphones, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MaintenanceMode = () => {
  const navigate = useNavigate();

  return (
    <main className="maintenance-page" dir="rtl" lang="ar">
      <div className="maintenance-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <button
        className="portal-support-fab maintenance-support-fab"
        type="button"
        onClick={() => navigate('/?support=1')}
        aria-label="تواصل مع الأدمن"
      >
        <Headphones size={22} />
        <span>تواصل مع الأدمن</span>
      </button>

      <section className="maintenance-card">
        <div className="maintenance-icon">
          <ShieldCheck size={36} />
        </div>
        <h1>
          الموقع تحت الصيانة حالياً
          <span>المرجو العودة لاحقاً</span>
        </h1>
      </section>
    </main>
  );
};

export default MaintenanceMode;
