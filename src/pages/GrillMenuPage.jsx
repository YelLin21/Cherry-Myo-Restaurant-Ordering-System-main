import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx"; // shared cart context
import { io } from "socket.io-client";
import { useDarkMode } from "./DarkModeContext.jsx";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000" ||
  "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function GrillMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { darkMode, setDarkMode } = useDarkMode();

  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total } = useCart();

  const [cartCount, setCartCount] = useState(2);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetch(`${APIBASE}/menu`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch grill menu");
        return res.json();
      })
      .then((data) => {
        const grillItems = data.filter((item) => item.category === "Grill");
        setMenuItems(grillItems);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("menu:new", (newItem) => {
      if (newItem.category === "Grill") {
        setMenuItems((prev) => [...prev, newItem]);
      }
    });

    socket.on("menu:update", (updatedItem) => {
      setMenuItems((prev) =>
        prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
      );
    });

    socket.on("menu:delete", (id) => {
      setMenuItems((prev) => prev.filter((item) => item._id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getQuantity = (id) => cart[id]?.quantity || 0;
  const cartItemsExist = Object.values(cart).length > 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={cartCount} />
      <main className={`p-4 min-h-screen pt-24 pb-32 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`text-3xl font-bold text-center mb-6 transition-colors duration-300 ${
            darkMode ? 'text-pink-300' : 'text-pink-900'
          }`}>Grill Menu</h1>

          {loading && <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <div
                key={item._id}
                className={`rounded-xl shadow-lg p-4 flex flex-col items-center transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-pink-300 border border-pink-100'
                }`}
              >
                <img
                  src={item.image || "https://via.placeholder.com/150"}
                  alt={item.name}
                  className="w-32 h-32 object-cover rounded-lg mb-3 shadow-md"
                />
                <h2 className={`font-semibold text-lg text-center mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {item.name}
                </h2>
                <p className={`mb-4 font-bold ${
                  darkMode ? 'text-pink-300' : 'text-black'
                }`}>
                  {item.price} Baht
                </p>

                <div className="flex items-center mt-3 space-x-3">
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className={`px-3 py-1 text-white rounded transition-colors duration-200 ${
                      darkMode 
                        ? 'bg-gray-600 hover:bg-gray-500' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    −
                  </button>
                  <span className={`px-2 font-semibold text-lg ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {getQuantity(item._id)}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className={`px-3 py-1 text-white rounded transition-colors duration-200 ${
                      darkMode 
                        ? 'bg-pink-600 hover:bg-pink-500' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Cart Summary */}
          {cartItemsExist && (
            <div className={`hidden sm:block mt-10 p-4 sm:p-6 rounded-lg shadow-md max-w-3xl mx-auto transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-white border border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold mb-4 ${
                darkMode ? 'text-pink-300' : 'text-pink-900'
              }`}>🛒 Cart</h2>

              <div className={`hidden md:flex justify-between font-semibold border-b pb-2 mb-2 ${
                darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-800'
              }`}>
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-right">Price</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Total</span>
              </div>

              <ul className="space-y-3">
                {Object.values(cart).map(({ item, quantity }) => (
                  <li
                    key={item._id}
                    className={`flex flex-col md:flex-row md:justify-between text-sm md:text-base ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <span className="md:w-1/2">{item.name}</span>
                    <span className="md:w-1/4 md:text-right">{item.price}</span>
                    <span className="md:w-1/4 md:text-center">{quantity}</span>
                    <span className="md:w-1/4 md:text-right">
                      {item.price * quantity} Baht
                    </span>
                  </li>
                ))}
              </ul>

              <div className={`flex justify-between mt-4 font-bold text-lg ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                <span>Total:</span>
                <span>{total} Baht</span>
              </div>

              <button
                onClick={() => navigate("/cart")}
                className={`mt-4 px-6 py-2 rounded w-full sm:w-auto transition-colors duration-200 ${
                  darkMode 
                    ? 'bg-green-600 text-white hover:bg-green-500' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Mobile Cart Summary */}
      {cartItemsExist && (
        <div className={`fixed bottom-0 left-0 right-0 sm:hidden border-t shadow-lg p-4 z-50 transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-center">
            <p className={`font-semibold ${
              darkMode ? 'text-pink-300' : 'text-pink-900'
            }`}>🛒 Total: {total} Baht</p>
            <button
              onClick={() => navigate("/cart")}
              className={`px-4 py-2 rounded transition-colors duration-200 ${
                darkMode 
                  ? 'bg-green-600 text-white hover:bg-green-500' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
