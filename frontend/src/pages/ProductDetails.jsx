import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, PackageCheck, ShoppingCart, Sparkles } from 'lucide-react';
import api from '../api/config.js';
import Loading from '../components/Loading.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoins } from '../utils/coins.js';
import { productImageUrl } from '../utils/storeImages.js';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const cart = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/store/products/${id}`);
        setProduct(data.product);
        setRelated(data.related || []);
        setActiveImage(0);
      } catch (error) {
        showToast(error.message, 'error');
        navigate('/store', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, navigate, showToast]);

  const addToCart = () => {
    cart.addItem(product);
    showToast('تمت إضافة المنتج للسلة', 'success');
  };

  if (loading || !product) {
    return <Loading />;
  }

  const gallery = product.images?.length
    ? product.images.map((image, index) => ({ ...image, url: productImageUrl(product, index) }))
    : [{ url: productImageUrl(product) }];

  return (
    <div className="page-stack product-page">
      <Link className="ghost-button store-back-link" to="/store">
        <ArrowRight size={18} />
        <span>رجوع للمتجر</span>
      </Link>

      <section className="product-detail-shell">
        <div className="product-gallery">
          <img className="product-main-image" src={productImageUrl(product, activeImage)} alt={product.title} />
          <div className="product-thumbs">
            {gallery.map((image, index) => (
              <button
                className={activeImage === index ? 'active' : ''}
                type="button"
                key={`${image.url}-${index}`}
                onClick={() => setActiveImage(index)}
              >
                <img src={image.url || productImageUrl(product, index)} alt={`${product.title} ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <article className="product-info-panel">
          <div className="product-badges">
            {product.discountPercent > 0 ? <span>-{product.discountPercent}%</span> : null}
            {product.promoBadge || product.featured ? <b>{product.promoBadge || 'مختار'}</b> : null}
            {product.rating ? <b>تقييم {product.rating}</b> : null}
          </div>
          <h2>{product.title}</h2>
          <p>{product.description || 'تفاصيل المنتج ستظهر هنا عند تحديثه من الإدارة.'}</p>
          <div className="product-price-block">
            {product.originalPrice > product.finalPrice ? <del>{formatCoins(product.originalPrice)} كوين</del> : null}
            <strong>{formatCoins(product.finalPrice)} كوين</strong>
          </div>
          <div className="product-stock-line">
            <PackageCheck size={18} />
            <span>{product.stockQuantity > 0 ? `متوفر: ${product.stockQuantity}` : 'غير متوفر حاليا'}</span>
          </div>
          <div className="product-actions">
            <button className="primary-button" type="button" onClick={addToCart} disabled={product.stockQuantity <= 0}>
              <ShoppingCart size={18} />
              <span>إضافة للسلة</span>
            </button>
          </div>
        </article>
      </section>

      {related.length ? (
        <section className="panel related-products">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">اقتراحات</span>
              <h3>منتجات مشابهة</h3>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="related-products-row">
            {related.map((item) => (
              <Link to={`/store/${item.id}`} key={item.id}>
                <img src={productImageUrl(item)} alt={item.title} />
                <strong>{item.title}</strong>
                <span>{formatCoins(item.finalPrice)} كوين</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ProductDetails;
