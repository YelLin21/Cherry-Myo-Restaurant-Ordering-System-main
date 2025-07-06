import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import "../index.css";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000" ||
  "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function CartPage() {
  const [selectedItems, setSelectedItems] = useState({});
  const [tableNumber, setTableNumber] = useState("");
  const [orderSent, setOrderSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { darkMode, setDarkMode } = useDarkMode();

  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total, clearCart } = useCart();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleCheckboxChange = (id) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteSelected = () => {
    Object.keys(selectedItems).forEach((id) => {
      if (selectedItems[id]) {
        removeFromCart(id, true);
      }
    });
    setSelectedItems({});
  };

  const handlePlaceOrder = async () => {
    if (!tableNumber.trim()) {
      alert("Please enter your table number.");
      return;
    }

    setLoading(true);

    const order = {
      tableNumber,
      items: Object.values(cart).map(({ item, quantity }) => ({
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

      setTimeout(() => {
        setOrderSent(false);
        navigate("/"); // Redirect to home page after 3 seconds
      }, 2000);
    } catch (err) {
      alert("Failed to send order.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

      {orderSent && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 border px-6 py-3 rounded shadow-lg z-50 animate-fadeIn ${
          darkMode 
            ? 'bg-green-800 border-green-600 text-green-200' 
            : 'bg-green-100 border-green-400 text-green-800'
        }`}>
          ✅ Your order is sending to the kitchen...
        </div>
      )}

      <main className={`pt-20 px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className={`rounded-xl p-4 sm:p-6 lg:p-8 shadow-md transition-colors duration-300 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-pink-50 border border-pink-100'
        }`}>
          <h1 className={`text-2xl font-bold text-center mb-6 transition-colors duration-300 ${
            darkMode ? 'text-pink-300' : 'text-gray-800'
          }`}>Cart</h1>

          {Object.values(cart).length > 0 ? (
            <div className={`p-4 sm:p-6 rounded-lg shadow-md transition-colors duration-300 ${
              darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold mb-4 ${
                darkMode ? 'text-pink-300' : 'text-gray-800'
              }`}>🛒 Your Cart</h2>

              <div className={`hidden md:flex justify-between font-semibold border-b pb-2 mb-2 ${
                darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-800'
              }`}>
                <span className="w-[5%]"></span>
                <span className="w-[35%]">Item</span>
                <span className="w-[20%] text-right">Price</span>
                <span className="w-[20%] text-center">Quantity</span>
                <span className="w-[20%] text-right">Total</span>
              </div>

              <ul className="space-y-4">
                {Object.values(cart).map(({ item, quantity }) => (
                  <li
                    key={item._id}
                    className={`flex flex-col md:flex-row justify-between items-center border rounded-md p-3 gap-4 transition-colors duration-300 ${
                      darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="md:w-[5%]"
                      checked={!!selectedItems[item._id]}
                      onChange={() => handleCheckboxChange(item._id)}
                    />
                    <span className={`md:w-[35%] text-center md:text-left ${
                      darkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      {item.name}
                    </span>
                    <span className={`md:w-[20%] text-right ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {item.price} Baht
                    </span>

                    <span className="md:w-[20%] flex justify-center items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className={`px-2 py-1 rounded text-white transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-600 hover:bg-gray-500' 
                            : 'bg-gray-400 hover:bg-gray-500'
                        }`}
                      >
                        −
                      </button>
                      <span className={`${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className={`px-2 py-1 rounded text-white transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-pink-600 hover:bg-pink-500' 
                            : 'bg-pink-600 hover:bg-pink-700'
                        }`}
                      >
                        +
                      </button>
                    </span>

                    <span className={`md:w-[20%] text-right ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {item.price * quantity} Baht
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full md:w-auto transition-colors duration-200"
                >
                  Delete Selected
                </button>
                <div className={`text-lg font-bold ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Total Price: {total} Baht
                </div>
              </div>

              <div className="mt-6">
                <input
                  type="text"
                  placeholder="Enter Table Number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className={`border px-4 py-2 rounded w-full md:w-1/2 mb-4 transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />

                <button
                  onClick={handlePlaceOrder}
                  className={`text-white px-6 py-2 rounded w-full md:w-auto transition-colors duration-200 ${
                    orderSent || loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : darkMode
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                  disabled={orderSent || loading}
                >
                  {loading
                    ? "⌛ Sending..."
                    : orderSent
                    ? "Order Sent"
                    : "Next →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className={`text-xl mb-4 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Your cart is empty.</p>
              <button
                onClick={() => navigate("/")}
                className={`px-6 py-3 rounded transition-colors duration-200 ${
                  darkMode 
                    ? 'bg-pink-600 text-white hover:bg-pink-500' 
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                Go to Menu
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
