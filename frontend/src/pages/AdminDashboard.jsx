import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Coins,
  FilePlus2,
  Gift,
  ImagePlus,
  Megaphone,
  PackageCheck,
  Settings,
  ShoppingBag,
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
import { formatCoins } from '../utils/coins.js';
import { productImageUrl } from '../utils/storeImages.js';

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
  { id: 'store', label: 'المتجر', icon: ShoppingBag },
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
  const [storeProducts, setStoreProducts] = useState([]);
  const [storeOrders, setStoreOrders] = useState([]);
  const [popupForm, setPopupForm] = useState({
    enabled: true,
    title: 'إعلان المتجر',
    message:
      'تم إطلاق متجر جديد داخل المنصة. يمكنك الآن اختيار منتجات متنوعة والدفع باستعمال الكوينات فقط. سيتم إيصال المنتجات قريباً فور فتح الموقع بشكل كامل.',
    buttonText: 'دخول المتجر',
    targetPath: '/store',
  });
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
  const [storeForm, setStoreForm] = useState({
    title: '',
    description: '',
    category: 'منتجات رقمية',
    originalPrice: '',
    discountPercent: 30,
    finalPrice: '',
    stockQuantity: 10,
    rating: '',
    promoBadge: '',
    sourceUrl: '',
    sourceProvider: '',
    sourceCurrency: '',
    sourcePriceAmount: '',
    sourcePriceDh: '',
    sourceOriginalPriceAmount: '',
    sourceOriginalPriceDh: '',
    featured: false,
    active: true,
  });
  const [storeImages, setStoreImages] = useState([]);
  const [temuUrl, setTemuUrl] = useState('');
  const [temuImporting, setTemuImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importedImages, setImportedImages] = useState([]);
  const [storeEdits, setStoreEdits] = useState({});
  const [storeEditImages, setStoreEditImages] = useState({});
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
      store: storeProducts.filter((item) => item.active).length,
    }),
    [users, inviteCodes, withdrawals, assets, coupons, storeProducts]
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
        storeProductsRes,
        storeOrdersRes,
        popupRes,
        activityRes,
      ] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/invite-codes'),
        api.get('/admin/announcements'),
        api.get('/admin/assets'),
        api.get('/admin/withdrawals'),
        api.get('/admin/coupons'),
        api.get('/admin/store/products'),
        api.get('/admin/store/orders'),
        api.get('/admin/settings/store-popup'),
        api.get('/admin/activity'),
      ]);

      setUsers(usersRes.data.users);
      setInviteCodes(invitesRes.data.inviteCodes);
      setAnnouncements(announcementsRes.data.announcements);
      setAssets(assetsRes.data.assets);
      setWithdrawals(withdrawalsRes.data.withdrawals);
      setCoupons(couponsRes.data.coupons);
      setStoreProducts(storeProductsRes.data.products);
      setStoreOrders(storeOrdersRes.data.orders);
      setPopupForm(popupRes.data.storePopup);
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

  const appendStoreFields = (formData, payload) => {
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, value ?? '');
    });
  };

  const clearImportedProduct = () => {
    setTemuUrl('');
    setImportPreview(null);
    setImportedImages([]);
    setStoreForm((current) => ({
      ...current,
      sourceUrl: '',
      sourceProvider: '',
      sourceCurrency: '',
      sourcePriceAmount: '',
      sourcePriceDh: '',
      sourceOriginalPriceAmount: '',
      sourceOriginalPriceDh: '',
    }));
  };

  const previewTemuProduct = async () => {
    if (!temuUrl.trim()) {
      showToast('ضع رابط المنتج أولا', 'error');
      return;
    }

    setTemuImporting(true);
    try {
      const { data } = await api.post('/admin/store/products/import-preview', { url: temuUrl.trim() });
      const product = data.product;
      setImportPreview(product);
      setImportedImages(product.images || []);
      setStoreForm((current) => ({
        ...current,
        title: product.title || current.title,
        description: product.description || current.description,
        category: product.category || current.category,
        originalPrice: product.originalPrice || current.originalPrice,
        discountPercent: product.discountPercent ?? current.discountPercent,
        finalPrice: product.finalPrice || current.finalPrice,
        stockQuantity: product.stockQuantity ?? current.stockQuantity,
        rating: product.rating ?? '',
        promoBadge: product.promoBadge || '',
        sourceUrl: product.sourceUrl || temuUrl.trim(),
        sourceProvider: product.sourceProvider || 'temu',
        sourceCurrency: product.sourceCurrency || '',
        sourcePriceAmount: product.sourcePriceAmount ?? '',
        sourcePriceDh: product.sourcePriceDh ?? '',
        sourceOriginalPriceAmount: product.sourceOriginalPriceAmount ?? '',
        sourceOriginalPriceDh: product.sourceOriginalPriceDh ?? '',
        featured: Boolean(product.featured),
        active: true,
      }));
      showToast(data.message || 'تم جلب معاينة المنتج', 'success');
    } catch (error) {
      showToast(error.message || 'تعذر جلب بيانات المنتج', 'error');
    } finally {
      setTemuImporting(false);
    }
  };

  const removeImportedImage = (index) => {
    setImportedImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  };

  const createStoreProduct = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData();
      appendStoreFields(formData, storeForm);
      if (importedImages.length) {
        formData.append('remoteImages', JSON.stringify(importedImages));
      }
      Array.from(storeImages).forEach((file) => formData.append('images', file));

      const { data } = await api.post('/admin/store/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStoreProducts((current) => [data.product, ...current]);
      setStoreForm({
        title: '',
        description: '',
        category: 'منتجات رقمية',
        originalPrice: '',
        discountPercent: 30,
        finalPrice: '',
        stockQuantity: 10,
        rating: '',
        promoBadge: '',
        sourceUrl: '',
        sourceProvider: '',
        sourceCurrency: '',
        sourcePriceAmount: '',
        sourcePriceDh: '',
        sourceOriginalPriceAmount: '',
        sourceOriginalPriceDh: '',
        featured: false,
        active: true,
      });
      setStoreImages([]);
      clearImportedProduct();
      event.target.reset();
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const setStoreEdit = (productId, field, value) => {
    setStoreEdits((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: value,
      },
    }));
  };

  const updateStoreProduct = async (product) => {
    try {
      const productId = product.id || product._id;
      const payload = storeEdits[productId] || {};
      const files = Array.from(storeEditImages[productId] || []);
      const requestBody = files.length ? new FormData() : payload;
      const requestConfig = files.length ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

      if (files.length) {
        appendStoreFields(requestBody, payload);
        files.forEach((file) => requestBody.append('images', file));
      }

      const { data } = await api.patch(`/admin/store/products/${productId}`, requestBody, requestConfig);
      setStoreProducts((current) => current.map((item) => (item.id === data.product.id ? data.product : item)));
      setStoreEditImages((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const quickPatchStoreProduct = async (product, patch) => {
    try {
      const { data } = await api.patch(`/admin/store/products/${product.id || product._id}`, patch);
      setStoreProducts((current) => current.map((item) => (item.id === data.product.id ? data.product : item)));
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const deleteStoreProduct = async (product) => {
    try {
      const { data } = await api.delete(`/admin/store/products/${product.id || product._id}`);
      setStoreProducts((current) => current.filter((item) => item.id !== (product.id || product._id)));
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const updatePopupSettings = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.patch('/admin/settings/store-popup', popupForm);
      setPopupForm(data.storePopup);
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
          <strong>{stats.store}</strong>
          <span>منتجات نشطة</span>
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

        {activeTab === 'store' ? (
          <div className="admin-section-grid admin-store-grid">
            <form className="stack-form admin-form" onSubmit={createStoreProduct}>
              <h3>منتج جديد</h3>
              <div className="store-import-box">
                <div>
                  <span className="eyebrow">Temu Import</span>
                  <strong>استيراد تلقائي من رابط Temu</strong>
                  <p>الصق رابط المنتج، راجع المعاينة، ثم عدل البيانات قبل النشر.</p>
                </div>
                <div className="store-import-row">
                  <input
                    value={temuUrl}
                    onChange={(event) => setTemuUrl(event.target.value)}
                    placeholder="https://www.temu.com/..."
                    type="url"
                  />
                  <button className="ghost-button" type="button" onClick={previewTemuProduct} disabled={temuImporting}>
                    {temuImporting ? 'جاري الجلب...' : 'جلب المنتج'}
                  </button>
                </div>

                {importPreview ? (
                  <div className="store-import-preview">
                    <img
                      src={productImageUrl({ title: storeForm.title, category: storeForm.category, images: importedImages })}
                      alt={storeForm.title}
                    />
                    <div>
                      <strong>{storeForm.title}</strong>
                      <span>
                        {storeForm.sourcePriceAmount
                          ? `${storeForm.sourcePriceAmount} ${storeForm.sourceCurrency || 'DH'} → `
                          : ''}
                        {formatCoins(storeForm.finalPrice || 0)} كوين
                      </span>
                      <small>
                        {storeForm.sourcePriceDh ? `${storeForm.sourcePriceDh} DH محولة • ` : ''}
                        {storeForm.promoBadge || 'وصل حديثا'} • مخزون {storeForm.stockQuantity}
                      </small>
                    </div>
                    <button className="ghost-button table-button" type="button" onClick={clearImportedProduct}>
                      مسح المعاينة
                    </button>
                  </div>
                ) : null}

                {importPreview ? (
                  <div className="store-import-price-grid">
                    <article>
                      <span>السعر المستخرج</span>
                      <strong>
                        {storeForm.sourcePriceAmount || storeForm.sourcePriceDh} {storeForm.sourceCurrency || 'DH'}
                      </strong>
                    </article>
                    <article>
                      <span>بعد التحويل</span>
                      <strong>{storeForm.sourcePriceDh || 0} DH</strong>
                    </article>
                    <article>
                      <span>الأصلي</span>
                      <strong>
                        {storeForm.sourceOriginalPriceAmount
                          ? `${storeForm.sourceOriginalPriceAmount} ${storeForm.sourceCurrency || 'DH'}`
                          : `${formatCoins(storeForm.originalPrice || 0)} كوين`}
                      </strong>
                    </article>
                    <article>
                      <span>النهائي</span>
                      <strong>{formatCoins(storeForm.finalPrice || 0)} كوين</strong>
                    </article>
                    <article>
                      <span>الخصم</span>
                      <strong>{storeForm.discountPercent || 0}%</strong>
                    </article>
                  </div>
                ) : null}

                {importedImages.length ? (
                  <div className="store-import-gallery">
                    {importedImages.map((image, index) => (
                      <figure key={`${image.url}-${index}`}>
                        <img src={productImageUrl({ images: [image], title: storeForm.title })} alt={`صورة ${index + 1}`} />
                        <button type="button" onClick={() => removeImportedImage(index)}>
                          ×
                        </button>
                      </figure>
                    ))}
                  </div>
                ) : null}
              </div>
              <label>
                <span>عنوان المنتج</span>
                <input
                  value={storeForm.title}
                  onChange={(event) => setStoreForm({ ...storeForm, title: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>الوصف</span>
                <textarea
                  rows="4"
                  value={storeForm.description}
                  onChange={(event) => setStoreForm({ ...storeForm, description: event.target.value })}
                />
              </label>
              <div className="form-two">
                <label>
                  <span>التصنيف</span>
                  <input
                    value={storeForm.category}
                    onChange={(event) => setStoreForm({ ...storeForm, category: event.target.value })}
                  />
                </label>
                <label>
                  <span>المخزون</span>
                  <input
                    type="number"
                    min="0"
                    value={storeForm.stockQuantity}
                    onChange={(event) => setStoreForm({ ...storeForm, stockQuantity: event.target.value })}
                  />
                </label>
              </div>
              <div className="form-two">
                <label>
                  <span>السعر الأصلي</span>
                  <input
                    type="number"
                    min="1"
                    value={storeForm.originalPrice}
                    onChange={(event) => setStoreForm({ ...storeForm, originalPrice: event.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>السعر النهائي</span>
                  <input
                    type="number"
                    min="1"
                    value={storeForm.finalPrice}
                    onChange={(event) => setStoreForm({ ...storeForm, finalPrice: event.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                <span>نسبة الخصم %</span>
                <input
                  type="number"
                  min="0"
                  max="95"
                  value={storeForm.discountPercent}
                  onChange={(event) => setStoreForm({ ...storeForm, discountPercent: event.target.value })}
                />
              </label>
              <div className="form-two">
                <label>
                  <span>شارة العرض</span>
                  <input
                    value={storeForm.promoBadge}
                    onChange={(event) => setStoreForm({ ...storeForm, promoBadge: event.target.value })}
                    placeholder="عرض محدود"
                  />
                </label>
                <label>
                  <span>التقييم</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={storeForm.rating}
                    onChange={(event) => setStoreForm({ ...storeForm, rating: event.target.value })}
                    placeholder="4.8"
                  />
                </label>
              </div>
              <label>
                <span>صور المنتج</span>
                <input type="file" accept="image/*" multiple onChange={(event) => setStoreImages(event.target.files)} />
              </label>
              <div className="form-two">
                <label className="switch-line">
                  <input
                    type="checkbox"
                    checked={storeForm.featured}
                    onChange={(event) => setStoreForm({ ...storeForm, featured: event.target.checked })}
                  />
                  <span>منتج مميز</span>
                </label>
                <label className="switch-line">
                  <input
                    type="checkbox"
                    checked={storeForm.active}
                    onChange={(event) => setStoreForm({ ...storeForm, active: event.target.checked })}
                  />
                  <span>مفعل</span>
                </label>
              </div>
              <button className="primary-button" type="submit">
                <ImagePlus size={18} />
                <span>إضافة المنتج</span>
              </button>
            </form>

            <div className="store-admin-stack">
              <div className="mini-list admin-store-products">
                {storeProducts.length ? (
                  storeProducts.map((item) => (
                    <article key={item.id}>
                      <img src={productImageUrl(item)} alt={item.title} />
                      <div className="admin-store-edit-grid">
                        <input
                          defaultValue={item.title}
                          onChange={(event) => setStoreEdit(item.id, 'title', event.target.value)}
                        />
                        <input
                          defaultValue={item.category}
                          onChange={(event) => setStoreEdit(item.id, 'category', event.target.value)}
                        />
                        <input
                          type="number"
                          defaultValue={item.originalPrice}
                          onChange={(event) => setStoreEdit(item.id, 'originalPrice', event.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          max="95"
                          defaultValue={item.discountPercent}
                          onChange={(event) => setStoreEdit(item.id, 'discountPercent', event.target.value)}
                        />
                        <input
                          defaultValue={item.promoBadge}
                          onChange={(event) => setStoreEdit(item.id, 'promoBadge', event.target.value)}
                          placeholder="شارة العرض"
                        />
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          defaultValue={item.rating || ''}
                          onChange={(event) => setStoreEdit(item.id, 'rating', event.target.value)}
                          placeholder="التقييم"
                        />
                        <input
                          type="number"
                          defaultValue={item.finalPrice}
                          onChange={(event) => setStoreEdit(item.id, 'finalPrice', event.target.value)}
                        />
                        <input
                          type="number"
                          defaultValue={item.stockQuantity}
                          onChange={(event) => setStoreEdit(item.id, 'stockQuantity', event.target.value)}
                        />
                        <textarea
                          rows="2"
                          defaultValue={item.description}
                          onChange={(event) => setStoreEdit(item.id, 'description', event.target.value)}
                        />
                        <label className="admin-file-field">
                          <span>صور إضافية</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) =>
                              setStoreEditImages((current) => ({ ...current, [item.id]: event.target.files }))
                            }
                          />
                        </label>
                      </div>
                      <div className="row-actions">
                        <button className="ghost-button table-button" type="button" onClick={() => updateStoreProduct(item)}>
                          حفظ
                        </button>
                        <button className="ghost-button table-button" type="button" onClick={() => quickPatchStoreProduct(item, { featured: !item.featured })}>
                          {item.featured ? 'إلغاء التمييز' : 'تمييز'}
                        </button>
                        <button className="ghost-button table-button" type="button" onClick={() => quickPatchStoreProduct(item, { active: !item.active })}>
                          {item.active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button className="danger-button table-button" type="button" onClick={() => deleteStoreProduct(item)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState title="لا توجد منتجات" text="أضف أول منتج للمتجر." />
                )}
              </div>

              <div className="panel store-admin-orders">
                <div className="section-heading compact-heading">
                  <div>
                    <span className="eyebrow">الطلبات</span>
                    <h3>آخر طلبات المتجر</h3>
                  </div>
                  <PackageCheck size={20} />
                </div>
                {storeOrders.length ? (
                  <div className="mini-list">
                    {storeOrders.slice(0, 8).map((order) => (
                      <article key={order.id}>
                        <div>
                          <strong>{order.user?.username || 'مستخدم'}</strong>
                          <span>{order.items.length} منتج - {new Date(order.createdAt).toLocaleDateString('ar-MA')}</span>
                        </div>
                        <strong>{formatCoins(order.totalCoins)} كوين</strong>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="لا توجد طلبات" text="طلبات الشراء ستظهر هنا." />
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'settings' ? (
          <div className="admin-section-grid">
            <section className="stack-form admin-form settings-form">
              <h3>قيمة الكوينات بالدرهم</h3>
              <p className="helper-text">التحويل المعروض حاليا ثابت: 1000 كوين = 100 DH.</p>
              <p className="helper-text">مثال: 600 كوين = 60 DH.</p>
              <p className="helper-text">هذه قيمة عرض فقط ولا تغير رصيد أي مستخدم في قاعدة البيانات.</p>
            </section>

            <form className="stack-form admin-form popup-settings-form" onSubmit={updatePopupSettings}>
              <h3>إعلان منبثق للمستخدمين</h3>
              <label className="switch-line">
                <input
                  type="checkbox"
                  checked={popupForm.enabled}
                  onChange={(event) => setPopupForm({ ...popupForm, enabled: event.target.checked })}
                />
                <span>تفعيل الإعلان</span>
              </label>
              <label>
                <span>العنوان</span>
                <input
                  value={popupForm.title}
                  onChange={(event) => setPopupForm({ ...popupForm, title: event.target.value })}
                />
              </label>
              <label>
                <span>الرسالة</span>
                <textarea
                  rows="4"
                  value={popupForm.message}
                  onChange={(event) => setPopupForm({ ...popupForm, message: event.target.value })}
                />
              </label>
              <div className="form-two">
                <label>
                  <span>نص الزر</span>
                  <input
                    value={popupForm.buttonText}
                    onChange={(event) => setPopupForm({ ...popupForm, buttonText: event.target.value })}
                  />
                </label>
                <label>
                  <span>الصفحة المستهدفة</span>
                  <input
                    value={popupForm.targetPath}
                    onChange={(event) => setPopupForm({ ...popupForm, targetPath: event.target.value })}
                    placeholder="/store"
                  />
                </label>
              </div>
              <button className="primary-button" type="submit">
                حفظ الإعلان
              </button>
            </form>
          </div>
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
