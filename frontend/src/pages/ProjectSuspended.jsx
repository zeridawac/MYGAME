import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCheck,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  RefreshCw,
  SendHorizonal,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api/config.js';

const USER_CODES = ['الشتا كتصب', 'شتا كتصب'];
const ADMIN_CODE = 'admin';
const SESSION_KEY = 'reda_secure_portal_session';
const POLL_INTERVAL_MS = 1500;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
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

const MessageBubble = ({ message, mode }) => {
  const isAdminMessage = message.sender === 'admin';
  const isMine = (mode === 'admin' && isAdminMessage) || (mode === 'user' && !isAdminMessage);
  const senderLabel = isMine ? 'أنت' : isAdminMessage ? 'الأدمن' : 'المستخدم';
  const imageSrc = getAssetUrl(message.imageUrl);

  return (
    <article className={`portal-message ${isAdminMessage ? 'portal-message-admin' : 'portal-message-user'}`}>
      <div className="portal-message-meta">
        <span>{senderLabel}</span>
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>

      {imageSrc ? (
        <a className="portal-message-image-link" href={imageSrc} target="_blank" rel="noreferrer">
          <img src={imageSrc} alt={message.imageName || 'صورة داخل الرسالة'} className="portal-message-image" />
        </a>
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

const ChatComposer = ({
  value,
  disabled,
  placeholder,
  selectedImage,
  imagePreview,
  onChange,
  onImageChange,
  onClearImage,
  onSubmit,
}) => (
  <form className="portal-composer" onSubmit={onSubmit}>
    {imagePreview ? (
      <div className="portal-image-preview">
        <img src={imagePreview} alt="معاينة الصورة قبل الإرسال" />
        <div>
          <strong>{selectedImage?.name || 'صورة مرفقة'}</strong>
          <span>سيتم إرسال الصورة داخل المحادثة</span>
        </div>
        <button type="button" onClick={onClearImage} aria-label="إزالة الصورة">
          <X size={16} />
        </button>
      </div>
    ) : null}

    <div className="portal-composer-row">
      <label className={`portal-attach-button ${disabled ? 'is-disabled' : ''}`} aria-label="إرفاق صورة">
        <ImagePlus size={20} />
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(event) => {
            onImageChange(event.target.files?.[0] || null);
            event.target.value = '';
          }}
        />
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || (!value.trim() && !selectedImage)} aria-label="إرسال">
        <SendHorizonal size={20} />
      </button>
    </div>
  </form>
);

const ChatMessages = ({ messages, mode, loading, error, endRef }) => (
  <div className="portal-messages" aria-live="polite">
    {messages.length ? (
      messages.map((item) => <MessageBubble key={item.id} message={item} mode={mode} />)
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
  selectedImage,
  imagePreview,
  onDraftChange,
  onImageChange,
  onClearImage,
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
      <button className="portal-icon-button" type="button" onClick={onLogout} aria-label="خروج آمن">
        <LogOut size={20} />
      </button>
    </header>

    <ChatMessages messages={messages} mode="user" loading={loading} error={error} endRef={endRef} />

    <ChatComposer
      value={draft}
      onChange={onDraftChange}
      onSubmit={onSend}
      placeholder="اكتب رسالتك للأدمن..."
      disabled={sending}
      selectedImage={selectedImage}
      imagePreview={imagePreview}
      onImageChange={onImageChange}
      onClearImage={onClearImage}
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
  selectedImage,
  imagePreview,
  onDraftChange,
  onImageChange,
  onClearImage,
  onSend,
  onClearMessages,
  onLogout,
  onRefresh,
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

        <ChatMessages messages={messages} mode="admin" loading={loading} error={error} endRef={endRef} />

        <ChatComposer
          value={draft}
          onChange={onDraftChange}
          onSubmit={onSend}
          placeholder="اكتب رد الأدمن..."
          disabled={sending}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          onImageChange={onImageChange}
          onClearImage={onClearImage}
        />
      </div>
    </div>
  </section>
);

const ProjectSuspended = () => {
  const [session, setSession] = useState(readPortalSession);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chatError, setChatError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  const clearSelectedImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview('');
  }, [imagePreview]);

  const handleImageChange = useCallback(
    (file) => {
      if (!file) {
        clearSelectedImage();
        return;
      }

      if (!file.type.startsWith('image/')) {
        setChatError('يمكن إرسال الصور فقط.');
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setChatError('حجم الصورة يجب ألا يتجاوز 5MB.');
        return;
      }

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setChatError('');
    },
    [clearSelectedImage, imagePreview]
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
      setMessages(data.messages || []);
    },
    [session?.code, session?.mode]
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
        setMessages(nextMessages);
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
    [chatUrl, markAdminMessagesRead, session?.code]
  );

  const handleUnlock = (event) => {
    event.preventDefault();
    const answer = normalizeAnswer(code);

    if (isUserCode(answer) || isAdminCode(answer)) {
      saveSession(makeSession(answer));
      setError('');
      setCode('');
      setMessages([]);
      return;
    }

    setError('الإجابة خاطئة، ربما قمت بكتابتها بشكل غير صحيح. حاول مرة أخرى.');
    setErrorKey((current) => current + 1);
  };

  const uploadSelectedImage = async () => {
    if (!selectedImage) {
      return null;
    }

    const formData = new FormData();
    formData.append('code', session.code);
    formData.append('image', selectedImage);

    const { data } = await api.post('/portal-chat/uploads', formData);
    return data.image;
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();

    if ((!text && !selectedImage) || !session?.code) {
      return;
    }

    setSending(true);

    try {
      const image = await uploadSelectedImage();
      const { data } = await api.post('/portal-chat/messages', { text, image, code: session.code });
      setMessages(data.messages || []);
      setDraft('');
      clearSelectedImage();
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
      setMessages(data.messages || []);
      setChatError('');
    } catch (requestError) {
      setChatError(requestError.message || 'تعذر حذف الرسائل.');
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = () => {
    saveSession(null);
    setMessages([]);
    setDraft('');
    clearSelectedImage();
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
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (session?.mode === 'user') {
    return (
      <PortalFrame mode="chat">
        <UserChat
          messages={messages}
          draft={draft}
          loading={loadingMessages}
          error={chatError}
          sending={sending}
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          onDraftChange={setDraft}
          onImageChange={handleImageChange}
          onClearImage={clearSelectedImage}
          onSend={handleSend}
          onLogout={handleLogout}
          endRef={endRef}
        />
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
          selectedImage={selectedImage}
          imagePreview={imagePreview}
          onDraftChange={setDraft}
          onImageChange={handleImageChange}
          onClearImage={clearSelectedImage}
          onSend={handleSend}
          onClearMessages={handleClearMessages}
          onLogout={handleLogout}
          onRefresh={() => fetchMessages()}
          endRef={endRef}
        />
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
