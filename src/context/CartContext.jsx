import { createContext, useContext, useState, useEffect } from "react";
import { useTable } from "./TableContext";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { tableId } = useTable(); // 👈 use current tableId
  const [cart, setCart] = useState({});

  // Load cart for this table from sessionStorage
  useEffect(() => {
    if (tableId) {
      const savedCart = sessionStorage.getItem(`cart_${tableId}`);
      setCart(savedCart ? JSON.parse(savedCart) : {});
    }
  }, [tableId]);

  // Save cart for this table into sessionStorage
  useEffect(() => {
    if (tableId) {
      sessionStorage.setItem(`cart_${tableId}`, JSON.stringify(cart));
    }
  }, [cart, tableId]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item._id];
      const quantity = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item._id]: { item, quantity },
      };
    });
  };

  const removeFromCart = (id, force = false) => {
    setCart((prev) => {
      const newCart = { ...prev };
      const entry = newCart[id];

      if (!entry) return newCart;

      if (force || entry.quantity === 1) {
        delete newCart[id];
      } else {
        newCart[id] = {
          ...entry,
          quantity: entry.quantity - 1,
        };
      }

      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
    if (tableId) {
      sessionStorage.removeItem(`cart_${tableId}`);
    }
  };

  const total = Object.values(cart).reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );

  const totalItems = Object.values(cart).reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, total, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
