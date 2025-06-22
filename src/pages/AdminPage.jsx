import { useEffect, useState } from "react";
import AdminMenuForm from "../components/AdminMenuForm";
import AdminMenuList from "../components/AdminMenuList";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000" || "https://cherry-myo-restaurant-ordering-system.onrender.com";


const TABS = ["Breakfast", "Lunch", "Dinner", "Grill", "Beverage"];

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Breakfast");

  useEffect(() => {
    // 1. Initial fetch from API
    fetch(`${APIBASE}/menu`)
      .then((res) => res.json())
      .then((data) => setMenuItems(data));

    // 2. Connect to socket
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
    // Don't update state here — socket will handle it
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-pink-700">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${
              activeTab === tab ? "bg-pink-700 text-white" : "bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Form to add/update menu */}
      <AdminMenuForm
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        editingItem={editingItem}
        clearEdit={() => setEditingItem(null)}
        activeTab={activeTab}
      />

      {/* List of menu items */}
      <AdminMenuList
        items={menuItems.filter((item) => item.category === activeTab)}
        onDelete={handleDelete}
        onEdit={setEditingItem}
      />
    </div>
  );
}
