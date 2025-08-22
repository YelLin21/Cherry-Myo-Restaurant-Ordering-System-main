import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { io } from "socket.io-client";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, signInWithGoogle } from "../firebase";

// Simple Google SVG icon component
function GoogleIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48">
      <g>
        <path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.6 0 5 .9 6.9 2.4l6-6C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.2-.3-3.5z"/>
        <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.8 13 24 13c2.6 0 5 .9 6.9 2.4l6-6C34.5 6.5 29.6 4 24 4 15.6 4 8.1 9.7 6.3 14.7z"/>
        <path fill="#FBBC05" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.6 35.5 27 36.5 24 36.5c-4.6 0-8.7-2.7-10.3-7l-6.6 5.1C8.1 38.3 15.6 44 24 44z"/>
        <path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.1 3-3.6 5.2-6.3 6.3l6.5 5.3C40.7 36.2 44 31.7 44 24c0-1.3-.1-2.2-.4-3.5z"/>
      </g>
    </svg>
  );
}

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function AdminPromotionMenuPage() {
  // Admin email addresses
  const ADMIN_EMAIL = ["2001yellin@gmail.com", "u6520242@au.edu", "cherrymyo@gmail.com"];

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

  // Auth states
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useDarkMode();
  const { totalItems } = useCart();

  // Auto-hide messages after 10 seconds
  useEffect(() => {
    if (loginError) {
      const timer = setTimeout(() => {
        setLoginError("");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [loginError]);

  useEffect(() => {
    if (resetMessage) {
      const timer = setTimeout(() => {
        setResetMessage("");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [resetMessage]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !ADMIN_EMAIL.includes(user.email)) {
        setLoginError("You are not authorized to access the promotion menu page.");
        setUser(null);
        await signOut(auth);
        setAuthLoading(false);
        return;
      }
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!user) return;
    
    fetchPromotionMenuItems();
    
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    
    socket.on("connect", () => {
      console.log("Admin Promotion Menu socket connected:", socket.id);
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
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Failed to sign in with Google. Please try again.");
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!ADMIN_EMAIL.includes(user.email)) {
        setLoginError("You are not authorized to access the promotion menu page.");
        await signOut(auth);
        return;
      }
      
      if (rememberMe) {
        localStorage.setItem('rememberAdmin', 'true');
      }
      
    } catch (error) {
      console.error("Email login error:", error);
      switch (error.code) {
        case 'auth/user-not-found':
          setLoginError("No admin account found with this email address.");
          break;
        case 'auth/wrong-password':
          setLoginError("Incorrect password. Please try again.");
          break;
        case 'auth/invalid-email':
          setLoginError("Invalid email address format.");
          break;
        case 'auth/too-many-requests':
          setLoginError("Too many failed attempts. Please try again later.");
          break;
        default:
          setLoginError("Login failed. Please check your credentials and try again.");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setLoginError("Please enter your email address first.");
      return;
    }

    if (!ADMIN_EMAIL.includes(email)) {
      setLoginError("This email is not authorized for admin access.");
      return;
    }

    setLoginError("");
    setResetMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent! Check your inbox and follow the instructions.");
    } catch (error) {
      console.error("Password reset error:", error);
      switch (error.code) {
        case 'auth/user-not-found':
          setLoginError("No admin account found with this email address.");
          break;
        case 'auth/invalid-email':
          setLoginError("Invalid email address format.");
          break;
        case 'auth/too-many-requests':
          setLoginError("Too many reset requests. Please try again later.");
          break;
        default:
          setLoginError("Failed to send reset email. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  if (!user || loginError) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-red-900 to-pink-900' 
          : 'bg-gradient-to-br from-pink-50 via-white to-rose-100'
      }`}>
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                animationName: 'fall',
                animationDuration: `${5 + Math.random() * 5}s`,
                animationDelay: `${Math.random() * 10}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear'
              }}
            >
              <div 
                className="text-red-500 opacity-60"
                style={{
                  fontSize: `${12 + Math.random() * 8}px`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              >
                🍒
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes fall {
            0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
        `}</style>
        
        <div className={`relative z-10 w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-lg border transition-all duration-300 hover:shadow-xl ${
          darkMode 
            ? 'bg-gray-800/70 border-pink-500/20 shadow-pink-500/10' 
            : 'bg-white/80 border-pink-200/50 shadow-pink-500/20'
        } transform hover:scale-105`}>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg relative overflow-hidden">
              <span className="text-white text-2xl font-bold">🎉</span>
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent"></div>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent" style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}>
              Promotion Menu
            </h1>
            <h2 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-pink-300' : 'text-red-700'}`} style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}>
              Admin Access
            </h2>
          </div>

          <div className="space-y-6">
            {resetMessage && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">{resetMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {loginError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 animate-bounce">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{loginError}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cherrymyo.com"
                required
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-gray-300 placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-gray-300 placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className={`text-sm hover:underline transition-colors duration-200 ${
                  darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-red-600 hover:text-red-800'
                }`}
              >
                Forgot password?
              </button>
            </div>

            <button
              onClick={handleEmailLogin}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center gap-2 text-lg"
              style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Access Promotion Menu</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-500/50 flex items-center justify-center gap-3 text-lg border border-gray-300"
              style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}
            >
              <GoogleIcon className="w-6 h-6" />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
    }`}>
      <AdminNavbar />
      
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
