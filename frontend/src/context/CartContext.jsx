import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'reda_store_cart';
const cartItemKey = (productId, size = '') => `${productId}::${String(size || '').trim() || 'default'}`;

const readStoredCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readStoredCart);

  const persist = useCallback((nextItems) => {
    localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
    setItems(nextItems);
  }, []);

  const addItem = useCallback(
    (product, quantity = 1, options = {}) => {
      const productId = product.id || product._id;
      const size = String(options.size || '').trim();
      const itemKey = cartItemKey(productId, size);
      const nextQuantity = Math.max(1, Number(quantity || 1));
      const nextItems = [...items];
      const existing = nextItems.find((item) => (item.cartKey || cartItemKey(item.productId, item.size)) === itemKey);

      if (existing) {
        existing.quantity += nextQuantity;
      } else {
        nextItems.push({
          cartKey: itemKey,
          productId,
          title: product.title,
          imageUrl: product.images?.[0]?.url || '',
          finalPrice: product.finalPrice,
          originalPrice: product.originalPrice,
          discountPercent: product.discountPercent,
          stockQuantity: product.stockQuantity,
          isClothing: Boolean(product.isClothing),
          size,
          quantity: nextQuantity,
        });
      }

      persist(nextItems);
    },
    [items, persist]
  );

  const updateQuantity = useCallback(
    (itemKey, quantity) => {
      const safeQuantity = Math.max(1, Number(quantity || 1));
      persist(
        items.map((item) =>
          (item.cartKey || cartItemKey(item.productId, item.size)) === itemKey ? { ...item, quantity: safeQuantity } : item
        )
      );
    },
    [items, persist]
  );

  const removeItem = useCallback(
    (itemKey) => {
      persist(items.filter((item) => (item.cartKey || cartItemKey(item.productId, item.size)) !== itemKey));
    },
    [items, persist]
  );

  const clearCart = useCallback(() => persist([]), [persist]);

  const totalCoins = useMemo(
    () => items.reduce((total, item) => total + Number(item.finalPrice || 0) * Number(item.quantity || 1), 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((total, item) => total + Number(item.quantity || 1), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      addItem,
      clearCart,
      itemCount,
      items,
      removeItem,
      totalCoins,
      updateQuantity,
    }),
    [addItem, clearCart, itemCount, items, removeItem, totalCoins, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return value;
};
