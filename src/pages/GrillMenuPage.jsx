import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx"; // shared cart context

export default function GrillMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total } = useCart();

  useEffect(() => {
    fetch("http://localhost:5000/api/menu")
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
  }, []);

  const getQuantity = (id) => cart[id]?.quantity || 0;

  return (
    <div>
      <Navbar />
      <main className="p-8 bg-gray-100 min-h-screen pt-10">
        <div className="pt-16 p-6 bg-pink-50 min-h-screen">
          <h1 className="text-2xl font-bold text-center mb-6">Grill Menu</h1>

          {loading && <p className="text-center">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <div
                key={item._id}
                className="rounded-xl shadow p-4 flex flex-col items-center"
                style={{ backgroundColor: "#FFC0CB" }}
              >
                <img
                  src={item.image || "https://via.placeholder.com/150"}
                  alt={item.name}
                  className="w-32 h-32 object-cover rounded mb-2"
                />
                <h2 className="font-semibold text-lg">{item.name}</h2>
                <p className="text-gray-600">{item.price} Baht</p>

                <div className="flex items-center mt-3">
                  <button
                    onClick={() => removeFromCart(item)}
                    className="px-3 py-1 text-white rounded"
                    style={{ backgroundColor: "#9B9B9B" }}
                  >
                    −
                  </button>
                  <span className="px-4 font-semibold text-lg">
                    {getQuantity(item._id)}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="px-3 py-1 text-white rounded"
                    style={{ backgroundColor: "#BD3B53" }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Shared Cart Summary */}
          {Object.values(cart).length > 0 && (
            <div className="mt-10 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">🛒 Cart</h2>

              {/* Header Row */}
              <div className="flex justify-between font-semibold border-b pb-2 mb-2">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-right">Price</span>
                <span className="w-1/4 text-center">Quantity</span>
                <span className="w-1/4 text-right">Total</span>
              </div>

              {/* Cart Items */}
              <ul className="space-y-2">
                {Object.values(cart).map(({ item, quantity }) => (
                  <li key={item._id} className="flex justify-between">
                    <span className="w-1/2">{item.name}</span>
                    <span className="w-1/4 text-right">{item.price}</span>
                    <span className="w-1/4 text-center">{quantity}</span>
                    <span className="w-1/4 text-right">{item.price * quantity} Baht</span>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between mt-4 font-bold text-lg">
                <span>Total Price:</span>
                <span>{total} Baht</span>
              </div>

              <button
                onClick={() => navigate("/cart")}
                className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
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
