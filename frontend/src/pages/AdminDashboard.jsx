import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Coins,
  FilePlus2,
  Gift,
  Megaphone,
  Settings,
  ShieldCheck,
  Ticket,
  Trash2,
  UsersRound,
  WalletCards,
  XCircle,
} from 'lucide-react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { useToast } from '../context/ToastContext.jsx';

const statusLabels = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

const tabs = [
  { id: 'users', label: 'المستخدمون', icon: UsersRound },
  { id: 'invites', label: 'الدعوات', icon: Ticket },
  { id: 'announcements', label: 'الإعلانات', icon: Megaphone },
  { id: 'assets', label: 'الأصول', icon: Coins },
  { id: 'coupons', label: 'الهدايا', icon: Gift },
  { id: 'settings', label: 'القيمة', icon: Settings },
  { id: 'activity', label: 'النشاط', icon: Activity },
  { id: 'withdrawals', label: 'السحب', icon: WalletCards },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [assets, setAssets] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [activity, setActivity] = useState([]);
  const [inviteForm, setInviteForm] = useState({ code: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });
  const [couponForm, setCouponForm] = useState({
    code: '',
    title: '',
    coins: 0,
    usageLimit: 1,
    active: true,
    oneTimePerUser: true,
  });
  const [assetForm, setAssetForm] = useState({
    symbol: '',
    name: '',
    nameAr: '',
    price: '',
    description: '',
  });
  const [userEdits, setUserEdits] = useState({});
  const { showToast } = useToast();

  const stats = useMemo(
    () => ({
      users: users.length,
      invites: inviteCodes.filter((item) => !item.used).length,
      pending: withdrawals.filter((item) => item.status === 'pending').length,
      assets: assets.filter((item) => item.isActive).length,
      coupons: coupons.filter((item) => item.active).length,
    }),
    [users, inviteCodes, withdrawals, assets, coupons]
  );

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [
        usersRes,
        invitesRes,
        announcementsRes,
        assetsRes,
        withdrawalsRes,
        couponsRes,
        activityRes,
      ] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/invite-codes'),
        api.get('/admin/announcements'),
        api.get('/admin/assets'),
        api.get('/admin/withdrawals'),
        api.get('/admin/coupons'),
        api.get('/admin/activity'),
      ]);

      setUsers(usersRes.data.users);
      setInviteCodes(invitesRes.data.inviteCodes);
      setAnnouncements(announcementsRes.data.announcements);
      setAssets(assetsRes.data.assets);
      setWithdrawals(withdrawalsRes.data.withdrawals);
      setCoupons(couponsRes.data.coupons);
      setActivity(activityRes.data.activity);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const createInviteCode = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/admin/invite-codes', inviteForm);
      setInviteCodes((current) => [data.inviteCode, ...current]);
      setInviteForm({ code: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const createAnnouncement = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/admin/announcements', announcementForm);
      setAnnouncements((current) => [data.announcement, ...current]);
      setAnnouncementForm({ title: '', body: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const createAsset = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/admin/assets', assetForm);
      setAssets((current) => [data.asset, ...current]);
      setAssetForm({ symbol: '', name: '', nameAr: '', price: '', description: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const updateUser = async (userId) => {
    try {
      const payload = userEdits[userId] || {};
      const { data } = await api.patch(`/admin/users/${userId}`, payload);
      setUsers((current) => current.map((item) => (item._id === userId ? data.user : item)));
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const toggleAsset = async (asset) => {
    try {
      const { data } = await api.patch(`/admin/assets/${asset._id}`, {
        isActive: !asset.isActive,
      });
      setAssets((current) => current.map((item) => (item._id === asset._id ? data.asset : item)));
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const reviewWithdrawal = async (withdrawalId, status) => {
    try {
      const { data } = await api.patch(`/admin/withdrawals/${withdrawalId}`, { status });
      setWithdrawals((current) =>
        current.map((item) => (item._id === withdrawalId ? data.withdrawal : item))
      );
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const createCoupon = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/admin/coupons', couponForm);
      setCoupons((current) => [data.coupon, ...current]);
      setCouponForm({
        code: '',
        title: '',
        coins: 0,
        usageLimit: 1,
        active: true,
        oneTimePerUser: true,
      });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const toggleCoupon = async (coupon) => {
    try {
      const { data } = await api.patch(`/admin/coupons/${coupon._id}`, {
        active: !coupon.active,
      });
      setCoupons((current) => current.map((item) => (item._id === coupon._id ? data.coupon : item)));
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const deleteCoupon = async (couponId) => {
    try {
      const { data } = await api.delete(`/admin/coupons/${couponId}`);
      setCoupons((current) => current.filter((item) => item._id !== couponId));
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const setEdit = (userId, field, value) => {
    setUserEdits((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">Admin</span>
          <h2>لوحة إدارة REDA INVEST GAME</h2>
          <p>إدارة الدعوات، المستخدمين، الإعلانات، الأصول وطلبات السحب من مكان واحد.</p>
        </div>
        <ShieldCheck size={46} />
      </section>

      <section className="admin-metrics">
        <article>
          <strong>{stats.users}</strong>
          <span>مستخدم</span>
        </article>
        <article>
          <strong>{stats.invites}</strong>
          <span>دعوات متاحة</span>
        </article>
        <article>
          <strong>{stats.assets}</strong>
          <span>أصول نشطة</span>
        </article>
        <article>
          <strong>{stats.coupons}</strong>
          <span>هدايا نشطة</span>
        </article>
        <article>
          <strong>{stats.pending}</strong>
          <span>سحب معلق</span>
        </article>
      </section>

      <section className="panel">
        <div className="admin-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'users' ? (
          <div className="table-wrap admin-table">
            <table>
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>عملات</th>
                  <th>حفظ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.username} {item.isAdmin ? '• مدير' : ''}
                    </td>
                    {['coins'].map((field) => (
                      <td key={field}>
                        <input
                          type="number"
                          min="0"
                          defaultValue={item[field]}
                          onChange={(event) => setEdit(item._id, field, event.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="ghost-button table-button" type="button" onClick={() => updateUser(item._id)}>
                        حفظ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'invites' ? (
          <div className="admin-section-grid">
            <form className="stack-form admin-form" onSubmit={createInviteCode}>
              <h3>كود دعوة جديد</h3>
              <label>
                <span>الكود اختياري</span>
                <input
                  value={inviteForm.code}
                  onChange={(event) => setInviteForm({ code: event.target.value.toUpperCase() })}
                  placeholder="مثال: VIP2026"
                />
              </label>
              <button className="primary-button" type="submit">
                <FilePlus2 size={18} />
                <span>إنشاء كود</span>
              </button>
            </form>
            <div className="mini-list">
              {inviteCodes.length ? (
                inviteCodes.map((item) => (
                  <article key={item._id}>
                    <div>
                      <strong>{item.code}</strong>
                      <span>{item.used ? `استعمله ${item.usedBy?.username || 'مستخدم'}` : 'متاح'}</span>
                    </div>
                    <span className={`status-badge ${item.used ? 'status-rejected' : 'status-approved'}`}>
                      {item.used ? 'مستخدم' : 'جديد'}
                    </span>
                  </article>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'announcements' ? (
          <div className="admin-section-grid">
            <form className="stack-form admin-form" onSubmit={createAnnouncement}>
              <h3>إعلان جديد</h3>
              <label>
                <span>العنوان</span>
                <input
                  value={announcementForm.title}
                  onChange={(event) =>
                    setAnnouncementForm({ ...announcementForm, title: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span>المحتوى</span>
                <textarea
                  rows="4"
                  value={announcementForm.body}
                  onChange={(event) =>
                    setAnnouncementForm({ ...announcementForm, body: event.target.value })
                  }
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                <Megaphone size={18} />
                <span>نشر الإعلان</span>
              </button>
            </form>
            <div className="mini-list">
              {announcements.length ? (
                announcements.map((item) => (
                  <article key={item._id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </div>
                    <span className="status-badge status-approved">نشط</span>
                  </article>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'assets' ? (
          <div className="admin-section-grid">
            <form className="stack-form admin-form" onSubmit={createAsset}>
              <h3>أصل جديد</h3>
              <label>
                <span>الرمز</span>
                <input
                  value={assetForm.symbol}
                  onChange={(event) => setAssetForm({ ...assetForm, symbol: event.target.value.toUpperCase() })}
                  required
                />
              </label>
              <label>
                <span>الاسم بالإنجليزية</span>
                <input
                  value={assetForm.name}
                  onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>الاسم بالعربية</span>
                <input
                  value={assetForm.nameAr}
                  onChange={(event) => setAssetForm({ ...assetForm, nameAr: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>السعر</span>
                <input
                  type="number"
                  min="1"
                  value={assetForm.price}
                  onChange={(event) => setAssetForm({ ...assetForm, price: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>الوصف</span>
                <textarea
                  rows="3"
                  value={assetForm.description}
                  onChange={(event) => setAssetForm({ ...assetForm, description: event.target.value })}
                />
              </label>
              <button className="primary-button" type="submit">
                <Coins size={18} />
                <span>إضافة أصل</span>
              </button>
            </form>
            <div className="mini-list">
              {assets.length ? (
                assets.map((item) => (
                  <article key={item._id}>
                    <div>
                      <strong>
                        {item.symbol} - {item.nameAr}
                      </strong>
                      <span>{item.price} عملة</span>
                    </div>
                    <button className="ghost-button table-button" type="button" onClick={() => toggleAsset(item)}>
                      {item.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </article>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'coupons' ? (
          <div className="admin-section-grid">
            <form className="stack-form admin-form" onSubmit={createCoupon}>
              <h3>كوبون هدية</h3>
              <label>
                <span>الكود</span>
                <input
                  value={couponForm.code}
                  onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })}
                  required
                />
              </label>
              <label>
                <span>العنوان</span>
                <input
                  value={couponForm.title}
                  onChange={(event) => setCouponForm({ ...couponForm, title: event.target.value })}
                />
              </label>
              <label>
                <span>عملات</span>
                <input
                  type="number"
                  min="0"
                  value={couponForm.coins}
                  onChange={(event) => setCouponForm({ ...couponForm, coins: event.target.value })}
                />
              </label>
              <label>
                <span>حد الاستخدام</span>
                <input
                  type="number"
                  min="1"
                  value={couponForm.usageLimit}
                  onChange={(event) => setCouponForm({ ...couponForm, usageLimit: event.target.value })}
                />
              </label>
              <label className="switch-line">
                <input
                  type="checkbox"
                  checked={couponForm.oneTimePerUser}
                  onChange={(event) =>
                    setCouponForm({ ...couponForm, oneTimePerUser: event.target.checked })
                  }
                />
                <span>مرة واحدة لكل مستخدم</span>
              </label>
              <button className="primary-button" type="submit">
                <Gift size={18} />
                <span>إنشاء كوبون</span>
              </button>
            </form>
            <div className="mini-list">
              {coupons.length ? (
                coupons.map((item) => (
                  <article key={item._id}>
                    <div>
                      <strong>{item.code}</strong>
                      <span>
                        +{item.coins} عملة - {item.usedCount}/{item.usageLimit}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button className="ghost-button table-button" type="button" onClick={() => toggleCoupon(item)}>
                        {item.active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button className="danger-button table-button" type="button" onClick={() => deleteCoupon(item._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'settings' ? (
          <section className="stack-form admin-form settings-form">
            <h3>قيمة الكوينات بالدرهم</h3>
            <p className="helper-text">التحويل المعروض حاليا ثابت: 1000 كوين = 100 DH.</p>
            <p className="helper-text">مثال: 600 كوين = 60 DH.</p>
            <p className="helper-text">هذه قيمة عرض فقط ولا تغير رصيد أي مستخدم في قاعدة البيانات.</p>
          </section>
        ) : null}

        {activeTab === 'activity' ? (
          activity.length ? (
            <div className="mini-list">
              {activity.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.user?.username || 'مستخدم'} - {new Date(item.createdAt).toLocaleDateString('ar-MA')}
                    </span>
                  </div>
                  <div>
                    <strong>{item.coins >= 0 ? '+' : ''}{item.coins} عملة</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="لا يوجد نشاط" text="حركة التداول والهدايا ستظهر هنا." />
          )
        ) : null}

        {activeTab === 'withdrawals' ? (
          withdrawals.length ? (
            <div className="mini-list">
              {withdrawals.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>
                      {item.user?.username || 'مستخدم'} - {item.amount} عملة
                    </strong>
                    <span>
                      {item.bankSnapshot?.bankName} / {item.bankSnapshot?.accountNumber}
                    </span>
                  </div>
                  {item.status === 'pending' ? (
                    <div className="row-actions">
                      <button
                        className="success-button"
                        type="button"
                        onClick={() => reviewWithdrawal(item._id, 'approved')}
                      >
                        <BadgeCheck size={17} />
                        <span>قبول</span>
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => reviewWithdrawal(item._id, 'rejected')}
                      >
                        <XCircle size={17} />
                        <span>رفض</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`status-badge status-${item.status}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد طلبات سحب" text="طلبات المستخدمين ستظهر هنا." />
          )
        ) : null}
      </section>
    </div>
  );
};

export default AdminDashboard;
