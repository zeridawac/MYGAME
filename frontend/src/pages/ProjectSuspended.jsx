import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  SendHorizonal,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const USER_CODE = 'الشتا كتصب';
const ADMIN_CODE = 'admin';
const SESSION_KEY = 'reda_secure_portal_session';
const CONVERSATIONS_KEY = 'reda_secure_portal_conversations';
const USER_CONVERSATION_KEY = 'reda_secure_portal_user_conversation';

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const readStorage = (key, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return safeJsonParse(window.localStorage.getItem(key), fallback);
};

const writeStorage = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const makeConversation = () => {
  const id = makeId();
  const now = new Date().toISOString();
  const shortId = id.slice(0, 4).toUpperCase();

  return {
    id,
    alias: `زائر مشفر ${shortId}`,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

const sortConversations = (items) => {
  return [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

const formatTime = (value) => {
  return new Intl.DateTimeFormat('ar-MA', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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
        type="password"
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

const MessageBubble = ({ message }) => {
  const isAdmin = message.role === 'admin';

  return (
    <article className={`portal-message ${isAdmin ? 'portal-message-admin' : 'portal-message-user'}`}>
      <div className="portal-message-meta">
        <span>{isAdmin ? 'الأدمن' : 'أنت'}</span>
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

const UserChat = ({ conversation, message, onMessageChange, onSend, onLogout, endRef }) => (
  <section className="portal-chat-shell">
    <header className="portal-chat-header">
      <div>
        <span className="portal-status-dot" />
        <p>اتصال مشفر مع الأدمن</p>
        <h2>{conversation?.alias || 'زائر مشفر'}</h2>
      </div>
      <button className="portal-icon-button" type="button" onClick={onLogout} aria-label="خروج آمن">
        <LogOut size={20} />
      </button>
    </header>

    <div className="portal-messages" aria-live="polite">
      {conversation?.messages?.length ? (
        conversation.messages.map((item) => <MessageBubble key={item.id} message={item} />)
      ) : (
        <div className="portal-empty-chat">
          <MessageSquareText size={34} />
          <p>القناة مفتوحة الآن. اكتب رسالتك وسيظهر الرد هنا.</p>
        </div>
      )}
      <span ref={endRef} />
    </div>

    <ChatComposer
      value={message}
      onChange={onMessageChange}
      onSubmit={onSend}
      placeholder="اكتب رسالتك للأدمن..."
      disabled={!conversation}
    />
  </section>
);

const AdminConsole = ({
  conversations,
  selectedConversation,
  selectedConversationId,
  reply,
  onSelectConversation,
  onReplyChange,
  onReply,
  onLogout,
  endRef,
}) => (
  <section className="portal-admin-shell">
    <header className="portal-admin-header">
      <div className="portal-admin-badge">
        <ShieldCheck size={20} />
        <span>وضع الأدمن</span>
      </div>
      <button className="portal-ghost-button" type="button" onClick={onLogout}>
        <LogOut size={18} />
        <span>خروج آمن</span>
      </button>
    </header>

    <div className="portal-admin-layout">
      <aside className="portal-conversation-list" aria-label="كل المحادثات">
        <div className="portal-list-title">
          <MessageSquareText size={18} />
          <span>المحادثات</span>
        </div>

        {conversations.length ? (
          conversations.map((conversation) => {
            const isActive = conversation.id === selectedConversationId;
            const lastMessage = conversation.messages[conversation.messages.length - 1];

            return (
              <button
                className={`portal-conversation-card ${isActive ? 'is-active' : ''}`}
                type="button"
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <UserRound size={18} />
                <span>
                  <strong>{conversation.alias}</strong>
                  <small>{lastMessage?.text || 'لا توجد رسائل بعد'}</small>
                </span>
                <ChevronLeft size={16} />
              </button>
            );
          })
        ) : (
          <div className="portal-admin-empty">
            <p>لا توجد محادثات حاليا.</p>
          </div>
        )}
      </aside>

      <div className="portal-admin-chat">
        <header className="portal-chat-header portal-chat-header-admin">
          <div>
            <span className="portal-status-dot" />
            <p>لوحة الرد المشفر</p>
            <h2>{selectedConversation?.alias || 'اختر محادثة'}</h2>
          </div>
          <div className="portal-admin-chip">ADMIN</div>
        </header>

        <div className="portal-messages" aria-live="polite">
          {selectedConversation?.messages?.length ? (
            selectedConversation.messages.map((item) => <MessageBubble key={item.id} message={item} />)
          ) : (
            <div className="portal-empty-chat">
              <MessageSquareText size={34} />
              <p>اختر محادثة من القائمة أو انتظر رسالة جديدة.</p>
            </div>
          )}
          <span ref={endRef} />
        </div>

        <ChatComposer
          value={reply}
          onChange={onReplyChange}
          onSubmit={onReply}
          placeholder="اكتب رد الأدمن..."
          disabled={!selectedConversation}
        />
      </div>
    </div>
  </section>
);

const ProjectSuspended = () => {
  const [session, setSession] = useState(() => readStorage(SESSION_KEY, null));
  const [conversations, setConversations] = useState(() => sortConversations(readStorage(CONVERSATIONS_KEY, [])));
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [userMessage, setUserMessage] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const endRef = useRef(null);

  const selectedConversation = useMemo(() => {
    if (session?.mode === 'user') {
      return conversations.find((conversation) => conversation.id === session.conversationId);
    }

    return conversations.find((conversation) => conversation.id === selectedConversationId);
  }, [conversations, selectedConversationId, session]);

  const updateConversations = (updater) => {
    setConversations((current) => {
      const next = sortConversations(updater(current));
      writeStorage(CONVERSATIONS_KEY, next);
      return next;
    });
  };

  const setPortalSession = (nextSession) => {
    setSession(nextSession);
    if (nextSession) {
      writeStorage(SESSION_KEY, nextSession);
      return;
    }

    window.localStorage.removeItem(SESSION_KEY);
  };

  const ensureUserConversation = () => {
    const savedId = window.localStorage.getItem(USER_CONVERSATION_KEY);
    const existing = conversations.find((conversation) => conversation.id === savedId);

    if (existing) {
      return existing;
    }

    const conversation = makeConversation();
    const next = sortConversations([...conversations, conversation]);
    setConversations(next);
    writeStorage(CONVERSATIONS_KEY, next);
    window.localStorage.setItem(USER_CONVERSATION_KEY, conversation.id);
    return conversation;
  };

  const handleUnlock = (event) => {
    event.preventDefault();
    const answer = code.trim();

    if (answer === USER_CODE) {
      const conversation = ensureUserConversation();
      setPortalSession({ mode: 'user', conversationId: conversation.id });
      setError('');
      setCode('');
      return;
    }

    if (answer.toLowerCase() === ADMIN_CODE) {
      setPortalSession({ mode: 'admin' });
      setSelectedConversationId(conversations[0]?.id || null);
      setError('');
      setCode('');
      return;
    }

    setError('الإجابة خاطئة، ربما قمت بكتابتها بشكل غير صحيح. حاول مرة أخرى.');
    setErrorKey((current) => current + 1);
  };

  const sendMessage = (conversationId, role, text) => {
    const body = text.trim();

    if (!body || !conversationId) {
      return;
    }

    const now = new Date().toISOString();
    const message = {
      id: makeId(),
      role,
      text: body,
      createdAt: now,
    };

    updateConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              updatedAt: now,
              messages: [...conversation.messages, message],
            }
          : conversation
      )
    );
  };

  const handleUserSend = (event) => {
    event.preventDefault();
    sendMessage(session?.conversationId, 'user', userMessage);
    setUserMessage('');
  };

  const handleAdminReply = (event) => {
    event.preventDefault();
    sendMessage(selectedConversationId, 'admin', adminReply);
    setAdminReply('');
  };

  const handleLogout = () => {
    setPortalSession(null);
    setSelectedConversationId(null);
    setUserMessage('');
    setAdminReply('');
  };

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === CONVERSATIONS_KEY) {
        setConversations(sortConversations(readStorage(CONVERSATIONS_KEY, [])));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (session?.mode === 'admin' && conversations.length && !conversations.some((item) => item.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, session]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedConversation?.messages?.length, session?.mode]);

  if (session?.mode === 'user') {
    return (
      <PortalFrame mode="chat">
        <UserChat
          conversation={selectedConversation}
          message={userMessage}
          onMessageChange={setUserMessage}
          onSend={handleUserSend}
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
          conversations={conversations}
          selectedConversation={selectedConversation}
          selectedConversationId={selectedConversationId}
          reply={adminReply}
          onSelectConversation={setSelectedConversationId}
          onReplyChange={setAdminReply}
          onReply={handleAdminReply}
          onLogout={handleLogout}
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
