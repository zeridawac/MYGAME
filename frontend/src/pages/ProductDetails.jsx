import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, PackageCheck, ShoppingCart, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../api/config.js';
import Loading from '../components/Loading.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCoins } from '../utils/coins.js';
import { productImageUrl, resolveStoreAssetUrl } from '../utils/storeImages.js';

const fallbackSizes = ['S', 'M', 'L', 'XL', 'XXL'];

const productImageCandidates = (product) => {
  const urls = (product?.images || [])
    .map((image) => image?.url)
    .concat(product?.imageUrl || [], product?.url || [])
    .filter(Boolean)
    .map((url) => resolveStoreAssetUrl(url));

  return [...new Set(urls)];
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [failedImages, setFailedImages] = useState([]);
  const [mainImageReady, setMainImageReady] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [loading, setLoading] = useState(true);
  const touchState = useRef({ x: 0, distance: 0, zoom: 1 });
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
        setLightboxIndex(null);
        setLightboxZoom(1);
        setSelectedSize('');
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
    if (product.isClothing && !selectedSize) {
      showToast('المرجو اختيار المقاس', 'error');
      return;
    }
    cart.addItem(product, 1, { size: selectedSize });
    showToast('تمت إضافة المنتج للسلة', 'success');
  };

  const gallery = productImageCandidates(product).filter((url) => !failedImages.includes(url));
  const mainImage = gallery[activeImage] || gallery[0] || '';
  const hasDiscount = product ? product.originalPrice > product.finalPrice || product.discountPercent > 0 : false;
  const availableSizes = product?.isClothing ? product.sizes?.length ? product.sizes : fallbackSizes : [];
  const lightboxImage = lightboxIndex === null ? '' : gallery[lightboxIndex] || gallery[0] || '';

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

  const openLightbox = (index = activeImage) => {
    if (!gallery.length) return;
    setLightboxIndex(Math.max(0, Math.min(index, gallery.length - 1)));
    setLightboxZoom(1);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setLightboxZoom(1);
  };

  const moveLightbox = (direction) => {
    if (!gallery.length) return;
    setLightboxZoom(1);
    setLightboxIndex((current) => {
      const safeCurrent = current ?? 0;
      return (safeCurrent + direction + gallery.length) % gallery.length;
    });
  };

  const touchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const [first, second] = touches;
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };

  const handleLightboxTouchStart = (event) => {
    if (event.touches.length === 2) {
      touchState.current = {
        x: 0,
        distance: touchDistance(event.touches),
        zoom: lightboxZoom,
      };
      return;
    }

    touchState.current = {
      x: event.touches[0]?.clientX || 0,
      distance: 0,
      zoom: lightboxZoom,
    };
  };

  const handleLightboxTouchMove = (event) => {
    if (event.touches.length !== 2 || !touchState.current.distance) return;
    const nextZoom = Math.max(1, Math.min(3, touchState.current.zoom * (touchDistance(event.touches) / touchState.current.distance)));
    setLightboxZoom(nextZoom);
  };

  const handleLightboxTouchEnd = (event) => {
    if (!touchState.current.x || !event.changedTouches[0] || lightboxZoom > 1.05) return;
    const deltaX = event.changedTouches[0].clientX - touchState.current.x;
    if (Math.abs(deltaX) > 55) {
      moveLightbox(deltaX > 0 ? -1 : 1);
    }
  };

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
                <button className="product-main-image-button" type="button" onClick={() => openLightbox(activeImage)} aria-label="تكبير الصورة">
                  <img className="product-main-image" src={mainImage} alt={product.title} onError={() => markImageFailed(mainImage)} />
                </button>
              </div>
              {gallery.length > 1 ? (
                <div className="product-thumbs">
                  {gallery.map((imageUrl, index) => (
                    <button
                      className={activeImage === index ? 'active' : ''}
                      type="button"
                      key={`${imageUrl}-${index}`}
                      onClick={() => {
                        setActiveImage(index);
                        openLightbox(index);
                      }}
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
          {product.isClothing ? (
            <div className="product-size-box">
              <strong>اختر المقاس</strong>
              <div className="product-size-options">
                {availableSizes.map((size) => (
                  <button
                    className={selectedSize === size ? 'active' : ''}
                    type="button"
                    key={size}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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

      {lightboxImage ? (
        <div className="product-lightbox" role="dialog" aria-modal="true">
          <button className="product-lightbox-close" type="button" onClick={closeLightbox} aria-label="إغلاق">
            <X size={20} />
          </button>
          {gallery.length > 1 ? (
            <>
              <button className="product-lightbox-nav prev" type="button" onClick={() => moveLightbox(-1)} aria-label="الصورة السابقة">
                <ChevronRight size={24} />
              </button>
              <button className="product-lightbox-nav next" type="button" onClick={() => moveLightbox(1)} aria-label="الصورة التالية">
                <ChevronLeft size={24} />
              </button>
            </>
          ) : null}
          <div
            className="product-lightbox-stage"
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
          >
            <img
              src={lightboxImage}
              alt={product.title}
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={() => setLightboxZoom((current) => (current > 1 ? 1 : 2))}
              onError={() => {
                markImageFailed(lightboxImage);
                closeLightbox();
              }}
            />
          </div>
          <div className="product-lightbox-controls">
            <button type="button" onClick={() => setLightboxZoom((current) => Math.max(1, current - 0.35))}>
              <ZoomOut size={17} />
            </button>
            <span>{(lightboxIndex ?? 0) + 1} / {gallery.length}</span>
            <button type="button" onClick={() => setLightboxZoom((current) => Math.min(3, current + 0.35))}>
              <ZoomIn size={17} />
            </button>
          </div>
        </div>
      ) : null}

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
