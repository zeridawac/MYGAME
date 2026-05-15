import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCheck,
  Film,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Play,
  RefreshCw,
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
const MAX_MEDIA_SIZE = 25 * 1024 * 1024;
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

  return /\.(mp4|webm|mov)$/i.test(fallback) ? 'video' : fallback ? 'image' : '';
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

const MessageBubble = ({ message, mode, onOpenMedia }) => {
  const isAdminMessage = message.sender === 'admin';
  const isMine = (mode === 'admin' && isAdminMessage) || (mode === 'user' && !isAdminMessage);
  const senderLabel = isMine ? 'أنت' : isAdminMessage ? 'الأدمن' : 'المستخدم';
  const mediaUrl = getAssetUrl(message.mediaUrl || message.imageUrl);
  const mediaName = message.mediaName || message.imageName || 'وسائط داخل الرسالة';
  const mediaMime = message.mediaMime || message.imageMime || '';
  const mediaType = message.mediaType || getMediaType(mediaMime, mediaUrl);

  return (
    <article className={`portal-message ${isAdminMessage ? 'portal-message-admin' : 'portal-message-user'}`}>
      <div className="portal-message-meta">
        <span>{senderLabel}</span>
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>

      {mediaUrl ? (
        <button
          className={`portal-media-thumb portal-media-thumb-${mediaType || 'image'}`}
          type="button"
          onClick={() => onOpenMedia({ url: mediaUrl, name: mediaName, type: mediaType, mimeType: mediaMime })}
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
            <div className="portal-media-menu">
              <MediaInputOption accept="image/*" icon={UploadCloud} label="رفع صورة" disabled={disabled} onPick={handlePick} />
              <MediaInputOption accept="image/*" capture="environment" icon={Camera} label="التقاط صورة" disabled={disabled} onPick={handlePick} />
              <MediaInputOption accept="video/*" icon={Film} label="رفع فيديو" disabled={disabled} onPick={handlePick} />
              <MediaInputOption accept="video/*" capture="environment" icon={Video} label="تسجيل فيديو" disabled={disabled} onPick={handlePick} />
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

const ChatMessages = ({ messages, mode, loading, error, endRef, onOpenMedia }) => (
  <div className="portal-messages" aria-live="polite">
    {messages.length ? (
      messages.map((item) => <MessageBubble key={item.id} message={item} mode={mode} onOpenMedia={onOpenMedia} />)
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
  onDraftChange,
  onMediaChange,
  onClearMedia,
  onOpenMedia,
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

        <ChatMessages messages={messages} mode="admin" loading={loading} error={error} endRef={endRef} onOpenMedia={onOpenMedia} />

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

      if (file.size > MAX_MEDIA_SIZE) {
        setChatError('حجم الملف يجب ألا يتجاوز 25MB.');
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
      setMessages(data.messages || []);
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
      setMessages(data.messages || []);
      setChatError('');
      setActiveMedia(null);
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
    clearSelectedMedia();
    setActiveMedia(null);
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
          onDraftChange={setDraft}
          onMediaChange={handleMediaChange}
          onClearMedia={clearSelectedMedia}
          onOpenMedia={setActiveMedia}
          onSend={handleSend}
          onLogout={handleLogout}
          endRef={endRef}
        />
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
          onSend={handleSend}
          onClearMessages={handleClearMessages}
          onLogout={handleLogout}
          onRefresh={() => fetchMessages()}
          endRef={endRef}
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
