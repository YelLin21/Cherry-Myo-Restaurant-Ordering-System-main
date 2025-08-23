import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AdminNavbar from "../components/AdminNavbar.jsx";
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
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000" ||
  "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function KitchenPage() {
  // Admin email addresses
  const ADMIN_EMAIL = ["2001yellin@gmail.com", "u6520242@au.edu", "cherrymyokitchen@gmail.com"];

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth states
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  // Load remembered admin email
  useEffect(() => {
    const rememberedAdmin = localStorage.getItem('rememberAdmin');
    const rememberedEmail = localStorage.getItem('adminEmail');
    
    if (rememberedAdmin === 'true' && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.email);
      
      if (user) {
        // Check if the user email is in the admin list
        if (!ADMIN_EMAIL.includes(user.email)) {
          console.log("Non-admin user detected, signing out:", user.email);
          setLoginError("You are not authorized to access the kitchen page.");
          setUser(null);
          
          // Prevent multiple signOut calls
          if (!isSigningOut) {
            setIsSigningOut(true);
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Error signing out:", error);
            } finally {
              setIsSigningOut(false);
            }
          }
          setAuthLoading(false);
          return;
        }
        
        // User is authorized
        console.log("Admin user authenticated:", user.email);
        setUser(user);
        setLoginError(""); // Clear any previous errors
      } else {
        console.log("No user authenticated");
        setUser(null);
        setIsSigningOut(false); // Reset signing out state
      }
      
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, [isSigningOut]);

  const getProcessedIds = () => {
    const stored = localStorage.getItem("processedOrderIds");
    return stored ? JSON.parse(stored) : [];
  };

  const saveProcessedId = (id) => {
    const current = getProcessedIds();
    const updated = [...new Set([...current, id])];
    localStorage.setItem("processedOrderIds", JSON.stringify(updated));
  };

  useEffect(() => {
    if (!user) return;
    
    const processedIds = getProcessedIds();

    // Initial fetch
    fetch(`${APIBASE}/orders`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => {
        const visible = data.filter(
          (order) =>
            (!order.status || order.status.toLowerCase() === "pending") &&
            !processedIds.includes(order._id)
        );
        setOrders(visible);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("order:new", (newOrder) => {
      console.log("📥 New order:", newOrder);
      const isProcessed = getProcessedIds().includes(newOrder._id);
      const isPendingOrNoStatus =
        !newOrder.status || newOrder.status.toLowerCase() === "pending";

      if (!isProcessed && isPendingOrNoStatus) {
        setOrders((prev) => [...prev, newOrder]);
      }
    });

    socket.on("order:update", (updatedOrder) => {
      setOrders((prev) => {
        const isProcessed = getProcessedIds().includes(updatedOrder._id);
        const isPending =
          updatedOrder.status && updatedOrder.status.toLowerCase() === "pending";
        if (!isPending || isProcessed) {
          return prev.filter((order) => order._id !== updatedOrder._id);
        }
        return prev.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        );
      });
    });

    socket.on("order:delete", (id) => {
      setOrders((prev) => prev.filter((order) => order._id !== id));
    });

    return () => socket.disconnect();
  }, [user]);

  const handleLogin = async () => {
    try {
      setLoginError("");
      const result = await signInWithGoogle();
      
      // Check if the signed-in user is an admin
      if (!ADMIN_EMAIL.includes(result.user.email)) {
        setLoginError("You are not authorized to access the kitchen page.");
        await signOut(auth);
        return;
      }
      
      console.log("Google login successful for admin:", result.user.email);
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("Login was cancelled. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError("Popup was blocked. Please allow popups for this site.");
      } else {
        setLoginError("Failed to sign in with Google. Please try again.");
      }
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    
    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      return;
    }
    
    // Check if email is in admin list before attempting login
    if (!ADMIN_EMAIL.includes(email)) {
      setLoginError("You are not authorized to access the kitchen page.");
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Email login successful for admin:", user.email);
      
      if (rememberMe) {
        localStorage.setItem('rememberAdmin', 'true');
        localStorage.setItem('adminEmail', email);
      } else {
        localStorage.removeItem('rememberAdmin');
        localStorage.removeItem('adminEmail');
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
        case 'auth/invalid-credential':
          setLoginError("Invalid credentials. Please check your email and password.");
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
      console.log("Logging out user:", user?.email);
      localStorage.removeItem('rememberAdmin');
      localStorage.removeItem('adminEmail');
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleMarkAsProcessing = async (orderId) => {
    try {
      const res = await fetch(`${APIBASE}/orders/${orderId}/process`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          processedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update order");

      saveProcessedId(orderId);
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      alert("✅ Order sent to Admin Checkout.");
    } catch (error) {
      console.error(error);
      alert("❌ Failed to mark order as processing.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  if (!user || (loginError && !authLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 bg-gradient-to-br from-pink-50 via-white to-rose-100">
        {/* Falling Cherries Animation */}
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
        
        <div className="relative z-10 w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-lg border bg-white/80 border-pink-200/50 shadow-pink-500/20 transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg relative overflow-hidden">
              <span className="text-white text-2xl font-bold">👨‍🍳</span>
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent"></div>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent" style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}>
              Cherry Myo's Kitchen
            </h1>
            <h2 className="text-xl font-semibold mb-1 text-red-700" style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}>
              Admin Only
            </h2>
          </div>

          <div className="space-y-6">
            {resetMessage && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{resetMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {loginError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-bounce">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{loginError}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cherrymyo.com"
                required
                className="w-full px-4 py-3 rounded-xl border bg-white border-gray-300 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border bg-white border-gray-300 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors duration-200 text-gray-500 hover:text-gray-700"
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
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm hover:underline transition-colors duration-200 text-red-600 hover:text-red-800"
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
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
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
    <div className="min-h-screen bg-gray-100">
      
      <div className=" p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">👨‍🍳 Cherry Myo's Kitchen View</h1>
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">{user.displayName || user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

      {loading && <p className="text-center">Loading orders...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {orders.length === 0 && !loading && (
        <p className="text-center text-gray-600">No orders yet.</p>
      )}

      <div className="grid gap-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-2">
              Table: {order.tableNumber}
            </h2>
            <div className="w-full max-w-md mx-auto">
              <div className="flex justify-between font-semibold text-gray-800 border-b pb-1 mb-2">
                <span>Product</span>
                <span>Quantity</span>
              </div>
              <ul>
                {order.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between text-sm py-1 border-b border-gray-200"
                  >
                    <span>{item.name}</span>
                    <span className="text-gray-600">{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-right mt-4">
              <button
                onClick={() => handleMarkAsProcessing(order._id)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Order processing complete
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
