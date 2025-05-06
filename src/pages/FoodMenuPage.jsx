import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

const TABS = ["Breakfast", "Lunch", "Dinner"];

export default function FoodMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState({});
  const [activeTab, setActiveTab] = useState("Breakfast");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/menu")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch menu");
        return res.json();
      })
      .then((data) => {
        setMenuItems(data);
        const initialQuantities = {};
        data.forEach((item) => {
          initialQuantities[item._id] = 0;
        });
        setQuantities(initialQuantities);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleIncrement = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: prev[id] + 1,
    }));
  };

  const handleDecrement = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: prev[id] > 0 ? prev[id] - 1 : 0,
    }));
  };

  const cartItems = menuItems.filter((item) => quantities[item._id] > 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * quantities[item._id],
    0
  );

  const filteredItems = menuItems.filter(
    (item) => item.category === activeTab
  );

  return (
    <div>
      <Navbar />
      <main className="p-8 bg-gray-100 min-h-screen pt-10">
        <div className="pt-16 p-6 bg-pink-50 min-h-screen">
          <h1 className="text-2xl font-bold text-center mb-6">Our Menu</h1>

          {/* Tabs for Categories */}
          <div className="flex justify-center mb-6 gap-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full font-medium ${
                  activeTab === tab
                    ? "bg-pink-700 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading && <p className="text-center">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
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
                    onClick={() => handleDecrement(item._id)}
                    className="px-3 py-1 text-white rounded"
                    style={{ backgroundColor: "#9B9B9B" }}
                  >
                    −
                  </button>
                  <span className="px-4 font-semibold text-lg">
                    {quantities[item._id]}
                  </span>
                  <button
                    onClick={() => handleIncrement(item._id)}
                    className="px-3 py-1 text-white rounded"
                    style={{ backgroundColor: "#BD3B53" }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart View */}
          {cartItems.length > 0 && (
            <div className="mt-10 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">🛒 Cart</h2>
              <ul className="space-y-2">
                {cartItems.map((item) => (
                  <li key={item._id} className="flex justify-between">
                    <span>
                      {item.name} × {quantities[item._id]}
                    </span>
                    <span>{item.price * quantities[item._id]} Baht</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between mt-4 font-bold text-lg">
                <span>Total:</span>
                <span>{subtotal} Baht</span>
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
