import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, signInWithGoogle } from "../firebase";
import { useDarkMode } from "../pages/DarkModeContext.jsx";
import { jwtDecode } from "jwt-decode";

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
export default function AdminAuth({ children, onLogout }) {
  const { darkMode } = useDarkMode();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  
  // Email/Password login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  // Auto-hide messages after 10 seconds
  useEffect(() => {
    if (loginError) {
      const timer = setTimeout(() => {
        setLoginError("");
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [loginError]);

  useEffect(() => {
    if (resetMessage) {
      const timer = setTimeout(() => {
        setResetMessage("");
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [resetMessage]);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log("Decoded JWT:", decoded);
        // Check expiration
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          localStorage.removeItem("adminToken");
          setUser(null);
        } else if (decoded.role === "admin") {
          setUser({ id: decoded.id, email: decoded.email, role: decoded.role });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("JWT decode error:", error);
        localStorage.removeItem("adminToken");
        setUser(null);
      }
    }
    setLoading(false);
  }, []);
  
  
  const handleLogin = async () => {
    setLoginError("");
    
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific error messages
      if (error.message.includes('cancelled') || error.message.includes('closed')) {
        setLoginError("Sign-in was cancelled. Please try again.");
      } else if (error.message.includes('blocked')) {
        setLoginError("Popup was blocked. Please allow popups and try again.");
      } else if (error.message.includes('timeout')) {
        setLoginError("Sign-in timed out. Please check your connection and try again.");
      } else {
        setLoginError("Failed to sign in with Google. Please try again.");
      }
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
  
    try {
      const res = await fetch(`${APIBASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
  
      const data = await res.json();
      const { token, user } = data;
  
      // Check role dynamically
      if (user.role !== "admin") {
        setLoginError("You are not authorized to access the admin page.");
        return;
      }
  
      // Store token for future requests
      localStorage.setItem("adminToken", token);
  
      // Remember me functionality (optional)
      if (rememberMe) {
        localStorage.setItem("rememberAdmin", "true");
      }
  
      // Optional: set user state for frontend
      setUser(user);
  
    } catch (error) {
      console.error("Email login error:", error);
      setLoginError(error.message);
    }
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      setLoginError("Please enter your email address first.");
      return;
    }

    // Check if the email is in the admin list
    if (!ADMIN_EMAIL.includes(email)) {
      setLoginError("This email is not authorized for admin access.");
      return;
    }

    setLoginError("");
    setResetMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent! Check your inbox and follow the instructions.");
      setShowForgotPassword(false);
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

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
  
    window.location.href = "/admin";
  
    if (onLogout) {
      onLogout();
    }
  };
  
  if (loading) {
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
        {/* Falling Cherries Animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
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

        {/* CSS Animation Styles */}
        <style jsx>{`
          @keyframes fall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 0.8;
            }
            90% {
              opacity: 0.8;
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
        `}</style>
        
        {/* Login Card */}
        <div className={`relative z-10 w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-lg border transition-all duration-300 hover:shadow-xl ${
          darkMode 
            ? 'bg-gray-800/70 border-pink-500/20 shadow-pink-500/10' 
            : 'bg-white/80 border-pink-200/50 shadow-pink-500/20'
        } transform hover:scale-105`}>
          
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg relative overflow-hidden">
              <img
                src="/image/cherry_myo.png"
                alt="Cherry Myo Logo"
                className="w-20 h-20 rounded-full border-3 border-white object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-white text-2xl font-bold">CM</span>';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent"></div>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent" style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}>
              Cherry Myo
            </h1>
            <h2 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-pink-300' : 'text-red-700'}`} style={{fontFamily: 'ui-rounded, system-ui, sans-serif'}}>
              Admin Portal
            </h2>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {/* Success Message */}
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

            {/* Error Message */}
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

            {/* Email Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Admin Email
              </label>
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

            {/* Password Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Remember me
                </span>
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

            {/* Forgot Password Modal/Section */}
            {showForgotPassword && (
              <div className={`p-4 rounded-xl border ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  Reset Password
                </h3>
                <p className={`text-sm mb-4 ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Enter your admin email address and we'll send you instructions to reset your password.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleForgotPassword}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                  >
                    Send Reset Email
                  </button>
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className={`px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
                      darkMode 
                        ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Email Login Button */}
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

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login Button */}
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

  // If authenticated, render children with user and logout function
  return children({ user, handleLogout });
}
