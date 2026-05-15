import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  RefreshCw,
  SendHorizonal,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import api from '../api/config.js';

const USER_CODE = 'الشتا كتصب';
const ADMIN_CODE = 'admin';
const SESSION_KEY = 'reda_secure_portal_session';
const POLL_INTERVAL_MS = 1500;

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const readPortalSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const session = safeJsonParse(window.localStorage.getItem(SESSION_KEY), null);

  if (!session?.mode || !session?.code) {
    window.localStorage.removeItem(SESSION_KEY);
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
  const code = answer.trim();
  return {
    mode: code.toLowerCase() === ADMIN_CODE ? 'admin' : 'user',
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

  return (
    <article className={`portal-message ${isAdminMessage ? 'portal-message-admin' : 'portal-message-user'}`}>
      <div className="portal-message-meta">
        <span>{senderLabel}</span>
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>
      <p>{message.text}</p>
    </article>
  );
};

const ChatComposer = ({ value, disabled, placeholder, onChange, onSubmit }) => (
  <form className="portal-composer" onSubmit={onSubmit}>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
    <button type="submit" disabled={disabled || !value.trim()} aria-label="إرسال">
      <SendHorizonal size={20} />
    </button>
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

const UserChat = ({ messages, draft, loading, error, sending, onDraftChange, onSend, onLogout, endRef }) => (
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
  onDraftChange,
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
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const endRef = useRef(null);

  const chatUrl = useCallback(() => {
    return `/portal-chat?code=${encodeURIComponent(session?.code || '')}`;
  }, [session?.code]);

  const saveSession = (nextSession) => {
    setSession(nextSession);

    if (nextSession) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      return;
    }

    window.localStorage.removeItem(SESSION_KEY);
  };

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
        setMessages(data.messages || []);
        setChatError('');
      } catch (requestError) {
        setChatError(requestError.message || 'تعذر تحديث الرسائل. تأكد أن الخادم يعمل.');
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [chatUrl, session?.code]
  );

  const handleUnlock = (event) => {
    event.preventDefault();
    const answer = code.trim();

    if (answer === USER_CODE || answer.toLowerCase() === ADMIN_CODE) {
      saveSession(makeSession(answer));
      setError('');
      setCode('');
      setMessages([]);
      return;
    }

    setError('الإجابة خاطئة، ربما قمت بكتابتها بشكل غير صحيح. حاول مرة أخرى.');
    setErrorKey((current) => current + 1);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();

    if (!text || !session?.code) {
      return;
    }

    setSending(true);

    try {
      const { data } = await api.post('/portal-chat/messages', { text, code: session.code });
      setMessages(data.messages || []);
      setDraft('');
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

  if (session?.mode === 'user') {
    return (
      <PortalFrame mode="chat">
        <UserChat
          messages={messages}
          draft={draft}
          loading={loadingMessages}
          error={chatError}
          sending={sending}
          onDraftChange={setDraft}
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
          onDraftChange={setDraft}
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
