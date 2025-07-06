import { useEffect, useState } from "react";
import AdminMenuForm from "../components/AdminMenuForm";
import AdminMenuList from "../components/AdminMenuList";
import { useDarkMode } from "./DarkModeContext.jsx";
import Navbar from "../components/Navbar.jsx";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000" || "https://cherry-myo-restaurant-ordering-system.onrender.com";


const TABS = ["Breakfast", "Lunch", "Dinner", "Grill", "Beverage"];

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Breakfast");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { darkMode, setDarkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetch(`${APIBASE}/menu`)
      .then((res) => res.json())
      .then((data) => setMenuItems(data));

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    // 3. Listen to real-time events
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
  }, []);

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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      
      <div className={`p-8 min-h-screen pt-24 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <h1 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
          darkMode ? 'text-pink-300' : 'text-pink-700'
        }`}>Admin Panel</h1>

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
