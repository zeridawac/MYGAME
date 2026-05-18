import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, PackageCheck, ShoppingCart, Sparkles } from 'lucide-react';
import api from '../api/config.js';
import Loading from '../components/Loading.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoins } from '../utils/coins.js';
import { productImageUrl, resolveStoreAssetUrl } from '../utils/storeImages.js';

const cleanTemuImageUrl = (url = '') => {
  try {
    const parsed = new URL(url);
    ['imageMogr2', 'thumbnail', 'resize', 'x-oss-process'].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return url;
  }
};

const productImageCandidates = (product) => {
  const urls = (product?.images || [])
    .map((image) => image?.url)
    .concat(product?.imageUrl || [], product?.url || [])
    .filter(Boolean)
    .map((url) => cleanTemuImageUrl(resolveStoreAssetUrl(url)));

  return [...new Set(urls)];
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const [mainImageReady, setMainImageReady] = useState(false);
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
        setFailedImages([]);
        setMainImageReady(false);
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
    if (!product) return;
    cart.addItem(product);
    showToast('تمت إضافة المنتج للسلة', 'success');
  };

  const gallery = productImageCandidates(product).filter((url) => !failedImages.includes(url));
  const mainImage = gallery[activeImage] || gallery[0] || '';
  const hasDiscount = product ? product.originalPrice > product.finalPrice || product.discountPercent > 0 : false;

  const markImageFailed = (url) => {
    setFailedImages((current) => (current.includes(url) ? current : [...current, url]));
    setActiveImage(0);
  };

  useEffect(() => {
    if (!mainImage) return;

    setMainImageReady(false);
    const image = new Image();
    image.onload = () => setMainImageReady(true);
    image.onerror = () => markImageFailed(mainImage);
    image.src = mainImage;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [mainImage]);

  useEffect(() => {
    if (gallery.length && activeImage >= gallery.length) {
      setActiveImage(0);
    }
  }, [activeImage, gallery.length]);

  if (loading || !product) {
    return <Loading />;
  }

  return (
    <div className="page-stack product-page">
      <Link className="ghost-button store-back-link" to="/store">
        <ArrowRight size={18} />
        <span>رجوع للمتجر</span>
      </Link>

      <section className="product-detail-shell">
        <div className="product-gallery">
          {mainImage ? (
            <>
              <div className={`product-main-image-wrap ${mainImageReady ? 'loaded' : ''}`}>
                <img className="product-main-image" src={mainImage} alt={product.title} onError={() => markImageFailed(mainImage)} />
              </div>
              {gallery.length > 1 ? (
                <div className="product-thumbs">
                  {gallery.map((imageUrl, index) => (
                    <button
                      className={activeImage === index ? 'active' : ''}
                      type="button"
                      key={`${imageUrl}-${index}`}
                      onClick={() => setActiveImage(index)}
                      aria-label={`صورة المنتج ${index + 1}`}
                    >
                      <img src={imageUrl} alt="" onError={() => markImageFailed(imageUrl)} />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="product-no-image">
              <strong>لا توجد صور متاحة</strong>
            </div>
          )}
        </div>

        <article className="product-info-panel">
          <div className="product-badges">
            {hasDiscount ? <span className="product-discount-badge">-{product.discountPercent || 0}%</span> : null}
            {product.promoBadge || product.featured ? <b>{product.promoBadge || 'مختار'}</b> : null}
            {product.rating ? <b>تقييم {product.rating}</b> : null}
          </div>
          <h2>{product.title}</h2>
          <p className="product-description">{product.description || 'تفاصيل المنتج ستظهر هنا عند تحديثه من الإدارة.'}</p>
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

      <div className="product-mobile-cart">
        <div>
          <span>السعر</span>
          <strong>{formatCoins(product.finalPrice)} كوين</strong>
        </div>
        <button className="primary-button" type="button" onClick={addToCart} disabled={product.stockQuantity <= 0}>
          <ShoppingCart size={18} />
          <span>إضافة للسلة</span>
        </button>
      </div>

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
                <img src={productImageUrl(item)} alt={item.title} onError={(event) => event.currentTarget.remove()} />
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
