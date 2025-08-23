import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { io } from "socket.io-client";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, signInWithGoogle } from "../firebase";


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
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Auth states
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-700/50 border-gray-600 text-gray-300 placeholder-gray-500' 
                      : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                  } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors duration-200 ${
                    darkMode
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
              <span>Login with Email</span>
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
    <div className={`min-h-screen transition-all duration-500 relative overflow-hidden ${
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-red-950 to-pink-950 text-white" 
        : "bg-gradient-to-br from-pink-50 via-red-50 to-rose-100 text-gray-900"
    }`}>
      {/* Animated Cherry Background */}
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
            <div className={`${darkMode ? 'text-red-400' : 'text-red-300'}`} style={{ fontSize: `${20 + Math.random() * 30}px` }}>
              🍒
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
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
              ? 'bg-gray-800/30 border-red-500/20 shadow-red-500/10' 
              : 'bg-white/70 border-pink-200/50 shadow-pink-500/20'
          }`}>
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="text-center lg:text-left">
                <h1 className={`text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-bold mb-4 bg-gradient-to-r from-red-600 via-pink-500 to-red-500 bg-clip-text text-transparent leading-tight`}>
                  🎉 Promotion Menu
                </h1>
                <p className={`text-base sm:text-lg ${darkMode ? 'text-red-300' : 'text-red-700'} font-medium`}>
                  Create and manage special promotional offers
                </p>
                
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl h-14 ${
                  darkMode ? 'bg-gray-700/50 text-gray-200' : 'bg-white/80 text-gray-700'
                } shadow-lg`}>
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
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
                  className="group relative px-6 py-3 h-14 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-500/50 overflow-hidden min-w-fit whitespace-nowrap flex items-center justify-center"
                >
                  <div className="absolute inset-0 shimmer"></div>
                  <div className="relative flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-medium">Add Promotion</span>
                  </div>
                </button>
                
                <button
                  onClick={handleLogout}
                  className={`px-6 py-3 h-14 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 min-w-fit whitespace-nowrap flex items-center justify-center ${
                    darkMode 
                      ? 'bg-red-800 hover:bg-red-700 text-red-200 border border-red-700' 
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
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
                <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-pink-500 rounded-full animate-ping"></div>
              </div>
              <div className="mt-8 space-y-2">
                <p className={`text-xl font-semibold ${darkMode ? "text-red-300" : "text-red-600"}`}>
                  Loading Promotions
                </p>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Fetching your promotional menu items...
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
                onClick={fetchPromotionMenuItems}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
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
                      : "bg-gradient-to-br from-pink-100 to-pink-300 border border-pink-100"
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {/* Promotional Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                      darkMode ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white' : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    }`}>
                      <span>🎉</span>
                      <span>PROMO</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
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
                      src={item.image || "https://via.placeholder.com/300x200/ff6b9d/ffffff?text=Promotion"}
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
                          darkMode ? "text-red-400" : "text-red-600"
                        }`}>
                          ฿{item.price}
                        </span>
                      </div>
                      
                      
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Empty State */}
          {!loading && !error && menuItems.length === 0 && (
            <div className={`text-center py-20 rounded-3xl ${
              darkMode ? 'bg-gray-800/30 border border-gray-700' : 'bg-white/70 border border-pink-200'
            } backdrop-blur-lg`}>
              <div className="text-8xl mb-6 animate-bounce">🎉</div>
              <h3 className={`text-3xl font-bold mb-4 ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}>
                No Promotions Yet
              </h3>
              <p className={`text-lg mb-8 max-w-md mx-auto ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Start creating amazing promotional offers to attract more customers and boost your sales!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="group px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Your First Promotion</span>
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
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-pink-500"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🎉</span>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {editingItem ? "Edit Promotion" : "Create New Promotion"}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {editingItem ? "Update your promotional item" : "Add a new promotional offer"}
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
                      <span>Promotion Name</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-500/20 ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500"
                      }`}
                      placeholder="e.g., Super Cherry Special Deal"
                    />
                  </div>

                  <div>
                    <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${
                      darkMode ? "text-gray-200" : "text-gray-700"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span>Special Price (฿)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                        className={`w-full px-4 py-3 pl-8 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-500/20 ${
                          darkMode 
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500"
                        }`}
                        placeholder="99.00"
                      />
                      <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        ฿
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${
                      darkMode ? "text-gray-200" : "text-gray-700"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Promotion Image</span>
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
                            className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 hover:border-red-500 ${
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
                                PNG, JPG, GIF up to 5MB
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* OR divider */}
                      <div className="relative">
                        <div className={`absolute inset-0 flex items-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className={`px-2 text-xs font-medium ${
                            darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                          }`}>
                            OR
                          </span>
                        </div>
                      </div>

                      {/* URL input option */}
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                          Image URL
                        </label>
                        <input
                          type="url"
                          value={formData.image}
                          onChange={handleImageUrlChange}
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-500/20 ${
                            darkMode 
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500"
                          }`}
                          placeholder="https://example.com/image.jpg"
                        />
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
                              alert("Failed to load image. Please check the URL or select a different file.");
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
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 shadow-lg"
                >
                  {editingItem ? "Update Promotion" : "Create Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
