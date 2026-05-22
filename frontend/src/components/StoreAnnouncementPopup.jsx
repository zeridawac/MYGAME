import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

const POPUP_SESSION_KEY = 'reda_store_popup_closed';

const StoreAnnouncementPopup = () => {
  const [popup, setPopup] = useState(null);
  const { user } = useAuth();
  const { platform, storePopup } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.isAdmin || platform?.storeEnabled === false || sessionStorage.getItem(POPUP_SESSION_KEY)) {
      setPopup(null);
      return;
    }
    if (storePopup?.enabled) {
      setPopup(storePopup);
    }
  }, [platform?.storeEnabled, storePopup, user]);

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
