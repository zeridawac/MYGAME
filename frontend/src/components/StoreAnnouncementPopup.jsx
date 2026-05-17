import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/config.js';
import { useAuth } from '../context/AuthContext.jsx';

const POPUP_SESSION_KEY = 'reda_store_popup_closed';

const StoreAnnouncementPopup = () => {
  const [popup, setPopup] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadPopup = async () => {
      if (!user || user.isAdmin || sessionStorage.getItem(POPUP_SESSION_KEY)) return;

      try {
        const { data } = await api.get('/settings');
        if (data.storePopup?.enabled) {
          setPopup(data.storePopup);
        }
      } catch {
        // Popup is promotional only; the app should stay quiet if settings fail.
      }
    };

    loadPopup();
  }, [user]);

  const closePopup = () => {
    sessionStorage.setItem(POPUP_SESSION_KEY, '1');
    setPopup(null);
  };

  const goToTarget = () => {
    const targetPath = popup?.targetPath || '/store';
    closePopup();
    navigate(targetPath.startsWith('/') ? targetPath : '/store');
  };

  if (!popup) return null;

  return (
    <div className="store-popup-backdrop" role="dialog" aria-modal="true">
      <section className="store-popup-panel">
        <button className="store-popup-close" type="button" onClick={closePopup} aria-label="إغلاق">
          <X size={18} />
        </button>
        <div className="store-popup-icon">
          <ShoppingBag size={26} />
        </div>
        <h3>{popup.title}</h3>
        <p>{popup.message}</p>
        {popup.buttonText ? (
          <button className="primary-button" type="button" onClick={goToTarget}>
            {popup.buttonText}
          </button>
        ) : null}
      </section>
    </div>
  );
};

export default StoreAnnouncementPopup;
