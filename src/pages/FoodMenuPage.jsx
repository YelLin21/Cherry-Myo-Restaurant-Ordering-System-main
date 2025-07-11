import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { io } from "socket.io-client";
import { useDarkMode } from "./DarkModeContext.jsx";


const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000" ||
  "https://cherry-myo-restaurant-ordering-system.onrender.com";

const TABS = ["Breakfast", "Lunch", "Dinner"];

export default function FoodMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Breakfast");
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useDarkMode();
  const { cart, addToCart, removeFromCart, total, totalItems } = useCart();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetch(`${APIBASE}/menu`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch menu");
        return res.json();
      })
      .then((data) => setMenuItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("menu:new", (newItem) => {
      setMenuItems((prev) => [...prev, newItem]);
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

  const filteredItems = menuItems.filter((item) => item.category === activeTab);

  const cartItemsExist = Object.values(cart).length > 0;

  return (
   <div
      className={`min-h-screen font-sans transition duration-300 ${
        darkMode
          ? "bg-gray-900 text-white"
          : "bg-gradient-to-b from-pink-100 via-rose-200 to-red-50 text-gray-800"
      }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={totalItems} />
      <main className={`p-4 min-h-screen pt-24 pb-32 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`text-3xl font-bold text-center mb-6 transition-colors duration-300 ${
            darkMode ? 'text-pink-300' : 'text-pink-900'
          }`}>
            Our Menu
          </h1>

          {/* Category Tabs */}
          <div className="flex justify-center mb-6 gap-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                  activeTab === tab
                    ? darkMode 
                      ? "bg-pink-600 text-white shadow-lg transform scale-105" 
                      : "bg-pink-700 text-white shadow-lg transform scale-105"
                    : darkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading && <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          {/* Desktop Grid View */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                  className="w-32 h-32 object-cover rounded-lg mb-3 shadow-md"
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
                            : 'bg-gray-600 hover:bg-gray-700'
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
                : 'bg-pink-300 border border-gray-200'
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
