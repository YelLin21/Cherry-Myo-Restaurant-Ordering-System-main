import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Load cart from localStorage on initialization
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : {};
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

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
    const item = newCart[id];

    if (!item) return newCart;

    if (force || item.quantity === 1) {
      delete newCart[id];
    }
    else {
    newCart[id] = {
        ...item,
        quantity: item.quantity - 1,
      };
    }

    return newCart;
  });
}
 const clearCart = () => {
    setCart({});
    localStorage.removeItem("cart");
  };
  
  const total = Object.values(cart).reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );

  // Calculate total number of items in cart
  const totalItems = Object.values(cart).reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  return (
     <CartContext.Provider value={{ cart, addToCart, removeFromCart, total, totalItems, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
