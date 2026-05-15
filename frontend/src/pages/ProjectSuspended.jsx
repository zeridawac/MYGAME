import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCheck,
  Coins,
  Film,
  Heart,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Play,
  RefreshCw,
  RotateCcw,
  SendHorizonal,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import api from '../api/config.js';

const USER_CODES = ['الشتا كتصب', 'شتا كتصب'];
const ADMIN_CODE = 'admin';
const SESSION_KEY = 'reda_secure_portal_session';
const POLL_INTERVAL_MS = 1500;
const DEFAULT_COIN_BALANCE = 500;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_URL.startsWith('http') ? API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '') : '';

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeAnswer = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const isUserCode = (value) => USER_CODES.includes(normalizeAnswer(value));
const isAdminCode = (value) => normalizeAnswer(value).toLowerCase() === ADMIN_CODE;
const getMediaType = (mimeType = '', fallback = '') => {
  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (/\.(jpg|jpeg|png|webp)$/i.test(fallback)) {
    return 'image';
  }

  if (/\.(mp4|webm|mov)$/i.test(fallback)) {
    return 'video';
  }

  return '';
};

const getAssetUrl = (url) => {
  if (!url) {
    return '';
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return API_ORIGIN ? `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}` : url;
};

const readPortalSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  window.localStorage.removeItem(SESSION_KEY);
  const session = safeJsonParse(window.sessionStorage.getItem(SESSION_KEY), null);

  if (!session?.mode || !session?.code) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }

  return session;
};

