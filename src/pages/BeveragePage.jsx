import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { io } from "socket.io-client";
import { useDarkMode } from "./DarkModeContext";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000" ||
  "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function BeverageMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { darkMode, setDarkMode } = useDarkMode();

  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total, totalItems } = useCart();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetch(`${APIBASE}/menu`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch beverage menu");
        return res.json();
      })
      .then((data) => {
        const beverageItems = data.filter(
          (item) => item.category === "Beverage"
        );
        setMenuItems(beverageItems);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });
    socket.on("menu:new", (newItem) => {
      if (newItem.category === "Beverage") {
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

  const filteredItems = menuItems.filter((item) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartItemsExist = Object.values(cart).length > 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        cartCount={totalItems}
      />
      <main className={`pt-24 p-4 min-h-screen pb-32 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`text-3xl font-bold text-center mb-6 transition-colors duration-300 ${
            darkMode ? 'text-pink-300' : 'text-pink-900'
          }`}>
            Beverage Menu
          </h1>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search beverages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 pl-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-400 transition-colors duration-200 ${
                  darkMode 
                    ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-black placeholder-gray-500'
                }`}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {loading && <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          {/* Desktop Grid View */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
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
                  className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg mb-3 shadow-md"
                />
                <h2 className={`font-semibold text-lg text-center mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {item.name}
                </h2>
                <p className={`mb-4 font-bold ${
                  darkMode ? 'text-pink-300' : 'text-pink-900'
                }`}>
                  {item.price} Baht
                </p>

                <div className="flex items-center mt-3 space-x-3">
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className={`px-3 py-1 text-white rounded transition-colors duration-200 ${
                      darkMode 
                        ? 'bg-gray-600 hover:bg-gray-500' 
                        : 'bg-gray-500 hover:bg-gray-700'
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

          {/* Mobile List View */}
          <div className="sm:hidden space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600' 
                    : 'bg-pink-300 border-pink-100'
                }`}
              >
                <img
                  src={item.image || "https://via.placeholder.com/80"}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h2 className={`font-semibold text-lg mb-2 truncate ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {item.name}
                  </h2>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-lg ${
                      darkMode ? 'text-pink-300' : 'text-pink-600'
                    }`}>
                      {item.price} Baht
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all duration-200 hover:scale-110 ${
                          darkMode 
                            ? 'bg-gray-600 hover:bg-gray-500' 
                            : 'bg-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        −
                      </button>
                      <span className={`min-w-[2rem] text-center font-bold text-lg ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        {getQuantity(item._id)}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all duration-200 hover:scale-110 ${
                          darkMode 
                            ? 'bg-pink-600 hover:bg-pink-500' 
                            : 'bg-red-500 hover:bg-red-600'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Cart Summary */}
          {cartItemsExist && (
            <div className={`hidden sm:block mt-10 p-4 sm:p-6 rounded-lg shadow-md max-w-3xl mx-auto transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-pink-300 border border-pink-100'
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
            : 'bg-pink-300 border-pink-100'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`font-semibold ${
                darkMode ? 'text-pink-300' : 'text-pink-900'
              }`}>🛒 Total: {total} Baht</p>
            </div>
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
