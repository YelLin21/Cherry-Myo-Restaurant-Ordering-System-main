import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import AdminAuth from "../components/AdminAuth.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function AdminSpecialMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
    category: "Special"
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useDarkMode();
  const { totalItems } = useCart();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const fetchSpecialMenuItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${APIBASE}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu items");
      const data = await res.json();
      const specialItems = data.filter(item => item.category === "Special");
      setMenuItems(specialItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check for duplicate names when creating a new item or editing with a different name
      const trimmedName = formData.name.trim().toLowerCase();
      const existingItem = menuItems.find(item => 
        item.name.trim().toLowerCase() === trimmedName && 
        (!editingItem || item._id !== editingItem._id)
      );
      
      if (existingItem) {
        Swal.fire({
          title: 'Duplicate Item',
          text: 'You already have that item. Please choose a different name.',
          icon: 'warning',       // yellow ⚠️ icon
          confirmButtonText: 'OK'
        });        
        return;
      }

      // Validate price - must be greater than zero
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        const action = editingItem ? "update" : "create";
        Swal.fire({
          title: 'Invalid Price',
          text: `Cannot ${action} menu item. Price must be greater than zero. Please enter a valid price.`,
          icon: 'warning',       // ⚠️ yellow warning icon
          confirmButtonText: 'OK'
        });        
        return;
      }
      
      let imageData = formData.image;
      
      // If a file is selected, convert it to base64
      if (selectedFile) {
        imageData = await convertFileToBase64(selectedFile);
      }

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
          image: imageData,
          price: parseFloat(formData.price),
        }),
      });

      if (!res.ok) throw new Error("Failed to save menu item");
      
      resetForm();
      setShowForm(false);
      fetchSpecialMenuItems();
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: `Error: ${err.message}`,
        icon: 'error',           // red ❌ icon
        confirmButtonText: 'OK'
      });    
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      image: item.image || "",
      category: "Special"
    });
    setImagePreview(item.image || "");
    setSelectedFile(null);
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
      Swal.fire({
        title: 'Error',
        text: `Error: ${err.message}`,
        icon: 'error',           // red ❌ icon
        confirmButtonText: 'OK'
      });
    }
  };

  const handleStockToggle = async (id, newStockStatus) => {
    try {
      const res = await fetch(`${APIBASE}/menu/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outofstock: newStockStatus }),
      });
      
      if (!res.ok) throw new Error("Failed to update stock status");
      
      // Socket will handle the real-time update
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: `Error: ${err.message}`,
        icon: 'error',           // red ❌ icon
        confirmButtonText: 'OK'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      image: "",
      category: "Special"
    });
    setSelectedFile(null);
    setImagePreview("");
    setEditingItem(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          title: 'Invalid File',
          text: 'Please select a valid image file (JPEG, PNG, GIF, or WebP).',
          icon: 'error',          // ❌ red cross icon
          confirmButtonText: 'OK'
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        Swal.fire({
          title: 'File Too Large',
          text: 'File size must be less than 10 MB.',
          icon: 'warning',        // ⚠️ yellow warning icon
          confirmButtonText: 'OK'
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setFormData({...formData, image: ""});
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle URL input change
  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData({...formData, image: url});
    if (url) {
      setImagePreview(url);
      setSelectedFile(null);
    } else {
      setImagePreview("");
    }
  };

  // Convert file to base64 for storage
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <AdminAuth>
      {({ user, handleLogout }) => (
        <AdminSpecialMenuContent 
          user={user} 
          handleLogout={handleLogout}
          menuItems={menuItems}
          setMenuItems={setMenuItems}
          loading={loading}
          setLoading={setLoading}
          error={error}
          setError={setError}
          showForm={showForm}
          setShowForm={setShowForm}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          formData={formData}
          setFormData={setFormData}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          fetchSpecialMenuItems={fetchSpecialMenuItems}
          handleSubmit={handleSubmit}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleStockToggle={handleStockToggle}
          resetForm={resetForm}
          handleCancel={handleCancel}
          handleFileSelect={handleFileSelect}
          handleImageUrlChange={handleImageUrlChange}
          convertFileToBase64={convertFileToBase64}
          navigate={navigate}
          darkMode={darkMode}
          totalItems={totalItems}
        />
      )}
    </AdminAuth>
  );
}

function AdminSpecialMenuContent({ 
  user, 
  handleLogout, 
  menuItems, 
  setMenuItems, 
  loading, 
  setLoading, 
  error, 
  setError, 
  showForm, 
  setShowForm, 
  editingItem, 
  setEditingItem, 
  formData, 
  setFormData, 
  selectedFile, 
  setSelectedFile, 
  imagePreview, 
  setImagePreview, 
  fetchSpecialMenuItems, 
  handleSubmit, 
  handleEdit, 
  handleDelete, 
  handleStockToggle,
  resetForm, 
  handleCancel, 
  handleFileSelect, 
  handleImageUrlChange, 
  convertFileToBase64, 
  navigate, 
  darkMode, 
  totalItems 
}) {
  
  useEffect(() => {
    if (!user) return;
    
    fetchSpecialMenuItems();
    
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    
    socket.on("connect", () => {
      console.log("Admin Special Menu socket connected:", socket.id);
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
  }, [user]);

  return (
    <div className={`min-h-screen transition-all duration-500 relative overflow-hidden ${
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-amber-950 to-yellow-950 text-white" 
        : "bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 text-gray-900"
    }`}>
      {/* Animated Star Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationName: 'float',
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 5}s`,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          >
            <div className={`${darkMode ? 'text-yellow-400' : 'text-amber-300'}`} style={{ fontSize: `${20 + Math.random() * 30}px` }}>
              ⭐
            </div>
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
          100% { transform: translateY(0px) rotate(360deg); opacity: 0.1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      <AdminNavbar />
      
      <main className="pt-28 pb-32 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header Section */}
          <div className={`relative mb-12 p-8 rounded-3xl shadow-2xl backdrop-blur-lg border transition-all duration-500 ${
            darkMode 
              ? 'bg-gray-800/30 border-yellow-500/20 shadow-yellow-500/10' 
              : 'bg-white/70 border-amber-200/50 shadow-amber-500/20'
          }`}>
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="text-center lg:text-left">
                <h1 className={`text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight`}>
                  🌟 Special Menu
                </h1>
                <p className={`text-base sm:text-lg ${darkMode ? 'text-yellow-300' : 'text-amber-700'} font-medium`}>
                  Create and manage exclusive special dishes
                </p>
                
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl h-14 ${
                  darkMode ? 'bg-gray-700/50 text-gray-200' : 'bg-white/80 text-gray-700'
                } shadow-lg`}>
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-semibold text-sm leading-tight">{user.displayName || 'Admin'}</span>
                    <span className="text-xs opacity-75 leading-tight">{user.email}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowForm(true)}
                  className="group relative px-6 py-3 h-14 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-yellow-500/50 overflow-hidden min-w-fit whitespace-nowrap flex items-center justify-center"
                >
                  <div className="absolute inset-0 shimmer"></div>
                  <div className="relative flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-medium">Add Special</span>
                  </div>
                </button>
                
                <button
                  onClick={handleLogout}
                  className={`px-6 py-3 h-14 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 min-w-fit whitespace-nowrap flex items-center justify-center ${
                    darkMode 
                      ? 'bg-amber-800 hover:bg-amber-700 text-amber-200 border border-amber-700' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg'
                  }`}
                >
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="relative inline-block">
                <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-amber-500 rounded-full animate-ping"></div>
              </div>
              <div className="mt-8 space-y-2">
                <p className={`text-xl font-semibold ${darkMode ? "text-yellow-300" : "text-yellow-600"}`}>
                  Loading Special Menu
                </p>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Fetching your special menu items...
                </p>
              </div>
            </div>
          )}

          {/* Enhanced Error State */}
          {error && (
            <div className={`text-center py-20 rounded-2xl ${
              darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="text-6xl mb-4">😔</div>
              <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                Oops! Something went wrong
              </h3>
              <p className={`text-lg mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                {error}
              </p>
              <button
                onClick={fetchSpecialMenuItems}
                className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Enhanced Menu Items Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {menuItems.map((item, index) => (
                <div
                  key={item._id}
                  className={`group relative rounded-2xl shadow-xl overflow-hidden transition-all duration-500 hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 ${
                    darkMode 
                      ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
                      : "bg-gradient-to-br from-white to-amber-50 border border-amber-100"
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {/* Special Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                      darkMode ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white' : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
                    }`}>
                      <span>⭐</span>
                      <span>SPECIAL</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={() => handleStockToggle(item._id, !item.outofstock)}
                      className={`p-2 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110 ${
                        item.outofstock 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                      title={item.outofstock ? "Mark as In Stock" : "Mark as Out of Stock"}
                    >
                      {item.outofstock ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110"
                      title="Edit Item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110"
                      title="Delete Item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Image Section */}
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image || "https://via.placeholder.com/300x200/fbbf24/ffffff?text=Special+Dish"}
                      alt={item.name}
                      className="w-full h-56 object-cover transition-all duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-6 space-y-4">
                    <h3 className={`text-xl font-bold leading-tight ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {item.name}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Special Price
                        </span>
                        <span className={`text-2xl font-bold ${
                          darkMode ? "text-yellow-400" : "text-amber-600"
                        }`}>
                          {item.price} MMK
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Status
                        </span>
                        <span className={`text-sm font-bold ${
                          item.outofstock 
                            ? 'text-red-500' 
                            : darkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          {item.outofstock ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleStockToggle(item._id, !item.outofstock)}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                          item.outofstock 
                            ? darkMode 
                              ? 'bg-green-800 text-green-200 hover:bg-green-700' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                            : darkMode
                              ? 'bg-red-800 text-red-200 hover:bg-red-700'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {item.outofstock ? 'Stock' : 'Unstock'}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                          darkMode 
                            ? "bg-blue-800 text-blue-200 hover:bg-blue-700"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                          darkMode 
                            ? "bg-red-800 text-red-200 hover:bg-red-700"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Empty State */}
          {!loading && !error && menuItems.length === 0 && (
            <div className={`text-center py-20 rounded-3xl ${
              darkMode ? 'bg-gray-800/30 border border-gray-700' : 'bg-white/70 border border-amber-200'
            } backdrop-blur-lg`}>
              <div className="text-8xl mb-6 animate-bounce">🌟</div>
              <h3 className={`text-3xl font-bold mb-4 ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}>
                No Special Items Yet
              </h3>
              <p className={`text-lg mb-8 max-w-md mx-auto ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Start creating exclusive special dishes that will wow your customers and make them come back for more!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="group px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Your First Special</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className={`max-w-lg w-full my-8 rounded-3xl shadow-2xl transform transition-all duration-500 scale-100 max-h-[90vh] overflow-y-auto ${
            darkMode ? "bg-gray-800 border border-gray-600" : "bg-white border border-gray-200"
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} relative overflow-hidden`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🌟</span>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {editingItem ? "Edit Special Item" : "Create New Special"}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {editingItem ? "Update your special dish" : "Add a new exclusive special"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className={`p-2 rounded-xl transition-all duration-200 hover:rotate-90 ${
                    darkMode ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-120px)]">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${
                      darkMode ? "text-gray-200" : "text-gray-700"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a2 2 0 012-2z" />
                      </svg>
                      <span>Special Dish Name</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-yellow-500"
                      }`}
                      placeholder="e.g., Chef's Special Signature Dish"
                    />
                  </div>

                  <div>
                    <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${
                      darkMode ? "text-gray-200" : "text-gray-700"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span>Special Price (MMK)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                        className={`w-full px-4 py-3 pl-8 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 ${
                          darkMode 
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-yellow-500"
                        }`}
                        placeholder="5000.00"
                      />
                      <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        K
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Price must be greater than 0 MMK
                    </p>
                  </div>

                  <div>
                    <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${
                      darkMode ? "text-gray-200" : "text-gray-700"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Special Dish Image</span>
                    </label>
                    
                    {/* Upload from device option */}
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                          Upload from Device
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="imageUpload"
                          />
                          <label
                            htmlFor="imageUpload"
                            className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 hover:border-yellow-500 ${
                              darkMode 
                                ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600" 
                                : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <div className="text-center">
                              <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span className="text-sm font-medium">
                                {selectedFile ? selectedFile.name : 'Click to upload image'}
                              </span>
                              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                PNG, JPG, GIF up to 10MB
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mt-4">
                        <label className={`block text-xs font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                          Preview
                        </label>
                        <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-40 object-cover"
                            onError={(e) => {
                              setImagePreview("");
                              setSelectedFile(null);
                              Swal.fire({
                                title: 'Failed to Load Image',
                                text: 'Please check the URL or select a different file.',
                                icon: 'error',          // ❌ red cross icon for errors
                                confirmButtonText: 'OK'
                              });                            
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview("");
                              setSelectedFile(null);
                              setFormData({...formData, image: ""});
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                </div>
              </div>
              <div className={`flex gap-4 p-6 border-t sticky bottom-0 bg-inherit ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 border-2 ${
                    darkMode 
                      ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:border-gray-400"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-500/50 shadow-lg"
                >
                  {editingItem ? "Update Special" : "Create Special"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
