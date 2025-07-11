import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function AdminPromotionMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
    category: "Promotion"
  });

  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useDarkMode();
  const { totalItems } = useCart();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetchPromotionMenuItems();
    
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    
    socket.on("connect", () => {
      console.log("✅ Admin Promotion Menu socket connected:", socket.id);
    });

    socket.on("menu:new", (newItem) => {
      if (newItem.category === "Promotion") {
        setMenuItems((prev) => [...prev, newItem]);
      }
    });

    socket.on("menu:update", (updatedItem) => {
      if (updatedItem.category === "Promotion") {
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

  const fetchPromotionMenuItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${APIBASE}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu items");
      const data = await res.json();
      const promotionItems = data.filter(item => item.category === "Promotion");
      setMenuItems(promotionItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingItem 
        ? `${APIBASE}/menu/${editingItem._id}`
        : `${APIBASE}/menu`;
      
      const method = editingItem ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
        }),
      });

      if (!res.ok) throw new Error("Failed to save menu item");
      
      resetForm();
      setShowForm(false);
      fetchPromotionMenuItems();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      image: item.image || "",
      category: "Promotion"
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      const res = await fetch(`${APIBASE}/menu/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete menu item");
      
      setMenuItems(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      image: "",
      category: "Promotion"
    });
    setEditingItem(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={totalItems} />
      
      <main className="pt-24 pb-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${
              darkMode ? "text-pink-300" : "text-pink-900"
            }`}>
              🎉 Admin Promotion Menu
            </h1>
            <button
              onClick={() => setShowForm(true)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                darkMode 
                  ? "bg-pink-600 text-white hover:bg-pink-500"
                  : "bg-pink-600 text-white hover:bg-pink-700"
              }`}
            >
              + Add Promotion Item
            </button>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
              <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Loading promotion menu items...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div
                  key={item._id}
                  className={`rounded-xl shadow-lg p-6 transition-all duration-200 hover:shadow-xl ${
                    darkMode 
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"
                    }`}>
                      Promotion
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className={`px-3 py-1 text-sm rounded ${
                          darkMode 
                            ? "bg-blue-600 text-white hover:bg-blue-500"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className={`px-3 py-1 text-sm rounded ${
                          darkMode 
                            ? "bg-red-600 text-white hover:bg-red-500"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <img
                    src={item.image || "https://via.placeholder.com/150"}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  
                  <h3 className={`text-lg font-semibold mb-2 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {item.name}
                  </h3>
                  
                  <p className={`text-xl font-bold ${
                    darkMode ? "text-pink-300" : "text-pink-600"
                  }`}>
                    ฿{item.price}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && menuItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className={`text-xl font-semibold mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}>
                No Promotion Menu Items Yet
              </h3>
              <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Create your first promotion menu item to get started
              </p>
              <button
                onClick={() => setShowForm(true)}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? "bg-pink-600 text-white hover:bg-pink-500"
                    : "bg-pink-600 text-white hover:bg-pink-700"
                }`}
              >
                + Add Promotion Item
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl shadow-2xl ${
            darkMode ? "bg-gray-800 border border-gray-600" : "bg-white border border-gray-200"
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-bold ${
                  darkMode ? "text-pink-300" : "text-pink-900"
                }`}>
                  {editingItem ? "Edit Promotion Item" : "Add New Promotion Item"}
                </h2>
                <button
                  onClick={handleCancel}
                  className={`text-gray-400 hover:text-gray-600 ${
                    darkMode ? "hover:text-gray-300" : "hover:text-gray-600"
                  }`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                      darkMode 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Price (฿)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                      darkMode 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    placeholder="Enter price"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                      darkMode 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    placeholder="Enter image URL (optional)"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                      darkMode 
                        ? "bg-pink-600 text-white hover:bg-pink-500"
                        : "bg-pink-600 text-white hover:bg-pink-700"
                    }`}
                  >
                    {editingItem ? "Update Item" : "Add Item"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                      darkMode 
                        ? "bg-gray-600 text-white hover:bg-gray-500"
                        : "bg-gray-600 text-white hover:bg-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
