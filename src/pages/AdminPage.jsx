import { useEffect, useState } from "react";
import AdminMenuForm from "../components/AdminMenuForm";
import AdminMenuList from "../components/AdminMenuList";
import { useDarkMode } from "./DarkModeContext.jsx";
import AdminNavbar from "../components/AdminNavbar.jsx";
import { io } from "socket.io-client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, signInWithGoogle } from "../firebase";

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
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000" || "https://cherry-myo-restaurant-ordering-system.onrender.com";


const TABS = ["Breakfast", "Lunch", "Dinner", "Grill", "Beverage"];


export default function AdminPage() {
  // Add admin Gmail address
  const ADMIN_EMAIL = ["2001yellin@gmail.com", "u6520242@au.edu"];

  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Breakfast");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { darkMode, setDarkMode } = useDarkMode();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !ADMIN_EMAIL.includes(user.email)) {
        setLoginError("You are not authorized to access the admin page.");
        setUser(null);
        await signOut(auth);
        setLoading(false);
        return;
      }
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${APIBASE}/menu`)
      .then((res) => res.json())
      .then((data) => setMenuItems(data));

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("menu:new", (newItem) => {
      setMenuItems((prev) => [...prev, newItem]);
    });

    socket.on("menu:update", (updatedItem) => {
      setMenuItems((prev) =>
        prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
      );
    });

    socket.on("menu:delete", (id) => {
      setMenuItems((prev) => prev.filter((item) => item._id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleAdd = (item) => {
    const newItem = { ...item, category: activeTab };
    fetch(`${APIBASE}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    // Don't update state here — socket will handle it
  };

  const handleDelete = (id) => {
    fetch(`${APIBASE}/menu/${id}`, {
      method: "DELETE",
    });
    // Don't update state here — socket will handle it
  };

  const handleUpdate = (updatedItem) => {
    fetch(`${APIBASE}/menu/${updatedItem._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedItem),
    });
    setEditingItem(null);
    setIsFormOpen(false);
    // Don't update state here — socket will handle it
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const openAddForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
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
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4 text-center text-pink-700 dark:text-pink-300">Cherry Myo Admin Login</h2>
          {loginError && (
            <div className="mb-4 text-red-600 font-medium text-center">{loginError}</div>
          )}
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg shadow"
          >
            <GoogleIcon /> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <AdminNavbar />
      <div className={`p-8 min-h-screen pt-24 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-8 mt-2">
          <h1
            className={`text-2xl font-bold transition-colors duration-300 ${
              darkMode ? 'text-pink-300' : 'text-pink-700'
            }`}
          >
            Admin Panel
          </h1>
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700 dark:text-gray-200">{user.displayName}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded transition-all duration-300 ${
                activeTab === tab 
                  ? darkMode 
                    ? "bg-pink-600 text-white shadow-lg transform scale-105" 
                    : "bg-pink-700 text-white shadow-lg transform scale-105"
                  : darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Add Item Button */}
        <div className="mb-6">
          <button
            onClick={openAddForm}
            className={`px-6 py-3 rounded font-medium transition-colors duration-200 flex items-center gap-2 ${
              darkMode 
                ? 'bg-green-600 text-white hover:bg-green-500' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <span className="text-xl">+</span>
            Add {activeTab} Item
          </button>
        </div>

        {/* Special Admin Menu Links */}
        <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-pink-300">
          <h3 className={`text-lg font-semibold mb-3 ${
            darkMode ? 'text-pink-300' : 'text-pink-700'
          }`}>
            Special Menu Management
          </h3>
          <div className="flex gap-4 flex-wrap">
            <a
              href="/admin/special"
              className={`px-6 py-3 rounded font-medium transition-colors duration-200 flex items-center gap-2 ${
                darkMode 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-500' 
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              <span className="text-xl">🌟</span>
              Manage Special Menu
            </a>
            <a
              href="/admin/promotion"
              className={`px-6 py-3 rounded font-medium transition-colors duration-200 flex items-center gap-2 ${
                darkMode 
                  ? 'bg-red-600 text-white hover:bg-red-500' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <span className="text-xl">🎉</span>
              Manage Promotion Menu
            </a>
          </div>
        </div>

        {/* Popup Form */}
        <AdminMenuForm
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          editingItem={editingItem}
          clearEdit={() => setEditingItem(null)}
          activeTab={activeTab}
          isOpen={isFormOpen}
          onClose={closeForm}
          darkMode={darkMode}
        />

        {/* List of menu items */}
        <AdminMenuList
          items={menuItems.filter((item) => item.category === activeTab)}
          onDelete={handleDelete}
          onEdit={openEditForm}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
