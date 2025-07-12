import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, ShoppingBag } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { darkMode, setDarkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetchOrderHistory();
    
    // Set up real-time updates to remove paid orders
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    console.log("🔌 Socket connected to:", SOCKET_URL);

    // Listen for order updates (when orders are marked as paid)
    socket.on("order:paid", (paidOrderId) => {
      console.log("📦 Order marked as paid - PERMANENTLY removing from customer view:", paidOrderId);
      setOrders((prev) => {
        const filteredOrders = prev.filter(order => order._id !== paidOrderId);
        console.log("📋 Orders before filtering:", prev.length, "After filtering:", filteredOrders.length);
        console.log("🗑️ Order permanently removed from customer history");
        return filteredOrders;
      });
    });

    // Also listen for any order updates to double-check paid status
    socket.on("order:update", (updatedOrder) => {
      if (updatedOrder.paid === true) {
        console.log("🔄 Order update detected - removing paid order:", updatedOrder._id);
        setOrders((prev) => prev.filter(order => order._id !== updatedOrder._id));
      }
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected successfully");
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      // Use customer-specific endpoint that only returns unpaid orders
      const res = await fetch(`${APIBASE}/orders/customer`);
      if (!res.ok) throw new Error("Failed to fetch order history");
      const unpaidOrders = await res.json();
      
      console.log("📊 Customer orders fetched:", unpaidOrders.length, "unpaid orders");
      console.log("✅ Paid orders are filtered at API level - will never appear on reload");
      
      setOrders(unpaidOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return "฿" + price.toLocaleString("en-US");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateOrderTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return darkMode ? "text-yellow-400" : "text-yellow-600";
      case "preparing":
        return darkMode ? "text-blue-400" : "text-blue-600";
      case "ready":
        return darkMode ? "text-green-400" : "text-green-600";
      case "completed":
        return darkMode ? "text-gray-400" : "text-gray-600";
      default:
        return darkMode ? "text-gray-400" : "text-gray-600";
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "pending":
        return `${baseClasses} ${darkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-800"}`;
      case "preparing":
        return `${baseClasses} ${darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-800"}`;
      case "ready":
        return `${baseClasses} ${darkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"}`;
      case "completed":
        return `${baseClasses} ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`;
      default:
        return `${baseClasses} ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`;
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  return (
    <div className={`min-h-screen pt-10 pb-28 transition-colors duration-300 ${
      darkMode ? "dark bg-gray-900" : "bg-gray-50"
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={totalItems} />

      <main className={`pt-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
        darkMode ? "bg-gray-900" : "bg-gray-100"
      }`}>
        <div className="max-w-4xl mx-auto">
          <h1 className={`text-3xl font-bold text-center mb-4 ${
            darkMode ? "text-pink-300" : "text-pink-900"
          }`}>
            Pending Orders
          </h1>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
              <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Loading your orders...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">{error}</p>
              <button
                onClick={fetchOrderHistory}
                className={`mt-4 px-6 py-2 rounded-lg ${
                  darkMode 
                    ? "bg-pink-600 text-white hover:bg-pink-500" 
                    : "bg-pink-600 text-white hover:bg-pink-700"
                }`}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className={`mx-auto h-16 w-16 mb-4 ${
                darkMode ? "text-gray-600" : "text-gray-400"
              }`} />
              <p className={`text-xl mb-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                No pending orders
              </p>
              <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                All your orders have been completed and paid for, or you haven't placed any orders yet
              </p>
              <button
                onClick={() => navigate("/")}
                className={`px-6 py-3 rounded-xl shadow ${
                  darkMode 
                    ? "bg-pink-600 text-white hover:bg-pink-500" 
                    : "bg-pink-600 text-white hover:bg-pink-700"
                }`}
              >
                Browse Menu
              </button>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => handleOrderClick(order)}
                  className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                    darkMode 
                      ? "bg-gray-800 border-gray-600 hover:bg-gray-750" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}>
                          Order #{order._id.slice(-8)}
                        </h3>
                        <span className={getStatusBadge(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className={`h-4 w-4 ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`} />
                          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className={`h-4 w-4 ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`} />
                          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                            {formatTime(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-sm ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}>
                            Table: {order.tableNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`text-lg font-bold ${
                          darkMode ? "text-pink-300" : "text-pink-600"
                        }`}>
                          {formatPrice(calculateOrderTotal(order.items))}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      Items:
                    </span>
                    <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                      {order.items.map(item => item.name).join(", ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto ${
            darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-pink-300' : 'text-pink-900'
                }`}>
                  Order Details
                </h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className={`text-gray-400 hover:text-gray-600 ${
                    darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <div className={`mb-4 p-3 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Order #{selectedOrder._id.slice(-8)}
                  </span>
                  <span className={getStatusBadge(selectedOrder.status)}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {formatDate(selectedOrder.createdAt)} at {formatTime(selectedOrder.createdAt)}
                  </span>
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Table: {selectedOrder.tableNumber}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Order Items
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.name}
                        </h4>
                        <p className={`text-sm ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className={`font-bold ${
                        darkMode ? 'text-pink-300' : 'text-pink-600'
                      }`}>
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`border-t pt-4 ${
                darkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Total
                  </span>
                  <span className={`text-xl font-bold ${
                    darkMode ? 'text-pink-300' : 'text-pink-600'
                  }`}>
                    {formatPrice(calculateOrderTotal(selectedOrder.items))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
