import React, { useEffect, useState } from "react";
import AdminMenuForm from "../components/AdminMenuForm";
import AdminMenuList from "../components/AdminMenuList";
import AdminAuth from "../components/AdminAuth";
import { useDarkMode } from "./DarkModeContext.jsx";
import AdminNavbar from "../components/AdminNavbar.jsx";
import { io } from "socket.io-client";
import Swal from 'sweetalert2'

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000" || "https://cherry-myo-restaurant-ordering-system.onrender.com";

const TABS = ["Breakfast", "Lunch", "Dinner", "Grill", "Beverage"];

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Breakfast");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { darkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleAdd = (item) => {
    // Check for duplicate names in the current category
    const trimmedName = item.name.trim().toLowerCase();
    const existingItem = menuItems.find(menuItem => 
      menuItem.name.trim().toLowerCase() === trimmedName && 
      menuItem.category === activeTab
    );
    
    if (existingItem) {
      Swal.fire({
        title: 'No items selected',
        text: 'You already have that item in this category. Please choose a different name.',
        icon: 'warning',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'swal-confirm'
        },
        buttonsStyling: false // <- disables default SweetAlert2 styles
      })
      return;
    }


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
    // Check for duplicate names when editing (exclude the current item being edited)
    const trimmedName = updatedItem.name.trim().toLowerCase();
    const existingItem = menuItems.find(menuItem => 
      menuItem.name.trim().toLowerCase() === trimmedName && 
      menuItem.category === updatedItem.category &&
      menuItem._id !== updatedItem._id
    );
    
    if (existingItem) {
      Swal.fire({
        title: 'No items selected',
        text: 'You already have that item in this category. Please choose a different name.',
        icon: 'warning',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'swal-confirm'
        },
        buttonsStyling: false // <- disables default SweetAlert2 styles
      })
      return;
    }
    
    fetch(`${APIBASE}/menu/${updatedItem._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedItem),
    });
    setEditingItem(null);
    setIsFormOpen(false);
    // Don't update state here — socket will handle it
  };

  const handleStockToggle = (id, newStockStatus) => {
    fetch(`${APIBASE}/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outofstock: newStockStatus }),
    });
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
    <AdminAuth>
      {({ user, handleLogout }) => (
        <AdminPageContent 
          user={user} 
          handleLogout={handleLogout}
          menuItems={menuItems}
          setMenuItems={setMenuItems}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isFormOpen={isFormOpen}
          setIsFormOpen={setIsFormOpen}
          handleAdd={handleAdd}
          handleDelete={handleDelete}
          handleUpdate={handleUpdate}
          handleStockToggle={handleStockToggle}
          openAddForm={openAddForm}
          openEditForm={openEditForm}
          closeForm={closeForm}
          darkMode={darkMode}
        />
      )}
    </AdminAuth>
  );
}


function AdminPageContent({ 
  user, 
  handleLogout, 
  menuItems, 
  setMenuItems, 
  editingItem, 
  setEditingItem, 
  activeTab, 
  setActiveTab, 
  isFormOpen, 
  setIsFormOpen, 
  handleAdd, 
  handleDelete, 
  handleUpdate, 
  handleStockToggle,
  openAddForm, 
  openEditForm, 
  closeForm, 
  darkMode 
}) {

  const [showModal, setShowModal] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    if (!user) return;
    
    // Fetch initial menu data
    fetch(`${APIBASE}/menu`)
      .then((res) => res.json())
      .then((data) => setMenuItems(data))
      .catch((error) => {
        console.error("Error fetching menu data:", error);
      });

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

    // Socket event listeners
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
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

    // Cleanup function
    return () => {
      console.log("Cleaning up socket connection");
      socket.off("connect");
      socket.off("connect_error");
      socket.off("menu:new");
      socket.off("menu:update");
      socket.off("menu:delete");
      socket.disconnect();
    };
  }, [user, setMenuItems]);

  const handleGenerateTableQR = async () => {
    if (!tableNumber) {
      alert("Please enter a table ID!");
      return;
    }

    try {
      const res = await fetch(`${APIBASE}/qr/table/${tableNumber}`);
      const data = await res.json();

      if (data.qrCode) {
        setQrValue(data.qrCode);
      } else {
        alert("Failed to generate QR code");
      }
    } catch (error) {
      console.error("QR generation error:", error);
      alert("Error generating QR code");
    }
  };
  

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

        <div className="mb-8 p-4 rounded-lg border-2 border-dashed border-blue-300">
      {/* Section Title */}
      <h3
        className={`text-lg font-semibold mb-3 ${
          darkMode ? "text-blue-300" : "text-blue-700"
        }`}
      >
        Table QR Management
      </h3>

      {/* Button to open modal */}
      <button
        onClick={() => setShowModal(true)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
          darkMode
            ? "bg-blue-600 hover:bg-blue-500 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        Generate Table QR
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div
            className={`rounded-xl p-6 w-96 shadow-lg ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
            }`}
          >
            <h2 className="text-xl font-semibold mb-4">Generate Table QR</h2>

            {/* Input for table ID */}
            <input
              type="text"
              placeholder="Enter Table ID"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 mb-4 ${
                darkMode
                  ? "bg-gray-700 text-white border-gray-600"
                  : "bg-gray-100 text-gray-800 border-gray-300"
              }`}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className={`px-3 py-2 rounded-lg ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateTableQR}
                className={`px-3 py-2 rounded-lg ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Generate
              </button>
            </div>

            {/* Show QR if generated */}
            {qrValue && (
              <div className="mt-6 text-center">
                <img
                  src={qrValue}
                  alt="Table QR"
                  className="mx-auto w-40 h-40"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Table ID: {tableNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

        {/* Special Admin Menu Links & Sales Report */}
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
            <a
              href="/admin/sales-report"
              className={`px-6 py-3 rounded font-medium transition-colors duration-200 flex items-center gap-2 ${
                darkMode 
                  ? 'bg-pink-700 text-white hover:bg-pink-600' 
                  : 'bg-pink-600 text-white hover:bg-pink-700'
              }`}
              aria-label="Sales Report"
            >
              <span className="text-xl">🍒</span>
              Sales Report
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
          onStockToggle={handleStockToggle}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}