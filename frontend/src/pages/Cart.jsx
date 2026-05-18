import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import api from '../api/config.js';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoins } from '../utils/coins.js';
import { productImageUrl } from '../utils/storeImages.js';

const Cart = () => {
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const cart = useCart();
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const checkout = async () => {
    if (!cart.items.length) {
      showToast('السلة فارغة', 'error');
      return;
    }

    setCheckoutBusy(true);
    setSuccessMessage('');
    try {
      const { data } = await api.post('/store/checkout', {
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, size: item.size || '' })),
      });
      updateUser(data.user);
      cart.clearCart();
      setSuccessMessage(data.message);
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message || 'رصيد الكوينات غير كاف', 'error');
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <div className="page-stack cart-page">
      <section className="hero-panel compact-hero cart-hero">
        <div>
          <span className="eyebrow">سلة المشتريات</span>
          <h2>طلباتك بالكوينات</h2>
          <p>سيتم التوصل بالمنتجات فور فتح الموقع بشكل كامل</p>
        </div>
        <ShoppingBag size={34} />
      </section>

      {successMessage ? <section className="cart-success-message">{successMessage}</section> : null}

      {cart.items.length ? (
        <section className="cart-layout">
          <div className="cart-items-list">
            {cart.items.map((item) => {
              const itemKey = item.cartKey || `${item.productId}::${item.size || 'default'}`;
              return (
              <article className="cart-item-card" key={itemKey}>
                <img src={productImageUrl(item)} alt={item.title} />
                <div>
                  <strong>{item.title}</strong>
                  {item.size ? <small className="cart-item-size">المقاس: {item.size}</small> : null}
                  <span>{formatCoins(item.finalPrice)} كوين</span>
                  <div className="store-qty-row">
                    <button type="button" onClick={() => cart.updateQuantity(itemKey, item.quantity - 1)}>
                      <Minus size={14} />
                    </button>
                    <b>{item.quantity}</b>
                    <button type="button" onClick={() => cart.updateQuantity(itemKey, item.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                    <button type="button" onClick={() => cart.removeItem(itemKey)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>

          <aside className="cart-summary-card">
            <span>الدفع بالكوينات فقط</span>
            <strong>{formatCoins(cart.totalCoins)} كوين</strong>
            <p>سيتم التوصل بالمنتجات فور فتح الموقع بشكل كامل</p>
            <button className="primary-button" type="button" onClick={checkout} disabled={checkoutBusy}>
              {checkoutBusy ? 'جاري تسجيل الطلب...' : 'تأكيد الطلب'}
            </button>
          </aside>
        </section>
      ) : (
        <section className="panel">
          <EmptyState title="سلة المشتريات فارغة" text="أضف منتجات من المتجر ثم ارجع لإتمام الطلب." />
          <Link className="primary-button cart-store-link" to="/store">
            دخول المتجر
          </Link>
        </section>
      )}
    </div>
  );
};

export default Cart;