const formatTime = (value) => {
  return new Intl.DateTimeFormat('ar-MA', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatDateTime = (value) => {
  return new Intl.DateTimeFormat('ar-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const makeSession = (answer) => {
  const code = normalizeAnswer(answer);
  return {
    mode: isAdminCode(code) ? 'admin' : 'user',
    code,
  };
};

const PortalFrame = ({ children, mode = 'gate' }) => (
  <main className={`portal-page portal-page-${mode}`} dir="rtl" lang="ar">
    <div className="portal-loader" aria-hidden="true" />
    <div className="portal-background" aria-hidden="true">
      <span className="portal-glow portal-glow-one" />
      <span className="portal-glow portal-glow-two" />
      <span className="portal-ring portal-ring-one" />
      <span className="portal-ring portal-ring-two" />
      <span className="portal-scanline" />
    </div>
    {children}
  </main>
);

const AccessGate = ({ code, error, errorKey, onCodeChange, onSubmit }) => (
  <section className="portal-gate" aria-label="بوابة التواصل المشفر">
    <div className="portal-seal">
      <LockKeyhole size={24} />
      <span>قناة مشفرة</span>
    </div>

    <div className="portal-copy">
      <h1>تم إيقاف المشروع حاليا إلى أجل غير محدد ...</h1>
      <p>للتواصل مع الأدمن يرجى الضغط على المربع أسفله والإجابة على الكود السري، ليتم فتح رسائل مشفرة مع الأدمن.</p>
    </div>

    <form className="portal-code-card" onSubmit={onSubmit}>
      <div className="portal-question">
        <span>السؤال السري</span>
        <strong>واش كين الصهد ؟</strong>
      </div>

      <label className="portal-input-label" htmlFor="portal-code">
        <KeyRound size={18} />
        <span>الكود السري</span>
      </label>
      <input
        id="portal-code"
        className="portal-code-input"
        type="text"
        value={code}
        onChange={(event) => onCodeChange(event.target.value)}
        placeholder="اكتب الإجابة هنا"
        autoComplete="off"
      />

      {error ? (
        <p className="portal-error" key={errorKey}>
          {error}
        </p>
      ) : null}

      <button className="portal-primary-button" type="submit">
        <LockKeyhole size={18} />
        <span>فتح الرسائل المشفرة</span>
      </button>
    </form>
  </section>
);

const MessageBubble = ({ message, mode, onOpenMedia, onRewardMedia }) => {
  const isSystemMessage = message.sender === 'system';
  const isAdminMessage = message.sender === 'admin';
  const isMine = (mode === 'admin' && isAdminMessage) || (mode === 'user' && !isAdminMessage);
  const senderLabel = isSystemMessage ? 'النظام' : isMine ? 'أنت' : isAdminMessage ? 'الأدمن' : 'المستخدم';
  const mediaUrl = getAssetUrl(message.mediaUrl || message.imageUrl);
  const mediaName = message.mediaName || message.imageName || 'وسائط داخل الرسالة';
  const mediaMime = message.mediaMime || message.imageMime || '';
  const mediaType = message.mediaType || getMediaType(mediaMime, mediaUrl);
  const mediaPayload = { url: mediaUrl, name: mediaName, type: mediaType, mimeType: mediaMime };

  return (
    <article
      className={`portal-message ${
        isSystemMessage ? 'portal-message-system' : isAdminMessage ? 'portal-message-admin' : 'portal-message-user'
      }`}
    >
      <div className="portal-message-meta">
        <span>{senderLabel}</span>
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>

      {mediaUrl ? (
        <>
          {mode === 'admin' ? (
            <div className="portal-media-actions">
              <button type="button" onClick={() => onOpenMedia(mediaPayload)}>
                فتح
              </button>
              <button type="button" onClick={() => onRewardMedia?.(message)}>
                <Heart size={14} />
                إعجاب
              </button>
            </div>
          ) : null}

          <button
            className={`portal-media-thumb portal-media-thumb-${mediaType || 'image'}`}
            type="button"
            onClick={() => onOpenMedia(mediaPayload)}
            aria-label="فتح الوسائط"
          >
            {mediaType === 'video' ? (
              <>
                <video src={mediaUrl} preload="metadata" muted playsInline />
                <span className="portal-play-badge">
                  <Play size={22} fill="currentColor" />
                </span>
              </>
            ) : (
              <img src={mediaUrl} alt={mediaName} />
            )}
          </button>
        </>
      ) : null}

      {message.rewardCoins ? (
        <span className="portal-system-reward">
          <Coins size={14} />
          +{message.rewardCoins} كوين
        </span>
      ) : null}

      {message.text ? <p>{message.text}</p> : null}

      {mode === 'admin' && isAdminMessage && message.readByUserAt ? (
        <div className="portal-read-receipt" title="قرأها المستخدم">
          <CheckCheck size={15} />
          <span>تمت القراءة</span>
        </div>
      ) : null}
    </article>
  );
};

const MediaLightbox = ({ media, onClose }) => {
  useEffect(() => {
    if (!media) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, onClose]);

  if (!media) {
    return null;
  }

  return (
    <div className="portal-lightbox" role="dialog" aria-modal="true" aria-label="معاينة الوسائط" onClick={onClose}>
      <div className="portal-lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <button className="portal-lightbox-close" type="button" onClick={onClose} aria-label="إغلاق">
          <X size={22} />
        </button>

        {media.type === 'video' ? (
          <video className="portal-lightbox-media" src={media.url} controls autoPlay playsInline />
        ) : (
          <img className="portal-lightbox-media" src={media.url} alt={media.name || 'صورة'} />
        )}
      </div>
    </div>
  );
};

const MediaInputOption = ({ accept, capture, icon: Icon, label, disabled, onPick }) => (
  <label className={`portal-media-option ${disabled ? 'is-disabled' : ''}`}>
    <Icon size={17} />
    <span>{label}</span>
    <input
      type="file"
      accept={accept}
      capture={capture}
      disabled={disabled}
      onChange={(event) => {
        onPick(event.target.files?.[0] || null);
        event.target.value = '';
      }}
    />
  </label>
);

const ChatComposer = ({
  value,
  disabled,
  placeholder,
  selectedMedia,
  mediaPreview,
  onChange,
  onMediaChange,
  onClearMedia,
  onSubmit,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedMediaType = selectedMedia ? getMediaType(selectedMedia.type, selectedMedia.name) : '';

  const handlePick = (file) => {
    onMediaChange(file);
    setPickerOpen(false);
  };

  return (
    <form className="portal-composer" onSubmit={onSubmit}>
      {mediaPreview ? (
        <div className="portal-media-preview">
          {selectedMediaType === 'video' ? (
            <video src={mediaPreview} muted playsInline preload="metadata" />
          ) : (
            <img src={mediaPreview} alt="معاينة الوسائط قبل الإرسال" />
          )}
          <div>
            <strong>{selectedMedia?.name || 'وسائط مرفقة'}</strong>
            <span>{selectedMediaType === 'video' ? 'سيتم إرسال الفيديو داخل المحادثة' : 'سيتم إرسال الصورة داخل المحادثة'}</span>
          </div>
          <button type="button" onClick={onClearMedia} aria-label="إزالة الوسائط">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="portal-composer-row">
        <div className="portal-media-picker">
          <button
            className="portal-attach-button"
            type="button"
            onClick={() => setPickerOpen((current) => !current)}
            disabled={disabled}
            aria-label="إرفاق وسائط"
          >
            <ImagePlus size={20} />
          </button>

          {pickerOpen ? (
            <div className="portal-media-overlay" onClick={() => setPickerOpen(false)}>
              <div className="portal-media-menu" role="dialog" aria-label="اختيار الوسائط" onClick={(event) => event.stopPropagation()}>
                <div className="portal-media-menu-header">
                  <strong>إرسال وسائط</strong>
                  <button type="button" onClick={() => setPickerOpen(false)} aria-label="إغلاق">
                    <X size={18} />
                  </button>
                </div>
                <MediaInputOption accept="image/*" icon={UploadCloud} label="اختيار صورة" disabled={disabled} onPick={handlePick} />
                <MediaInputOption accept="image/*" capture="environment" icon={Camera} label="التقاط صورة بالكاميرا" disabled={disabled} onPick={handlePick} />
                <MediaInputOption accept="video/*" icon={Film} label="اختيار فيديو" disabled={disabled} onPick={handlePick} />
                <MediaInputOption accept="video/*" capture="environment" icon={Video} label="تسجيل فيديو بالكاميرا" disabled={disabled} onPick={handlePick} />
              </div>
            </div>
          ) : null}
        </div>

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || (!value.trim() && !selectedMedia)} aria-label="إرسال">
          <SendHorizonal size={20} />
        </button>
      </div>
    </form>
  );
};

const ChatMessages = ({ messages, mode, loading, error, endRef, onOpenMedia, onRewardMedia }) => (
  <div className="portal-messages" aria-live="polite">
    {messages.length ? (
      messages.map((item) => (
        <MessageBubble key={item.id} message={item} mode={mode} onOpenMedia={onOpenMedia} onRewardMedia={onRewardMedia} />
      ))
    ) : (
      <div className="portal-empty-chat">
        <MessageSquareText size={34} />
        <p>{loading ? 'جاري فتح القناة المشفرة...' : 'القناة فارغة الآن. أي رسالة جديدة ستظهر هنا مباشرة.'}</p>
      </div>
    )}

    {error ? <p className="portal-chat-error">{error}</p> : null}
    <span ref={endRef} />
  </div>
);

const UserChat = ({
  messages,
  draft,
  loading,
  error,
  sending,
  selectedMedia,
  mediaPreview,
  coinBalance,
  onDraftChange,
  onMediaChange,
  onClearMedia,
  onOpenMedia,
  onShowCoinDetails,
  onSend,
  onLogout,
  endRef,
}) => (
  <section className="portal-chat-shell">
    <header className="portal-chat-header">
      <div>
        <span className="portal-status-dot" />
        <p>غرفة واحدة مباشرة</p>
        <h2>اتصال مشفر مع الأدمن</h2>
      </div>
      <div className="portal-user-header-actions">
        <button className="portal-coin-badge" type="button" onClick={onShowCoinDetails}>
          <Coins size={18} />
          <span>رصيد الكوينات: {coinBalance} كوين</span>
          <small>اضغط للتفاصيل</small>
        </button>
        <button className="portal-icon-button" type="button" onClick={onLogout} aria-label="خروج آمن">
          <LogOut size={20} />
        </button>
      </div>
    </header>

    <ChatMessages messages={messages} mode="user" loading={loading} error={error} endRef={endRef} onOpenMedia={onOpenMedia} />

    <ChatComposer
      value={draft}
      onChange={onDraftChange}
      onSubmit={onSend}
      placeholder="اكتب رسالتك للأدمن..."
      disabled={sending}
      selectedMedia={selectedMedia}
      mediaPreview={mediaPreview}
      onMediaChange={onMediaChange}
      onClearMedia={onClearMedia}
    />
  </section>
);

const AdminConsole = ({
  messages,
  draft,
  loading,
  error,
  sending,
  clearing,
  selectedMedia,
  mediaPreview,
  onDraftChange,
  onMediaChange,
  onClearMedia,
  onOpenMedia,
  onRewardMedia,
  onSend,
  onClearMessages,
  onLogout,
  onRefresh,
  onResetCoins,
  resettingCoins,
  endRef,
}) => (
  <section className="portal-admin-shell portal-single-room-shell">
    <header className="portal-admin-header">
      <div className="portal-admin-badge">
        <ShieldCheck size={20} />
        <span>وضع الأدمن</span>
      </div>

      <div className="portal-admin-actions">
        <button className="portal-ghost-button" type="button" onClick={onRefresh}>
          <RefreshCw size={18} />
          <span>تحديث</span>
        </button>
        <button className="portal-ghost-button" type="button" onClick={onResetCoins} disabled={resettingCoins}>
          <RotateCcw size={18} />
          <span>إعادة ضبط الكوينات</span>
        </button>
        <button className="portal-danger-button" type="button" onClick={onClearMessages} disabled={clearing}>
          <Trash2 size={18} />
          <span>حذف جميع الرسائل</span>
        </button>
        <button className="portal-ghost-button" type="button" onClick={onLogout}>
          <LogOut size={18} />
          <span>خروج آمن</span>
        </button>
      </div>
    </header>

    <div className="portal-single-room-layout">
      <div className="portal-admin-chat portal-admin-chat-single">
        <header className="portal-chat-header portal-chat-header-admin">
          <div>
            <span className="portal-status-dot" />
            <p>غرفة واحدة مشتركة</p>
            <h2>رسائل المستخدم والأدمن</h2>
          </div>
          <div className="portal-admin-chip">ADMIN</div>
        </header>

        <ChatMessages
          messages={messages}
          mode="admin"
          loading={loading}
          error={error}
          endRef={endRef}
          onOpenMedia={onOpenMedia}
          onRewardMedia={onRewardMedia}
        />

        <ChatComposer
          value={draft}
          onChange={onDraftChange}
          onSubmit={onSend}
          placeholder="اكتب رد الأدمن..."
          disabled={sending}
          selectedMedia={selectedMedia}
          mediaPreview={mediaPreview}
          onMediaChange={onMediaChange}
          onClearMedia={onClearMedia}
        />
      </div>
    </div>
  </section>
);

const CoinDetailsModal = ({ coinBalance, rewards, onClose }) => {
  const totalEarned = rewards.reduce((sum, reward) => sum + Number(reward.coins || 0), 0);

  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="تفاصيل رصيد الكوينات" onClick={onClose}>
      <div className="portal-modal-panel portal-details-modal" onClick={(event) => event.stopPropagation()}>
        <button className="portal-modal-close" type="button" onClick={onClose} aria-label="إغلاق">
          <X size={20} />
        </button>

        <div className="portal-modal-heading">
          <Coins size={22} />
          <div>
            <span>تفاصيل الرصيد</span>
            <h3>رصيد الكوينات</h3>
          </div>
        </div>

        <div className="portal-stats-grid">
          <article>
            <span>الرصيد الحالي</span>
            <strong>{coinBalance} كوين</strong>
          </article>
          <article>
            <span>إعجابات الأدمن</span>
            <strong>{rewards.length}</strong>
          </article>
          <article>
            <span>المكتسب من الإعجابات</span>
            <strong>{totalEarned} كوين</strong>
          </article>
        </div>

        <div className="portal-reward-history">
          <h4>سجل المكافآت</h4>
          {rewards.length ? (
            rewards
              .slice()
              .reverse()
              .map((reward) => (
                <article key={reward.id || `${reward.createdAt}-${reward.coins}`}>
                  <span>{reward.mediaType === 'video' ? 'فيديو' : 'صورة'}</span>
                  <strong>+{reward.coins} كوين</strong>
                  <time dateTime={reward.createdAt}>{formatDateTime(reward.createdAt)}</time>
                </article>
              ))
          ) : (
            <p>لا توجد مكافآت من الأدمن حتى الآن.</p>
          )}
        </div>

        <p className="portal-details-note">
          رصيد الكوينات الذي تملكه عند فتح الموقع يمكنك سحبه مباشرة، أو استثماره داخل الموقع.
        </p>
      </div>
    </div>
  );
};

const RewardModal = ({ target, amount, error, saving, onAmountChange, onClose, onConfirm }) => {
  if (!target) {
    return null;
  }

  const mediaType = target.mediaType || getMediaType(target.mediaMime || target.imageMime, target.mediaUrl || target.imageUrl);

  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="منح مكافأة" onClick={onClose}>
      <form className="portal-modal-panel portal-reward-modal" onSubmit={onConfirm} onClick={(event) => event.stopPropagation()}>
        <button className="portal-modal-close" type="button" onClick={onClose} aria-label="إغلاق">
          <X size={20} />
        </button>

        <div className="portal-modal-heading">
          <Heart size={22} />
          <div>
            <span>{mediaType === 'video' ? 'إعجاب بالفيديو' : 'إعجاب بالصورة'}</span>
            <h3>منح كوينات للمستخدم</h3>
          </div>
        </div>

        <label className="portal-reward-field">
          <span>عدد الكوينات</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="مثال: 50"
            autoFocus
          />
        </label>

        {error ? <p className="portal-chat-error">{error}</p> : null}

        <div className="portal-modal-actions">
          <button className="portal-ghost-button" type="button" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button className="portal-primary-button" type="submit" disabled={saving}>
            {saving ? 'جاري المنح...' : 'تأكيد المكافأة'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ProjectSuspended = () => {
  const [session, setSession] = useState(readPortalSession);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chatError, setChatError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [activeMedia, setActiveMedia] = useState(null);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [coinBalance, setCoinBalance] = useState(DEFAULT_COIN_BALANCE);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [coinDetailsOpen, setCoinDetailsOpen] = useState(false);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardError, setRewardError] = useState('');
  const [rewarding, setRewarding] = useState(false);
  const [resettingCoins, setResettingCoins] = useState(false);
  const endRef = useRef(null);

  const chatUrl = useCallback(() => {
    return `/portal-chat?code=${encodeURIComponent(session?.code || '')}`;
  }, [session?.code]);

  const saveSession = (nextSession) => {
    setSession(nextSession);

    if (nextSession) {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      return;
    }

    window.sessionStorage.removeItem(SESSION_KEY);
  };

  const applyRoomData = useCallback((data) => {
    setMessages(data?.messages || []);
    setCoinBalance(Number.isFinite(Number(data?.coinBalance)) ? Number(data.coinBalance) : DEFAULT_COIN_BALANCE);
    setRewardHistory(Array.isArray(data?.rewardHistory) ? data.rewardHistory : []);
  }, []);

  const clearSelectedMedia = useCallback(() => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setSelectedMedia(null);
    setMediaPreview('');
  }, [mediaPreview]);

  const handleMediaChange = useCallback(
    (file) => {
      if (!file) {
        clearSelectedMedia();
        return;
      }

      const mediaType = getMediaType(file.type, file.name);

      if (!mediaType) {
        setChatError('يمكن إرسال الصور أو الفيديو فقط.');
        return;
      }

      if (mediaType === 'image' && file.size > MAX_IMAGE_SIZE) {
        setChatError('حجم الصورة كبير جداً، الحد الأقصى هو 10MB.');
        return;
      }

      if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE) {
        setChatError('حجم الفيديو كبير جداً، الحد الأقصى هو 100MB.');
        return;
      }

      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }

      setSelectedMedia(file);
      setMediaPreview(URL.createObjectURL(file));
      setChatError('');
    },
    [clearSelectedMedia, mediaPreview]
  );

  const markAdminMessagesRead = useCallback(
    async (nextMessages) => {
      if (session?.mode !== 'user') {
        return;
      }

      const hasUnreadAdminMessage = nextMessages.some((message) => message.sender === 'admin' && !message.readByUserAt);

      if (!hasUnreadAdminMessage) {
        return;
      }

      const { data } = await api.post('/portal-chat/read', { code: session.code });
      applyRoomData(data);
    },
    [applyRoomData, session?.code, session?.mode]
  );

  const fetchMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!session?.code) {
        return;
      }

      if (!silent) {
        setLoadingMessages(true);
      }

      try {
        const { data } = await api.get(chatUrl());
        const nextMessages = data.messages || [];
        applyRoomData(data);
        setChatError('');
        await markAdminMessagesRead(nextMessages);
      } catch (requestError) {
        setChatError(requestError.message || 'تعذر تحديث الرسائل. تأكد أن الخادم يعمل.');
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [applyRoomData, chatUrl, markAdminMessagesRead, session?.code]
  );

  const handleUnlock = (event) => {
    event.preventDefault();
    const answer = normalizeAnswer(code);

    if (isUserCode(answer) || isAdminCode(answer)) {
      saveSession(makeSession(answer));
      setError('');
      setCode('');
      setMessages([]);
      setCoinBalance(DEFAULT_COIN_BALANCE);
      setRewardHistory([]);
      return;
    }

    setError('الإجابة خاطئة، ربما قمت بكتابتها بشكل غير صحيح. حاول مرة أخرى.');
    setErrorKey((current) => current + 1);
  };

  const uploadSelectedMedia = async () => {
    if (!selectedMedia) {
      return null;
    }

    const formData = new FormData();
    formData.append('code', session.code);
    formData.append('media', selectedMedia);

    const { data } = await api.post('/portal-chat/uploads', formData);
    return data.media;
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();

    if ((!text && !selectedMedia) || !session?.code) {
      return;
    }

    setSending(true);

    try {
      const media = await uploadSelectedMedia();
      const { data } = await api.post('/portal-chat/messages', { text, media, code: session.code });
      applyRoomData(data);
      setDraft('');
      clearSelectedMedia();
      setChatError('');
    } catch (requestError) {
      setChatError(requestError.message || 'تعذر إرسال الرسالة.');
    } finally {
      setSending(false);
    }
  };

  const handleClearMessages = async () => {
    const confirmed = window.confirm('هل أنت متأكد أنك تريد حذف جميع الرسائل؟ لا يمكن التراجع عن هذا الإجراء.');

    if (!confirmed || session?.mode !== 'admin') {
      return;
    }

    setClearing(true);

    try {
      const { data } = await api.delete('/portal-chat/messages', {
        data: {
          code: session.code,
        },
      });
      applyRoomData(data);
      setChatError('');
      setActiveMedia(null);
    } catch (requestError) {
      setChatError(requestError.message || 'تعذر حذف الرسائل.');
    } finally {
      setClearing(false);
    }
  };

  const openRewardModal = (message) => {
    setRewardTarget(message);
    setRewardAmount('');
    setRewardError('');
  };

  const handleConfirmReward = async (event) => {
    event.preventDefault();

    if (session?.mode !== 'admin' || !rewardTarget) {
      return;
    }

    const coins = Number(rewardAmount);

    if (!Number.isInteger(coins) || coins <= 0) {
      setRewardError('أدخل عدد كوينات صحيح أكبر من صفر.');
      return;
    }

    setRewarding(true);
    setRewardError('');

    try {
      const { data } = await api.post('/portal-chat/rewards', {
        code: session.code,
        messageId: rewardTarget.id,
        coins,
      });
      applyRoomData(data);
      setRewardTarget(null);
      setRewardAmount('');
      setChatError('');
    } catch (requestError) {
      setRewardError(requestError.message || 'تعذر منح المكافأة.');
    } finally {
      setRewarding(false);
    }
  };

  const handleResetCoins = async () => {
    const confirmed = window.confirm('هل أنت متأكد أنك تريد إعادة ضبط رصيد الكوينات إلى 500؟');

    if (!confirmed || session?.mode !== 'admin') {
      return;
    }

    setResettingCoins(true);

    try {
      const { data } = await api.post('/portal-chat/coins/reset', { code: session.code });
      applyRoomData(data);
      setChatError('');
    } catch (requestError) {
      setChatError(requestError.message || 'تعذر إعادة ضبط الكوينات.');
    } finally {
      setResettingCoins(false);
    }
  };

  const handleLogout = () => {
    saveSession(null);
    setMessages([]);
    setDraft('');
    clearSelectedMedia();
    setActiveMedia(null);
    setCoinDetailsOpen(false);
    setRewardTarget(null);
    setRewardHistory([]);
    setCoinBalance(DEFAULT_COIN_BALANCE);
    setChatError('');
  };

  useEffect(() => {
    if (!session?.code) {
      return undefined;
    }

    fetchMessages();
    const intervalId = window.setInterval(() => {
      fetchMessages({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchMessages, session?.code]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, session?.mode]);

  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  if (session?.mode === 'user') {
    return (
      <PortalFrame mode="chat">
        <UserChat
          messages={messages}
          draft={draft}
          loading={loadingMessages}
          error={chatError}
          sending={sending}
          selectedMedia={selectedMedia}
          mediaPreview={mediaPreview}
          coinBalance={coinBalance}
          onDraftChange={setDraft}
          onMediaChange={handleMediaChange}
          onClearMedia={clearSelectedMedia}
          onOpenMedia={setActiveMedia}
          onShowCoinDetails={() => setCoinDetailsOpen(true)}
          onSend={handleSend}
          onLogout={handleLogout}
          endRef={endRef}
        />
        {coinDetailsOpen ? (
          <CoinDetailsModal coinBalance={coinBalance} rewards={rewardHistory} onClose={() => setCoinDetailsOpen(false)} />
        ) : null}
        <MediaLightbox media={activeMedia} onClose={() => setActiveMedia(null)} />
      </PortalFrame>
    );
  }

  if (session?.mode === 'admin') {
    return (
      <PortalFrame mode="admin">
        <AdminConsole
          messages={messages}
          draft={draft}
          loading={loadingMessages}
          error={chatError}
          sending={sending}
          clearing={clearing}
          selectedMedia={selectedMedia}
          mediaPreview={mediaPreview}
          onDraftChange={setDraft}
          onMediaChange={handleMediaChange}
          onClearMedia={clearSelectedMedia}
          onOpenMedia={setActiveMedia}
          onRewardMedia={openRewardModal}
          onSend={handleSend}
          onClearMessages={handleClearMessages}
          onLogout={handleLogout}
          onRefresh={() => fetchMessages()}
          onResetCoins={handleResetCoins}
          resettingCoins={resettingCoins}
          endRef={endRef}
        />
        <RewardModal
          target={rewardTarget}
          amount={rewardAmount}
          error={rewardError}
          saving={rewarding}
          onAmountChange={setRewardAmount}
          onClose={() => setRewardTarget(null)}
          onConfirm={handleConfirmReward}
        />
        <MediaLightbox media={activeMedia} onClose={() => setActiveMedia(null)} />
      </PortalFrame>
    );
  }

  return (
    <PortalFrame>
      <AccessGate code={code} error={error} errorKey={errorKey} onCodeChange={setCode} onSubmit={handleUnlock} />
    </PortalFrame>
  );
};

export default ProjectSuspended;
