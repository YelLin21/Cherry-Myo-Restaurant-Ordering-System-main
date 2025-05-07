import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({}); // { [itemId]: { item, quantity } }

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

  function removeFromCart(id, force = false) {
    setCart((prev) => {
      const newCart = { ...prev };
      if (force || newCart[id].quantity <= 1) {
        delete newCart[id];
      } else {
        newCart[id].quantity -= 1;
      }
      return newCart;
    });
  }
  

  const total = Object.values(cart).reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
