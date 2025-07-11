import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import "../index.css";

const APIBASE = import.meta.env.VITE_API_URL;

export default function CartPage() {
  const [selectedItems, setSelectedItems] = useState({});
  const [tableNumber, setTableNumber] = useState("");
  const [orderSent, setOrderSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total, totalItems, clearCart } = useCart();
  const { darkMode, setDarkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Load selectedItems and tableNumber from localStorage
  useEffect(() => {
    const storedSelected = localStorage.getItem("selectedItems");
    const storedTable = localStorage.getItem("tableNumber");
    if (storedSelected) setSelectedItems(JSON.parse(storedSelected));
    if (storedTable) setTableNumber(storedTable);
  }, []);

  // Save selectedItems and tableNumber to localStorage
  useEffect(() => {
    localStorage.setItem("selectedItems", JSON.stringify(selectedItems));
  }, [selectedItems]);

  useEffect(() => {
    localStorage.setItem("tableNumber", tableNumber);
  }, [tableNumber]);

  const handleCheckboxChange = (id) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    const newSelected = {};
    if (checked) {
      Object.values(cart).forEach(({ item }) => {
        newSelected[item._id] = true;
      });
    }
    setSelectedItems(checked ? newSelected : {});
  };

  const allSelected = Object.keys(cart).length > 0 &&
    Object.keys(cart).every((id) => selectedItems[id]);

  const handleDeleteSelected = () => {
    Object.keys(selectedItems).forEach((id) => {
      if (selectedItems[id]) {
        removeFromCart(id, true);
      }
    });
    setSelectedItems({});
  };

  const formatPrice = (price) => {
    return "฿" + price.toLocaleString("en-US");
  };

  const calculateSelectedTotal = () => {
    return Object.values(cart).reduce((total, { item, quantity }) => {
      if (selectedItems[item._id]) {
        return total + (item.price * quantity);
      }
      return total;
    }, 0);
  };

  const selectedTotal = calculateSelectedTotal();

  const handleCheckoutClick = () => {
    if (!tableNumber.trim()) {
      alert("Please enter your table number.");
      return;
    }

    const selectedCartItems = Object.values(cart).filter(({ item }) => selectedItems[item._id]);

    if (selectedCartItems.length === 0) {
      alert("Please select at least one item to order.");
      return;
    }

    setShowOrderModal(true);
  };

  const handlePlaceOrder = async () => {
    const selectedCartItems = Object.values(cart).filter(({ item }) => selectedItems[item._id]);

    setLoading(true);
    setShowOrderModal(false);

    const order = {
      tableNumber,
      items: selectedCartItems.map(({ item, quantity }) => ({
        itemId: item._id,
        name: item.name,
        price: item.price,
        quantity,
      })),
    };

    try {
      const res = await fetch(`${APIBASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!res.ok) throw new Error("Order failed");

      setOrderSent(true);
      clearCart();
      setSelectedItems({});
      localStorage.removeItem("selectedItems");
      localStorage.removeItem("tableNumber");

      setTimeout(() => {
        setOrderSent(false);
        navigate("/");
      }, 2000);
    } catch (err) {
      alert("Failed to send order.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pt-10 pb-28 transition-colors duration-300 ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

      {orderSent && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 border px-6 py-3 rounded shadow-lg z-50 animate-fadeIn ${darkMode ? "bg-green-800 border-green-600 text-green-200" : "bg-green-100 border-green-400 text-green-800"}`}>
          ✅ Your order is sending to the kitchen...
        </div>
      )}

      <main className={`pt-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <h1 className={`text-2xl font-bold text-center mb-6 ${darkMode ? "text-pink-300" : "text-gray-800"}`}>
          🛒 Your Cart ({totalItems} items)
        </h1>

        {Object.values(cart).length > 0 ? (
          <ul className="space-y-4">
            {Object.values(cart).map(({ item, quantity }) => (
              <li key={item._id} className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${darkMode ? "bg-gray-800 border-gray-600" : "bg-pink-300 border-pink-100"}`}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 focus:ring-pink-500 flex-shrink-0"
                  checked={!!selectedItems[item._id]}
                  onChange={() => handleCheckboxChange(item._id)}
                />
                
                {/* Image */}
                <img 
                  src={item.image || "https://via.placeholder.com/80"} 
                  alt={item.name} 
                  className="w-20 h-20 object-cover rounded-lg shadow-sm flex-shrink-0" 
                />
                
                {/* Content Container */}
                <div className="flex-1 min-w-0">
                  {/* Item Name */}
                  <h2 className={`font-semibold text-lg mb-2 truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {item.name}
                  </h2>
                  
                  {/* Price and Quantity Container */}
                  <div className="flex items-center justify-between">
                    {/* Price */}
                    <span className={`font-bold text-lg ${darkMode ? "text-pink-300" : "text-pink-600"}`}>
                      {formatPrice(item.price)}
                    </span>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all duration-200 hover:scale-110 ${darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-600 hover:bg-gray-700"}`}
                      >
                        −
                      </button>
                      <span className={`min-w-[2rem] text-center font-bold text-lg ${darkMode ? "text-white" : "text-gray-800"}`}>
                        {quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all duration-200 hover:scale-110 ${darkMode ? "bg-pink-600 hover:bg-pink-500" : "bg-red-500 hover:bg-red-600"}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className={`text-xl ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Your cart is empty.</p>
            <button onClick={() => navigate("/")} className={`mt-4 px-6 py-3 rounded-xl shadow ${darkMode ? "bg-pink-600 text-white hover:bg-pink-500" : "bg-pink-600 text-white hover:bg-pink-700"}`}>Go to Menu</button>
          </div>
        )}
      </main>

      {Object.values(cart).length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 flex flex-wrap items-center justify-between px-4 py-3 shadow-inner gap-3 ${darkMode ? "bg-gray-800 border-t border-gray-700 text-white" : "bg-white border-t border-gray-200 text-black"}`}>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-5 h-5" checked={allSelected} onChange={handleSelectAll} />
            <span className="text-sm">All</span>
            {Object.values(selectedItems).some((v) => v) && (
              <button onClick={handleDeleteSelected} className="ml-2 text-red-500 hover:text-red-700">
                <Trash2 size={20} />
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="Enter Table Number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-400 ${
              darkMode ? "bg-gray-800 text-white border-gray-600 placeholder-gray-400" : "bg-white border-gray-300 text-black"
            }`}
          />

          <div className="text-sm font-medium">Subtotal: <span className="text-pink-600 font-bold">{formatPrice(selectedTotal)}</span></div>
          <button
            onClick={handleCheckoutClick}
            className={`px-5 py-2 rounded-xl text-white text-sm font-semibold shadow ${loading || orderSent ? "bg-gray-400 cursor-not-allowed" : "bg-pink-600 hover:bg-pink-700"}`}
            disabled={loading || orderSent}
          >
            {loading ? "Sending..." : `Check Out (${Object.keys(selectedItems).filter((id) => selectedItems[id]).length})`}
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto ${
            darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 text-center ${
                darkMode ? 'text-pink-300' : 'text-pink-900'
              }`}>
                Order Confirmation
              </h2>

              <div className={`mb-4 p-3 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Table Number
                </p>
                <p className={`text-lg font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {tableNumber}
                </p>
              </div>

              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Order Details
                </h3>
                <div className="space-y-3">
                  {Object.values(cart)
                    .filter(({ item }) => selectedItems[item._id])
                    .map(({ item, quantity }) => (
                      <div key={item._id} className={`flex justify-between items-center p-3 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </h4>
                          <p className={`text-sm ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {formatPrice(item.price)} × {quantity}
                          </p>
                        </div>
                        <div className={`font-bold ${
                          darkMode ? 'text-pink-300' : 'text-pink-600'
                        }`}>
                          {formatPrice(item.price * quantity)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className={`border-t pt-4 mb-6 ${
                darkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Total
                  </span>
                  <span className={`text-xl font-bold ${
                    darkMode ? 'text-pink-300' : 'text-pink-600'
                  }`}>
                    {formatPrice(selectedTotal)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-600 text-white hover:bg-gray-500' 
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceOrder}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-pink-600 hover:bg-pink-700'
                  }`}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Confirm Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
