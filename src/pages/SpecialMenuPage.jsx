import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { io } from "socket.io-client";
import { useDarkMode } from "./DarkModeContext.jsx";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

export default function SpecialMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useDarkMode();
  const { cart, addToCart, removeFromCart, total, totalItems } = useCart();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetchSpecialMenuItems();
    
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Special Menu socket connected:", socket.id);
    });

    socket.on("menu:new", (newItem) => {
      if (newItem.category === "Special") {
        setMenuItems((prev) => [...prev, newItem]);
      }
    });

    socket.on("menu:update", (updatedItem) => {
      if (updatedItem.category === "Special") {
        setMenuItems((prev) =>
          prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
        );
      }
    });

    socket.on("menu:delete", (id) => {
      setMenuItems((prev) => prev.filter((item) => item._id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchSpecialMenuItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${APIBASE}/menu`);
      if (!res.ok) throw new Error("Failed to fetch special menu");
      const data = await res.json();
      const specialItems = data.filter(item => item.category === "Special");
      setMenuItems(specialItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQuantity = (id) => cart[id]?.quantity || 0;

  const calculateDiscount = (originalPrice, promotionPrice) => {
    if (!promotionPrice || promotionPrice <= 0 || promotionPrice >= originalPrice) {
      return 0;
    }
    return Math.round(((originalPrice - promotionPrice) / originalPrice) * 100);
  };

  const hasValidPromotion = (item) => {
    return item.promotion && 
           typeof item.promotion === 'number' && 
           item.promotion > 0 && 
           item.promotion < item.price;
  };

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartItemsExist = Object.values(cart).length > 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={totalItems} />
      
      <main className={`p-4 min-h-screen pt-24 pb-32 transition-colors duration-300 ${
        darkMode ? "bg-gray-900" : "bg-gray-100"
      }`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`text-3xl font-bold text-center mb-6 transition-colors duration-300 ${
            darkMode ? "text-pink-300" : "text-pink-900"
          }`}>
            🌟 Special Menu
          </h1>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search special items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 pl-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-400 transition-colors duration-200 ${
                  darkMode 
                    ? "bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                    : "bg-white border-gray-300 text-black placeholder-gray-500"
                }`}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {loading && <p className={`text-center ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Loading special menu...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          {/* Search Info */}
          {searchTerm.trim() && (
            <p className={`text-center mb-4 text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}>
              Searching for "{searchTerm}" • {filteredItems.length} items found
            </p>
          )}

          {/* Desktop Grid View */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className={`relative rounded-xl shadow-lg p-4 flex flex-col items-center transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  item.outofstock 
                    ? 'opacity-50 grayscale cursor-not-allowed' 
                    : ''
                } ${darkMode 
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-pink-300 border-pink-100"
                }`}
              >
                <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  darkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-800"
                }`}>
                  Special
                </span>
                {/* Out of Stock Badge */}
                {item.outofstock && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white z-10">
                    OUT OF STOCK
                  </span>
                )}
                <img
                  src={item.image || "https://via.placeholder.com/150"}
                  alt={item.name}
                  className="w-32 h-32 object-cover rounded-lg mb-3 shadow-md"
                />
                <h2 className={`font-semibold text-lg text-center mb-2 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}>
                  {item.name}
                  
                </h2>
                <p className={`mb-4 font-bold ${
                  darkMode ? "text-pink-300" : "text-pink-900"
                }`}>
                  {hasValidPromotion(item) ? (
                    <>
                      <span className={`mr-2 line-through text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {item.price} MMK
                      </span>
                      <span className={`font-bold ${darkMode ? 'text-pink-300' : 'text-pink-900'}`}>
                        {item.promotion} MMK
                      </span>
                    </>
                  ) : (
                    <span>{item.price} MMK</span>
                  )}
                </p>

                <div className={`flex items-center mt-3 space-x-3 ${item.outofstock ? 'pointer-events-none' : ''}`}>
                  <button
                    onClick={() => !item.outofstock && removeFromCart(item._id)}
                    disabled={item.outofstock}
                    className={`px-3 py-1 text-white rounded transition-colors duration-200 ${
                      item.outofstock 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : darkMode 
                        ? "bg-gray-600 hover:bg-gray-500"
                        : "bg-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    −
                  </button>
                  <span className={`px-2 font-semibold text-lg ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {getQuantity(item._id)}
                  </span>
                  <button
                    onClick={() => !item.outofstock && addToCart({
                      ...item,
                      price: hasValidPromotion(item) ? item.promotion : item.price
                    })}
                    disabled={item.outofstock}
                    className={`px-3 py-1 text-white rounded transition-colors duration-200 ${
                      item.outofstock 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : darkMode 
                        ? "bg-pink-600 hover:bg-pink-500"
                        : "bg-red-500 hover:bg-red-600"
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
                className={`relative flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${
                  item.outofstock 
                    ? 'opacity-50 grayscale cursor-not-allowed' 
                    : ''
                } ${darkMode 
                    ? "bg-gray-800 border-gray-600"
                    : "bg-pink-300 border-pink-100"
                }`}
              >
                <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  darkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-800"
                }`}>
                  Special
                </span>
                {/* Out of Stock Badge */}
                {item.outofstock && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white z-10">
                    OUT OF STOCK
                  </span>
                )}
                <img
                  src={item.image || "https://via.placeholder.com/80"}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className={`font-semibold text-lg ${
                      darkMode ? "text-white" : "text-gray-800"
                    }`}>
                      {item.name}
                    </h2>
                    
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      {hasValidPromotion(item) ? (
                        <>
                          <span className={`line-through text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {item.price} MMK
                          </span>
                          <span className={`font-bold text-lg ${darkMode ? "text-pink-300" : "text-pink-600"}`}>
                            {item.promotion} MMK
                          </span>
                          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            You save: {(item.price - item.promotion)} MMK
                          </span>
                        </>
                      ) : (
                        <span className={`font-bold text-lg ${darkMode ? "text-pink-300" : "text-pink-600"}`}>
                          {item.price} MMK
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 ${item.outofstock ? 'pointer-events-none' : ''}`}>
                      <button
                        onClick={() => !item.outofstock && removeFromCart(item._id)}
                        disabled={item.outofstock}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all duration-200 hover:scale-110 ${
                          item.outofstock 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : darkMode 
                            ? "bg-gray-600 hover:bg-gray-500"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        −
                      </button>
                      <span className={`min-w-[2rem] text-center font-bold text-lg ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}>
                        {getQuantity(item._id)}
                      </span>
                      <button
                        onClick={() => !item.outofstock && addToCart({
                          ...item,
                          price: item.promotion && item.promotion > 0 ? item.promotion : item.price
                        })}
                        disabled={item.outofstock}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all duration-200 hover:scale-110 ${
                          item.outofstock 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : darkMode 
                            ? "bg-pink-600 hover:bg-pink-500"
                            : "bg-red-500 hover:bg-red-600"
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

          {/* No Items Message */}
          {!loading && !error && filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌟</div>
              <h3 className={`text-xl font-semibold mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}>
                {searchTerm ? "No special items found" : "No special items available"}
              </h3>
              <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {searchTerm ? "Try searching for something else" : "Check back later for special offers"}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    darkMode 
                      ? "bg-pink-600 text-white hover:bg-pink-500"
                      : "bg-pink-600 text-white hover:bg-pink-700"
                  }`}
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Desktop Cart Summary */}
          {cartItemsExist && (
            <div
              className={`hidden sm:block sm:fixed sm:inset-x-0 sm:bottom-0 border-t shadow-lg z-50 transition-colors duration-300
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-pink-300 border-pink-100'}
    `}
            >
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Left: Totals */}
                <div className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} flex items-center gap-6`}>
                  <span className="font-semibold">
                    {totalItems === 1 ? 'Item' : 'Items'}:{' '}
                    {Object.values(cart).reduce((sum, { quantity }) => sum + quantity, 0)}
                  </span>
                  <span className="font-bold text-lg">
                    Total:{' '}
                    {Number(total).toLocaleString()} MMK
                  </span>
                </div>

                {/* Right: Next button */}
                <button
                  onClick={() => navigate('/cart')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors duration-200
          ${darkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
        `}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Mobile Cart Summary */}
      {cartItemsExist && (
        <div className={`fixed bottom-0 left-0 right-0 sm:hidden border-t shadow-lg p-4 z-50 transition-colors duration-300 ${
          darkMode 
            ? "bg-gray-800 border-gray-600"
            : "bg-pink-300 border-pink-100"
        }`}>
          <div className="flex justify-between items-center">
            <p className={`font-semibold ${
              darkMode ? 'text-pink-300' : 'text-pink-900'
            }`}>{totalItems === 1 ? 'Item' : 'Items'}: {totalItems}</p>
            <p className={`font-semibold ${
              darkMode ? "text-pink-300" : "text-pink-900"
            }`}>🛒 Total: {total} MMK</p>
            <button
              onClick={() => navigate("/cart")}
              className={`px-4 py-2 rounded transition-colors duration-200 ${
                darkMode 
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : "bg-green-600 text-white hover:bg-green-700"
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
