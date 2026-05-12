import { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink, ImagePlus, SendHorizontal } from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useToast } from '../context/ToastContext.jsx';

const statusLabels = {
  pending: 'قيد المراجعة',
  approved: 'مقبولة',
  rejected: 'مرفوضة',
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState(null);
  const { showToast } = useToast();

  const loadTasks = async () => {
    try {
      const { data } = await api.get('/tasks');
      setTasks(data.tasks);
      setSubmissions(data.submissions);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const setForm = (taskId, patch) => {
    setForms((current) => ({
      ...current,
      [taskId]: {
        proofText: '',
        proofImage: '',
        ...current[taskId],
        ...patch,
      },
    }));
  };

  const readImage = (taskId, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setForm(taskId, { proofImage: reader.result });
    reader.onerror = () => showToast('تعذر قراءة الصورة', 'error');
    reader.readAsDataURL(file);
  };

  const submitTask = async (event, taskId) => {
    event.preventDefault();
    setBusyTask(taskId);

    try {
      const { data } = await api.post(`/tasks/${taskId}/submit`, forms[taskId] || {});
      setSubmissions((current) => [data.submission, ...current]);
      setForm(taskId, { proofText: '', proofImage: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusyTask(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">ربح النقاط عبر المهام</span>
          <h2>أنجز مهام بسيطة وأرسل إثباتك للمراجعة.</h2>
          <p>عند قبول الإدارة، تضاف المكافأة مباشرة إلى حسابك.</p>
        </div>
        <ClipboardCheck size={48} />
      </section>

      <section className="tasks-grid">
        {tasks.length ? (
          tasks.map((task) => (
            <article className="task-card" key={task._id}>
              <div className="task-card-head">
                <div>
                  <span className="eyebrow">مهمة</span>
                  <h3>{task.title}</h3>
                </div>
                <strong>
                  +{task.rewardCoins} عملة / +{task.rewardPoints} نقطة
                </strong>
              </div>
              <p>{task.description}</p>
              {task.link ? (
                <a className="ghost-button task-link" href={task.link} target="_blank" rel="noreferrer">
                  <ExternalLink size={17} />
                  <span>فتح الرابط</span>
                </a>
              ) : null}
              <form className="stack-form" onSubmit={(event) => submitTask(event, task._id)}>
                <label>
                  <span>رسالة الإثبات</span>
                  <textarea
                    rows="3"
                    value={forms[task._id]?.proofText || ''}
                    onChange={(event) => setForm(task._id, { proofText: event.target.value })}
                    required
                  />
                </label>
                <label className="upload-control">
                  <ImagePlus size={18} />
                  <span>{forms[task._id]?.proofImage ? 'تم اختيار صورة' : 'صورة اختيارية'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => readImage(task._id, event.target.files?.[0])}
                  />
                </label>
                <button className="primary-button" type="submit" disabled={busyTask === task._id}>
                  <SendHorizontal size={18} />
                  <span>{busyTask === task._id ? 'جاري الإرسال...' : 'إرسال للمراجعة'}</span>
                </button>
              </form>
            </article>
          ))
        ) : (
          <EmptyState title="لا توجد مهام نشطة" text="ستظهر المهام التي ينشرها المدير هنا." />
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">إرسالاتي</span>
            <h3>حالة المهام</h3>
          </div>
        </div>
        {submissions.length ? (
          <div className="mini-list">
            {submissions.map((item) => (
              <article key={item._id}>
                <div>
                  <strong>{item.task?.title || 'مهمة'}</strong>
                  <span>{new Date(item.createdAt).toLocaleDateString('ar-MA')}</span>
                </div>
                <span className={`status-badge status-${item.status}`}>
                  {statusLabels[item.status] || item.status}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد إرسالات" text="بعد إرسال إثبات مهمة سيظهر هنا." />
        )}
      </section>
    </div>
  );
};

export default Tasks;
