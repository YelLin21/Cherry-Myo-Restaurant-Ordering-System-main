import { useState, useEffect } from "react";
import AdminNavbar from "../components/AdminNavbar.jsx";
import Swal from "sweetalert2";
import { useDarkMode } from "./DarkModeContext.jsx";

const APIBASE = import.meta.env.VITE_API_URL;

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "waiter",
  });
  const [showForm, setShowForm] = useState(false);
  const { darkMode } = useDarkMode();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      console.log("Token:", token); // Debugging line
      const res = await fetch(`${APIBASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
  
      // Decode token to get current user ID
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentUserId = payload.id;
  
      // Filter out current user
      setUsers(data.filter(u => u._id !== currentUserId));
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const token = localStorage.getItem("adminToken");
  
      const res = await fetch(`${APIBASE}/users/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(formData),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create user");
      }
  
      Swal.fire("✅ Success", "User created successfully!", "success");
      setShowForm(false);
      setFormData({ email: "", password: "", role: "waiter" });
      fetchUsers();
    } catch (err) {
      Swal.fire("❌ Error", err.message, "error");
    }
  };
  
  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the user.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonColor: "#d33",
      confirmButtonColor: "#3085d6",
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`${APIBASE}/users/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete user");
        Swal.fire("Deleted!", "User has been removed.", "success");
        fetchUsers();
      } catch (err) {
        Swal.fire("Error", err.message, "error");
      }
    }
  };

  return (
    <div
      className={`min-h-screen transition-all duration-500 relative overflow-hidden ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-pink-950 to-red-950 text-white"
          : "bg-gradient-to-br from-pink-50 via-red-50 to-rose-100 text-gray-900"
      }`}
    >
      <AdminNavbar />

      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s infinite alternate`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            <div className={`${darkMode ? "text-red-400" : "text-red-300"} text-3xl`}>
              🍒
            </div>
          </div>
        ))}
      </div>

      <main className="pt-28 pb-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div
            className={`relative mb-10 p-8 rounded-3xl shadow-2xl backdrop-blur-lg border ${
              darkMode ? "bg-gray-800/40 border-red-500/20" : "bg-white/80 border-red-200/40"
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                👥 User Management
              </h1>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:scale-105 transition-transform font-semibold shadow-lg"
              >
                ➕ Add User
              </button>
            </div>

            {/* User List */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`text-left ${darkMode ? "bg-gray-700" : "bg-red-100"}`}>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-center rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      className={`border-b ${
                        darkMode ? "border-gray-700 hover:bg-gray-800/60" : "border-gray-200 hover:bg-red-50"
                      }`}
                    >
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 capitalize">{u.role}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete(u._id)}
                          className="text-red-500 hover:text-red-700 font-semibold"
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center py-6 opacity-70">No users found yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div
            className={`p-8 rounded-2xl shadow-2xl w-full max-w-md ${
              darkMode ? "bg-gray-900 border border-red-700 text-white" : "bg-white border border-red-200"
            }`}
          >
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent">
              ➕ Create New User
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none"
              />
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none"
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none"
              >
                <option value="admin">Admin</option>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
              </select>
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg font-semibold bg-gray-400 hover:bg-gray-500 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 text-white hover:scale-105 transform transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
