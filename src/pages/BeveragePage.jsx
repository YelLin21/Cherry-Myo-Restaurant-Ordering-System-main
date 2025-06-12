import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function BeverageMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total } = useCart();

  useEffect(() => {
    fetch(`${APIBASE}/menu`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch beverage menu");
        return res.json();
      })
      .then((data) => {
        const beverageItems = data.filter((item) => item.category === "Beverage");
        setMenuItems(beverageItems);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Setup socket connection
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });
    socket.on("menu:new", (newItem) => {
      console.log("📦 New item received:", newItem);
      if (newItem.category === "Beverage") {
        setMenuItems((prev) => [...prev, newItem]);
      }
    });
    socket.on("menu:update", (updatedItem) => {
      console.log("✏️ Updated item received:", updatedItem);
      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === updatedItem._id ? updatedItem : item
        )
      );
    });
    socket.on("menu:delete", (id) => {
      console.log("🗑️ Deleted item ID received:", id);
      setMenuItems((prev) => prev.filter((item) => item._id !== id));
    });
    return () => {
      socket.disconnect();
    };
    
  }, []);

  const getQuantity = (id) => cart[id]?.quantity || 0;

  return (
    <div>
      <Navbar />
      <main className="pt-24 p-4 bg-gray-100 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-6 text-pink-900">Beverage Menu</h1>

          {loading && <p className="text-center">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <div
                key={item._id}
                className="rounded-xl shadow p-4 flex flex-col items-center bg-pink-200"
              >
                <img
                  src={item.image || "https://via.placeholder.com/150"}
                  alt={item.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded mb-3"
                />
                <h2 className="font-semibold text-lg text-center">{item.name}</h2>
                <p className="text-gray-700">{item.price} Baht</p>

                <div className="flex items-center mt-3 space-x-3">
                  <button
                    onClick={() => removeFromCart(item)}
                    className="px-3 py-1 text-white rounded bg-gray-600 hover:bg-gray-700"
                  >
                    −
                  </button>
                  <span className="px-2 font-semibold text-lg">{getQuantity(item._id)}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="px-3 py-1 text-white rounded bg-red-500 hover:bg-red-600"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          {Object.values(cart).length > 0 && (
            <div className="mt-10 bg-white p-4 sm:p-6 rounded-lg shadow-md max-w-3xl mx-auto">
              <h2 className="text-xl font-bold mb-4 text-pink-900">🛒 Cart</h2>

              <div className="hidden md:flex justify-between font-semibold border-b pb-2 mb-2">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-right">Price</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Total</span>
              </div>

              <ul className="space-y-3">
                {Object.values(cart).map(({ item, quantity }) => (
                  <li
                    key={item._id}
                    className="flex flex-col md:flex-row md:justify-between text-sm md:text-base"
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

              <div className="flex justify-between mt-4 font-bold text-lg">
                <span>Total:</span>
                <span>{total} Baht</span>
              </div>

              <button
                onClick={() => navigate("/cart")}
                className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 w-full sm:w-auto"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
