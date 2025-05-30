import { useEffect, useState } from "react";
import AdminMenuForm from "../components/AdminMenuForm";
import AdminMenuList from "../components/AdminMenuList";

const APIBASE= import.meta.env.VITE_API_URL; 

const TABS = ["Breakfast", "Lunch", "Dinner", "Grill", "Beverage"];

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Breakfast");

  useEffect(() => {
    fetch(`${APIBASE}/menu`)
      .then((res) => res.json())
      .then((data) => setMenuItems(data));
  }, []);

  const handleAdd = (item) => {
    const newItem = { ...item, category: activeTab };
    fetch(`${APIBASE}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
      .then((res) => res.json())
      .then((newItem) => {
        setMenuItems((prev) => [...prev, newItem]);
      });
  };

  const handleDelete = (id) => {
    fetch(`${APIBASE}/menu/${id}`, {
      method: "DELETE",
    }).then(() => {
      setMenuItems((prev) => prev.filter((item) => item._id !== id));
    });
  };

  const handleUpdate = (updatedItem) => {
    fetch(`${APIBASE}/menu/${updatedItem._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedItem),
    })
      .then((res) => res.json())
      .then((data) => {
        setMenuItems((prev) =>
          prev.map((item) => (item._id === data._id ? data : item))
        );
        setEditingItem(null);
      });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-pink-700">Admin Panel</h1>

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

      <AdminMenuForm
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        editingItem={editingItem}
        clearEdit={() => setEditingItem(null)}
        activeTab={activeTab}
      />
      <AdminMenuList
        items={menuItems.filter((item) => item.category === activeTab)}
        onDelete={handleDelete}
        onEdit={setEditingItem}
      />
    </div>
  );
}
