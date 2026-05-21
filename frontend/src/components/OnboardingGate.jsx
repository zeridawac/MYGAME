import { useMemo, useState } from 'react';
import { CheckCircle2, Landmark, LocateFixed, ShieldCheck } from 'lucide-react';
import api from '../api/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const hasBankDetails = (bankDetails = {}) =>
  Boolean(
    String(bankDetails.fullName || '').trim() &&
      String(bankDetails.bankName || '').trim() &&
      String(bankDetails.accountNumber || '').trim() &&
      String(bankDetails.phone || '').trim()
  );

const timezoneLocation = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (timezone === 'Africa/Casablanca') {
    return { timezone, country: 'Morocco', city: 'Casablanca' };
  }

  const parts = timezone.split('/');
  return { timezone, country: parts[0] || '', city: (parts[1] || '').replace(/_/g, ' ') };
};

const locationPayload = (position) => ({
  ...timezoneLocation(),
  permission: 'granted',
  unavailable: false,
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  timestamp: new Date(position.timestamp || Date.now()).toISOString(),
  capturedAt: new Date().toISOString(),
});

const OnboardingGate = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [bankForm, setBankForm] = useState({
    fullName: user?.bankDetails?.fullName || '',
    bankName: user?.bankDetails?.bankName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    phone: user?.bankDetails?.phone || '',
  });
  const [savingBank, setSavingBank] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const bankCompleted = hasBankDetails(user?.bankDetails);
  const locationCompleted = Boolean(user?.locationVerified);
  const locked = !bankCompleted || !locationCompleted;

  const steps = useMemo(
    () => [
      { label: 'معلومات السحب', done: bankCompleted },
      { label: 'صلاحية الموقع', done: locationCompleted },
    ],
    [bankCompleted, locationCompleted]
  );

  if (!user || !locked) return null;

  const saveBankDetails = async (event) => {
    event.preventDefault();
    setSavingBank(true);
    try {
      const { data } = await api.put('/bank', bankForm);
      updateUser(data.user);
      showToast('تم حفظ معلومات السحب', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingBank(false);
    }
  };

  const requestLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم صلاحية الموقع.');
      return;
    }

    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { data } = await api.patch('/auth/location', { location: locationPayload(position) });
          updateUser(data.user);
          showToast('تم تفعيل الموقع بنجاح', 'success');
        } catch (error) {
          setLocationError(error.message || 'تعذر حفظ الموقع.');
        } finally {
          setRequestingLocation(false);
        }
      },
      () => {
        setLocationError('يجب تفعيل صلاحية الموقع للمتابعة.');
        setRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="onboarding-lock" role="dialog" aria-modal="true" aria-label="التحقق قبل الدخول" dir="rtl">
      <section className="onboarding-panel">
        <div className="onboarding-heading">
          <div className="onboarding-seal">
            <ShieldCheck size={26} />
          </div>
          <div>
            <span className="eyebrow">تحقق آمن</span>
            <h2>إكمال التحقق قبل الدخول</h2>
            <p>لن يتم فتح المنصة حتى يتم حفظ معلومات السحب وتفعيل صلاحية الموقع.</p>
          </div>
        </div>

        <div className="onboarding-steps">
          {steps.map((step) => (
            <article className={step.done ? 'done' : ''} key={step.label}>
              <CheckCircle2 size={18} />
              <span>{step.label}</span>
            </article>
          ))}
        </div>

        <div className="onboarding-grid">
          <section className={`onboarding-card ${bankCompleted ? 'completed' : ''}`}>
            <div className="onboarding-card-title">
              <Landmark size={22} />
              <div>
                <h3>معلومات السحب التجريبي</h3>
                <p>يرجى إضافة معلوماتك البنكية استعداداً لإطلاق السحب التجريبي قريباً.</p>
              </div>
            </div>

            {bankCompleted ? (
              <div className="onboarding-complete-message">تم حفظ معلومات السحب.</div>
            ) : (
              <form className="onboarding-form" onSubmit={saveBankDetails}>
                <label>
                  <span>الاسم الكامل</span>
                  <input value={bankForm.fullName} onChange={(event) => setBankForm({ ...bankForm, fullName: event.target.value })} required />
                </label>
                <label>
                  <span>اسم البنك</span>
                  <input value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} required />
                </label>
                <label>
                  <span>رقم الحساب البنكي</span>
                  <input
                    value={bankForm.accountNumber}
                    onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>رقم الهاتف</span>
                  <input value={bankForm.phone} onChange={(event) => setBankForm({ ...bankForm, phone: event.target.value })} required />
                </label>
                <button className="primary-button" type="submit" disabled={savingBank}>
                  {savingBank ? 'جاري الحفظ...' : 'حفظ معلومات السحب'}
                </button>
              </form>
            )}
          </section>

          <section className={`onboarding-card ${locationCompleted ? 'completed' : ''}`}>
            <div className="onboarding-card-title">
              <LocateFixed size={22} />
              <div>
                <h3>تفعيل الموقع</h3>
                <p>يرجى تفعيل صلاحية الموقع لتحسين تجربة التداول والأمان.</p>
              </div>
            </div>

            {locationCompleted ? (
              <div className="onboarding-complete-message">تم تفعيل صلاحية الموقع.</div>
            ) : (
              <div className="onboarding-location-box">
                <button className="primary-button" type="button" onClick={requestLocation} disabled={requestingLocation}>
                  <LocateFixed size={18} />
                  <span>{requestingLocation ? 'جاري التفعيل...' : 'تفعيل الموقع'}</span>
                </button>
                {locationError ? <p className="onboarding-error">{locationError}</p> : null}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};

export default OnboardingGate;
