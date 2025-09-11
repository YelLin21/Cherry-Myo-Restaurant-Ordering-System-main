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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);

  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { darkMode, setDarkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetchOrderHistory();
    
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    console.log("🔌 Socket connected to:", SOCKET_URL);

    // Listen for order updates (when orders are marked as paid)
    // socket.on("order:paid", (paidOrderId) => {
    //   console.log("📦 Order marked as paid - PERMANENTLY removing from customer view:", paidOrderId);
    //   console.log(sessionStorage.getItem("tableId") || "No table ID in session");
    //   // Show payment success modal
    //   setShowPaymentSuccessModal(true);
      
    //   // Reset payment processing state
    //   setIsPaymentProcessing(false);
      
    //   setOrders((prev) => {
    //     const filteredOrders = prev.filter(order => order._id !== paidOrderId);
    //     console.log("📋 Orders before filtering:", prev.length, "After filtering:", filteredOrders.length);
    //     console.log("🗑️ Order permanently removed from customer history");
    //     return filteredOrders;
    //   });
    // });

    socket.on("order:paid", ({ orderId, tableNumber }) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
    
      if (tableNumber?.toString().trim() !== currentTableId) {
        console.log(`🚫 Ignored order:paid for Table ${tableNumber}`);
        return;
      }
    
      console.log("📦 Order marked as paid for this table:", orderId);
    
      setShowPaymentSuccessModal(true);
      setIsPaymentProcessing(false);
      
      setOrders((prev) => {
        const filteredOrders = prev.filter(order => order._id !== orderId);
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
      } else {
        // Update order status in real-time (including status changes like "sent")
        console.log("🔄 Order status update detected:", updatedOrder._id, "->", updatedOrder.status);
        setOrders((prev) =>
          prev.map((order) =>
            order._id === updatedOrder._id ? { ...order, status: updatedOrder.status } : order
          )
        );
      }
    });

    // Listen for new orders
    socket.on("order:new", (newOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      if (newOrder.tableNumber?.toString().trim() === currentTableId) {
        console.log("📦 New order received for this table:", newOrder);
        setOrders((prev) => [newOrder, ...prev]);
      } else {
        console.log("🚫 Ignored order for another table:", newOrder.tableNumber);
      }
    });

    // Listen for orders ready for checkout
    socket.on("order:readyForCheckout", (updatedOrder) => {
      console.log("🔄 Order ready for checkout:", updatedOrder);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === updatedOrder._id ? { ...order, status: updatedOrder.status } : order
        )
      );
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
      const res = await fetch(`${APIBASE}/orders/customer`);
      if (!res.ok) throw new Error("Failed to fetch order history");
      const unpaidOrders = await res.json();
      
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      const now = new Date();
      
      console.log("🔍 Current Table ID from sessionStorage:", currentTableId);
      console.log("📋 All unpaid orders received:", unpaidOrders.map(order => ({
        id: order._id.slice(-8),
        table: order.tableNumber,
        status: order.status,
        paid: order.paid
      })));
  
      const tableOrders = unpaidOrders.filter(order => {
        const orderTime = new Date(order.createdAt);
        const isSameTable =
          order.tableNumber?.toString().trim() === currentTableId;

        const isToday =
          orderTime.getFullYear() === now.getFullYear() &&
          orderTime.getMonth() === now.getMonth() &&
          orderTime.getDate() === now.getDate();
  
        const isWithin1Hour = now - orderTime <= 60 * 60 * 1000;
        
        console.log(`📊 Order ${order._id.slice(-8)}: table=${order.tableNumber}, currentTable=${currentTableId}, match=${isSameTable}, today=${isToday}, within1h=${isWithin1Hour}`);
  
        return isSameTable && isToday && isWithin1Hour;
      });
      
      console.log("✅ Filtered table orders for table", currentTableId, ":", tableOrders.length);
      console.log("📋 Detailed filtered orders:", tableOrders.map(order => ({
        id: order._id.slice(-8),
        table: order.tableNumber,
        status: order.status,
        paid: order.paid,
        items: order.items?.length || 0
      })));
      
      setOrders(tableOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error("❌ Error fetching order history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price.toLocaleString("en-US") + " MMK";
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
      case "sent":
        return darkMode ? "text-green-400" : "text-green-600";
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
      case "readyForCheckout":
        return `${baseClasses} ${darkMode ? "bg-purple-900 text-purple-300" : "bg-purple-100 text-purple-800"}`;
      case "sent":
        return `${baseClasses} ${darkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"}`;
      default:
        return `${baseClasses} ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`;
    }
  };

  // Function to update order status in backend
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${APIBASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        console.error('Failed to update order status in backend');
        return false;
      }

      console.log(`✅ Order ${orderId} status updated to "${newStatus}" in backend`);
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  };

  // Automatically update status from "readyForCheckout" to "sent" after 10 seconds
  useEffect(() => {
    const timers = {};

    orders.forEach(order => {
      if (order.status === "readyForCheckout" && !timers[order._id]) {
        timers[order._id] = setTimeout(async () => {
          console.log(`🕐 Automatically updating order ${order._id} status to "sent" after 10 seconds`);
          
          // Update status in backend first
          const success = await updateOrderStatus(order._id, "sent");
          
          if (success) {
            // Only update local state if backend update was successful
            setOrders(prevOrders =>
              prevOrders.map(prevOrder =>
                prevOrder._id === order._id
                  ? { ...prevOrder, status: "sent" }
                  : prevOrder
              )
            );
          }
          
          delete timers[order._id];
        }, 10000); // 10 seconds
      }
    });

    // Clean up timers when component unmounts or orders change
    return () => {
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, [orders]);

  // Update the display text for statuses
  const displayStatusText = (status) => {
    switch (status) {
      case "readyForCheckout":
        return "Your order is sending to your table";
      case "sent":
        return "Sent";
      case "pending":
        return "Preparing your order";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const totalPrice = orders.reduce((sum, order) => sum + calculateOrderTotal(order.items), 0);

  const canCheckout = orders.length > 0 && orders.every(order => 
    order.status === 'sent' || order.status === 'readyForCheckout' || order.status === 'completed'
  );

  const handleCheckout = () => {
    if (!canCheckout) {
      alert('Please wait for all orders to be ready before checkout. Orders must be sent to your table first.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = async (paymentMethod) => {
    console.log(`Payment method selected: ${paymentMethod}`);
    console.log(`Total amount: ${totalPrice} MMK`);

    const currentTableId = sessionStorage.getItem("tableId");
    if (!currentTableId) {
      alert("Table ID missing. Cannot process checkout.");
      return;
    }

    const firstOrder = orders[0];
    if (!firstOrder) {
      alert("No orders found to checkout.");
      return;
    }

    try {
      if (paymentMethod === "scan") {
        setShowQRModal(true);
        return;
      }
  
        const response = await fetch(`${APIBASE}/checkouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: firstOrder._id,
            paymentMethod: paymentMethod,
            finalAmount: totalPrice,
            cashReceived: paymentMethod === "cash" ? totalPrice : null,
            changeGiven: paymentMethod === "cash" ? 0 : null
          })
        });

        if (!response.ok) throw new Error("Failed to record payment intent");

        const data = await response.json();
        console.log("✅ Payment intent recorded:", data);
        alert("Payment recorded! ✅ Waiting for admin approval.");
        setShowPaymentModal(false);
    } catch (err) {
        console.error("❌ Payment error:", err);
        alert("Payment failed. Please try again.");
    }
};


  const handleReceiptUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile) {
      alert("Please upload your payment receipt first!");
      return;
    }

    setIsPaymentProcessing(true);

    const currentTableId = sessionStorage.getItem("tableId");
    if (!currentTableId) {
      alert("Table ID missing. Cannot process checkout.");
      setIsPaymentProcessing(false);
      return;
    }

    const firstOrder = orders[0];
    if (!firstOrder) {
      alert("No orders found to checkout.");
      setIsPaymentProcessing(false);
      return;
    }

    try {
      // build form data for file + payload
      const formData = new FormData();
      formData.append("slipImage", receiptFile); // 👈 your receipt file
      formData.append("orderId", firstOrder._id);
      formData.append("paymentMethod", "scan");
      formData.append("finalAmount", totalPrice);

      const response = await fetch(`${APIBASE}/checkouts`, {
        method: "POST",
        body: formData, // 👈 don't set headers manually for FormData
      });

      if (!response.ok) throw new Error("Failed to submit receipt");

      const data = await response.json();
      console.log("✅ Receipt submitted:", data);

      // Reset and close
      setReceiptFile(null);
      setShowQRModal(false);
      // Keep isPaymentProcessing true until admin marks as paid
      // Do NOT setIsPaymentProcessing(false) here
    } catch (err) {
      console.error("❌ Receipt submission error:", err);
      alert("Failed to submit receipt. Please try again.");
      setIsPaymentProcessing(false);
    }
  };
  

  const handleCloseQRModal = () => {
    setReceiptFile(null);
    setShowQRModal(false);
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
           Orders History
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
                You haven't placed any orders yet. Please browse our menu to start ordering!.
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
            <>
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
                            {displayStatusText(order.status)}
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
              <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 z-40">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center">
                  <div className="font-bold text-xl mb-2 sm:mb-0">
                    Total: <span className={darkMode ? 'text-pink-300' : 'text-pink-600'}>{totalPrice.toLocaleString('en-US')} MMK</span>
                  </div>
                  <div className="flex flex-col items-end">
                    {!canCheckout && (
                      <p className={`text-sm mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Wait for orders to be ready
                      </p>
                    )}
                    <button
                      onClick={handleCheckout}
                      disabled={!canCheckout || isPaymentProcessing}
                      className={`px-6 py-3 rounded-xl shadow font-bold text-lg transition-colors duration-200 ${
                        canCheckout && !isPaymentProcessing
                          ? darkMode 
                            ? 'bg-pink-600 text-white hover:bg-pink-500' 
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                          : darkMode
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {(isPaymentProcessing && !showPaymentSuccessModal) ? 'Payment is under review...' : 'Checkout'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowOrderModal(false)}
        >
          <div 
            className={`max-w-md w-full rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto ${
              darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
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
                    {displayStatusText(selectedOrder.status)}
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className={`max-w-md w-full rounded-xl shadow-2xl ${
              darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-pink-300' : 'text-pink-900'
                }`}>
                  Choose Payment Method
                </h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className={`text-gray-400 hover:text-gray-600 ${
                    darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <div className={`mb-6 p-4 rounded-lg text-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Total Amount
                </p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-pink-300' : 'text-pink-600'
                }`}>
                  {totalPrice.toLocaleString('en-US')} MMK
                </p>
              </div>

              <div className="space-y-4">
                {/* QR Code Payment Button */}
                <button
                  onClick={() => handlePayment('scan')}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-3 ${
                    darkMode 
                      ? 'border-blue-500 bg-blue-900 hover:bg-blue-800 text-blue-300' 
                      : 'border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  <div className="text-2xl">📱</div>
                  <div>
                    <p className="font-bold text-lg">Pay with QR Code</p>
                    <p className="text-sm opacity-80">Scan QR code to pay</p>
                  </div>
                </button>

                {/* Cash Payment Button */}
                <button
                  onClick={() => handlePayment('cash')}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-3 ${
                    darkMode 
                      ? 'border-green-500 bg-green-900 hover:bg-green-800 text-green-300' 
                      : 'border-green-500 bg-green-50 hover:bg-green-100 text-green-700'
                  }`}
                >
                  <div className="text-2xl">💵</div>
                  <div>
                    <p className="font-bold text-lg">Pay with Cash</p>
                    <p className="text-sm opacity-80">Pay at the counter</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* QR Code Payment Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={handleCloseQRModal}
        >
          <div 
            className={`max-w-md w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
              darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-pink-300' : 'text-pink-900'
                }`}>
                  KBZ Pay QR Code
                </h2>
                <button
                  onClick={handleCloseQRModal}
                  className={`text-gray-400 hover:text-gray-600 ${
                    darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              {/* Total Amount */}
              <div className={`mb-6 p-4 rounded-lg text-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Total Amount
                </p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-pink-300' : 'text-pink-600'
                }`}>
                  {totalPrice.toLocaleString('en-US')} MMK
                </p>
              </div>

              {/* QR Code Image */}
              <div className="mb-6 text-center">
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-blue-900' : 'bg-blue-50'
                }`}>
                  <p className={`text-lg font-semibold mb-4 ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    Use KBZPay Scan to pay me
                  </p>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img 
                      src="/image/kbz-qr-code.jpeg" 
                      alt="KBZ Pay QR Code" 
                      className="w-64 h-64 object-contain mx-auto"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{display: 'none'}} className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                      <p className="text-gray-500">QR Code Image Not Found</p>
                    </div>
                  </div>
                  {/* <p className={`text-sm mt-2 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    Mg Yel Lin(*******4572)
                  </p> */}
                </div>
              </div>

              {/* Upload Receipt Section */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Upload Payment Receipt
                </h3>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700' 
                    : 'border-gray-300 bg-gray-50'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label 
                    htmlFor="receipt-upload" 
                    className={`cursor-pointer block ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {receiptFile ? (
                      <div>
                        <div className="text-2xl mb-2">✅</div>
                        <p className="font-medium text-green-600">
                          {receiptFile.name}
                        </p>
                        <p className="text-sm">Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">📁</div>
                        <p className="font-medium">Click to upload receipt</p>
                        <p className="text-sm">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitReceipt}
                disabled={!receiptFile}
                className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
                  receiptFile
                    ? darkMode 
                      ? 'bg-green-600 hover:bg-green-500 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    : darkMode
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Submit Payment Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccessModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowPaymentSuccessModal(false)}
        >
          <div 
            className={`max-w-md w-full rounded-xl shadow-2xl ${
              darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              {/* Success Icon */}
              <div className="mb-6">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <div className="text-4xl">✅</div>
                </div>
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
              </div>

              {/* Success Message */}
              <h2 className={`text-2xl font-bold mb-4 ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                Payment Successful!
              </h2>
              
              <p className={`text-lg mb-6 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Your payment has been processed successfully. Thank you for dining with us!
              </p>

              {/* Cherry Decoration */}
              <div className="mb-6">
                <div className="flex justify-center items-center gap-2">
                  <span className="text-2xl animate-pulse">🍒</span>
                  <span className={`text-lg font-semibold ${
                    darkMode ? 'text-pink-300' : 'text-pink-600'
                  }`}>
                    Cherry Myo Restaurant
                  </span>
                  <span className="text-2xl animate-pulse">🍒</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowPaymentSuccessModal(false)}
                className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-500 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Awesome! Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
