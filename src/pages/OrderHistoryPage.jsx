import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, ShoppingBag } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { io } from "socket.io-client";
import Swal from 'sweetalert2';
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import CardPaymentForm from "../components/CardPaymentForm.jsx";
import { loadStripe } from "@stripe/stripe-js";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";
const stripePromise = loadStripe("pk_test_51QDrLfLUvxdBWUIqRJOiJByIbUq265bcc6M7UyinYcVXrc4NcZsOd673ru7a5n8kn67TjnzwkgHwTUOQU5L6O9im00Krkf5fO1"); 

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState(null);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declinedOrder, setDeclinedOrder] = useState(null);
  const [isDeclined, setIsDeclined] = useState(false);

  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { darkMode, setDarkMode } = useDarkMode();
  const firstOrder = orders.length > 0 ? orders[0] : null;

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetchOrderHistory();
    
    // Set up periodic refresh every 30 seconds as backup
    const refreshInterval = setInterval(() => {
      console.log("🔄 Periodic refresh of order history");
      fetchOrderHistory(false); // Don't show loader for background refresh
    }, 30000);
    
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true
    });

    console.log("🔌 Socket connecting to:", SOCKET_URL);

    // Join table room for targeted updates
    const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
    if (currentTableId) {
      socket.emit("join:table", currentTableId);
      console.log("🏠 Joined table room:", currentTableId);
    } else {
      console.warn("⚠️ No table ID found - socket events may not work properly");
    }

    console.log("🎧 Setting up socket event listeners for order updates...");

    socket.on("order:paid", ({ orderId, tableNumber }) => {
      try {
        const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
        if (tableNumber?.toString().trim() !== currentTableId) {
          console.log(`❌ Ignored order:paid for Table ${tableNumber} (current: ${currentTableId})`);
          return;
        }
      
        console.log("💰 Order marked as paid for this table:", orderId);
      
        setShowPaymentSuccessModal(true);
        setIsPaymentProcessing(false);
        
        setOrders((prev) => {
          const filteredOrders = prev.filter(order => order._id !== orderId);
          console.log("📋 Orders before filtering:", prev.length, "After filtering:", filteredOrders.length);
          console.log("🗑️ Order permanently removed from customer history");
          return filteredOrders;
        });
      } catch (error) {
        console.error("Error handling order:paid event:", error);
      }
    });
    
    // Listen for general order status updates (fallback handler)
    socket.on("order:update", (updatedOrder) => {
      try {
        const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
        
        // Only process updates for current table
        if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
          return;
        }

        console.log("🔄 General order update received:", {
          id: updatedOrder._id.slice(-8),
          status: updatedOrder.status,
          paid: updatedOrder.paid
        });

        if (updatedOrder.paid === true) {
          console.log("💳 Order marked as paid - removing from history:", updatedOrder._id);
          setOrders((prev) => prev.filter(order => order._id !== updatedOrder._id));
          setShowPaymentSuccessModal(true);
          setIsPaymentProcessing(false);
        } else {
          // Update order status in real-time with notifications
          setOrders((prev) =>
            prev.map((order) => {
              if (order._id === updatedOrder._id) {
                console.log(`📝 Updating order ${order._id.slice(-8)}: ${order.status} → ${updatedOrder.status}`);
                
                
                
                return { 
                  ...order, 
                  status: updatedOrder.status,
                  updatedAt: updatedOrder.updatedAt || new Date().toISOString()
                };
              }
              return order;
            })
          );
        }
      } catch (error) {
        console.error("Error handling order:update event:", error);
      }
    });

    socket.on("order:declined", (data) => {
      console.log("📥 Received declined order:", data);
      setIsPaid(false);
      setIsPaymentProcessing(false);
      setIsDeclined(true);
      setDeclinedOrder(data); 
      setShowDeclineModal(true);
    });
  
    // Listen for kitchen status updates (specific events)
    socket.on("kitchen:orderComplete", (updatedOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
        return;
      }

      console.log("🍳 Kitchen completed order - updating status:", updatedOrder._id.slice(-8));
      showStatusUpdateToast("readyForWaiter", updatedOrder._id);
      setLastStatusUpdate({ orderId: updatedOrder._id, status: "readyForWaiter", timestamp: Date.now() });
      
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === updatedOrder._id) {
            return { 
              ...order, 
              status: "readyForWaiter",
              updatedAt: new Date().toISOString()
            };
          }
          return order;
        })
      );
    });

    socket.on("kitchen:orderStarted", (updatedOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
        return;
      }

      console.log("🍳 Kitchen started preparing order:", updatedOrder._id.slice(-8));
      showStatusUpdateToast("preparing", updatedOrder._id);
      setLastStatusUpdate({ orderId: updatedOrder._id, status: "preparing", timestamp: Date.now() });
      
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === updatedOrder._id) {
            return { 
              ...order, 
              status: "preparing",
              updatedAt: new Date().toISOString()
            };
          }
          return order;
        })
      );
    });

    // Listen for new orders placed from this table
    socket.on("order:new", (newOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (newOrder.tableNumber?.toString().trim() === currentTableId) {
        console.log("🆕 New order received for this table:", {
          id: newOrder._id.slice(-8),
          items: newOrder.items?.length || 0,
          status: newOrder.status
        });
        
        setOrders((prev) => {
          // Check if order already exists to prevent duplicates
          const existingOrder = prev.find(order => order._id === newOrder._id);
          if (existingOrder) {
            console.log("⚠️ Order already exists, skipping duplicate");
            return prev;
          }
          return [newOrder, ...prev];
        });
      }
    });

    // Listen for orders ready for waiter (Kitchen Complete Button)
    socket.on("order:readyForWaiter", (updatedOrder) => {
      try {
        const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
        
        console.log("🔊 Received order:readyForWaiter event:", {
          orderId: updatedOrder._id?.slice(-8),
          orderTable: updatedOrder.tableNumber,
          currentTable: currentTableId,
          status: updatedOrder.status
        });
        
        if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
          console.log("❌ Ignoring order:readyForWaiter - different table");
          return;
        }

        console.log("✅ Kitchen completed order - ready for waiter:", updatedOrder._id.slice(-8));
 
        showStatusUpdateToast("readyForWaiter", updatedOrder._id);
        setLastStatusUpdate({ orderId: updatedOrder._id, status: "readyForWaiter", timestamp: Date.now() });
        
        setOrders((prev) =>
          prev.map((order) => {
            if (order._id === updatedOrder._id) {
              console.log(`🔄 Updating order ${order._id.slice(-8)} status to readyForWaiter`);
              return { 
                ...order, 
                status: "readyForWaiter",
                updatedAt: updatedOrder.processedAt || updatedOrder.updatedAt || new Date().toISOString()
              };
            }
            return order;
          })
        );
      } catch (error) {
        console.error("Error handling order:readyForWaiter event:", error);
      }
    });

    // Listen for orders ready for checkout
    socket.on("order:readyForCheckout", (updatedOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
        return;
      }

      console.log("✅ Order ready for checkout:", updatedOrder._id.slice(-8));
      
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === updatedOrder._id) {
            return { 
              ...order, 
              status: "readyForCheckout",
              updatedAt: updatedOrder.updatedAt || new Date().toISOString()
            };
          }
          return order;
        })
      );
    });

    // Listen for orders being prepared in kitchen
    socket.on("order:preparing", (updatedOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
        return;
      }

      console.log("👨‍🍳 Order is being prepared in kitchen:", updatedOrder._id.slice(-8));
      
      showStatusUpdateToast("preparing", updatedOrder._id);
      setLastStatusUpdate({ orderId: updatedOrder._id, status: "preparing", timestamp: Date.now() });
      
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === updatedOrder._id) {
            return { 
              ...order, 
              status: "preparing",
              updatedAt: updatedOrder.updatedAt || new Date().toISOString()
            };
          }
          return order;
        })
      );
    });

    // Listen for orders completed in kitchen (ready for waiter)
    socket.on("order:completed", (updatedOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
        return;
      }

      console.log("✅ Order completed in kitchen - ready for waiter:", updatedOrder._id.slice(-8));
      
      showStatusUpdateToast("readyForWaiter", updatedOrder._id);
      setLastStatusUpdate({ orderId: updatedOrder._id, status: "readyForWaiter", timestamp: Date.now() });
      
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === updatedOrder._id) {
            return { 
              ...order, 
              status: "readyForWaiter",
              updatedAt: updatedOrder.updatedAt || new Date().toISOString()
            };
          }
          return order;
        })
      );
    });

    // Listen for orders sent to table
    socket.on("order:sent", (updatedOrder) => {
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      
      if (updatedOrder.tableNumber?.toString().trim() !== currentTableId) {
        return;
      }

      console.log("🚚 Order sent to table:", updatedOrder._id.slice(-8));
      
      setOrders((prev) =>
        prev.map((order) => {
          if (order._id === updatedOrder._id) {
            return { 
              ...order, 
              status: "sent",
              updatedAt: updatedOrder.updatedAt || new Date().toISOString()
            };
          }
          return order;
        })
      );
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected successfully:", socket.id);
      setSocketConnected(true);
      // Rejoin table room on reconnection
      const tableId = (sessionStorage.getItem("tableId") || "").trim();
      if (tableId) {
        socket.emit("join:table", tableId);
        console.log("🏠 Re-joined table room:", tableId);
      } else {
        console.warn("⚠️ No table ID for socket room join");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setSocketConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      setSocketConnected(true);
      // Refresh orders after reconnection
      fetchOrderHistory(false);
    });

    socket.on("connect_error", (error) => {
      console.error("🚨 Socket connection error:", error);
      setSocketConnected(false);
    });

    // Debug: Listen to all socket events in development
    if (import.meta.env.DEV) {
      try {
        if (socket.onAny && typeof socket.onAny === 'function') {
          socket.onAny((event, ...args) => {
            console.log(`🔊 Socket event received: ${event}`, args);
          });
        }
      } catch (error) {
        console.log("Debug listener setup failed:", error);
      }
    }

    return () => {
      // Clear the refresh interval
      clearInterval(refreshInterval);
      
      if (currentTableId) {
        socket.emit("leave:table", currentTableId);
      }
      socket.disconnect();
      console.log("🔌 Socket disconnected and cleaned up");
    };
  }, []);

  const removeOrderFromHistory = (orderId) => {
    setOrders((prev) => prev.filter((order) => String(order._id) !== String(orderId)));
  };
  
  const handlePaymentSuccess = (orderId) => {
    removeOrderFromHistory(orderId);
    setShowCardModal(false);
    setShowPaymentModal(false);
  };

  useEffect(() => {
    const firstOrder = orders[0];
    if (!firstOrder) return;
  
    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`${APIBASE}/checkouts/order/${firstOrder._id}`);
        if (!res.ok) throw new Error("Failed to fetch payment status");
        const data = await res.json();
  
        if (data && data.paymentMethod) {
          setIsPaid(true); // means this order already has a payment record
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
      }
    };
  
    checkPaymentStatus();
  }, [orders]);

  const fetchOrderHistory = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const res = await fetch(`${APIBASE}/orders/customer`);
      if (!res.ok) throw new Error("Failed to fetch order history");
      const unpaidOrders = await res.json();
      
      const currentTableId = (sessionStorage.getItem("tableId") || "").trim();
      const now = new Date();
      
      console.log("📊 Current Table ID from sessionStorage:", currentTableId);
      console.log("📋 All unpaid orders received:", unpaidOrders.length);
      
      if (!currentTableId) {
        console.warn("⚠️ No table ID found in sessionStorage");
        setOrders([]);
        return;
      }
  
      const tableOrders = unpaidOrders.filter(order => {
        const orderTime = new Date(order.createdAt);
        const isSameTable = order.tableNumber?.toString().trim() === currentTableId;
        const isPaid = order.paid === true;

        // Filter out paid orders
        if (isPaid) {
          console.log(`💳 Excluding paid order: ${order._id.slice(-8)}`);
          return false;
        }

        const isToday =
          orderTime.getFullYear() === now.getFullYear() &&
          orderTime.getMonth() === now.getMonth() &&
          orderTime.getDate() === now.getDate();
  
        // Extend time window to 4 hours for better user experience
        const isWithinTimeWindow = now - orderTime <= 4 * 60 * 60 * 1000;
        
        const shouldInclude = isSameTable && isToday && isWithinTimeWindow;
        
        if (isSameTable) {
          console.log(`🔍 Order ${order._id.slice(-8)}: table=${order.tableNumber}, status=${order.status}, paid=${order.paid}, today=${isToday}, withinTime=${isWithinTimeWindow}, included=${shouldInclude}`);
        }
  
        return shouldInclude;
      });
      
      console.log("✅ Filtered orders for table", currentTableId, ":", tableOrders.length);
      
      // Sort by creation time (newest first)
      const sortedOrders = tableOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders(sortedOrders);
      setError(""); // Clear any previous errors
      
    } catch (err) {
      console.error("❌ Error fetching order history:", err);
      setError(err.message);
    } finally {
      if (showLoader) setLoading(false);
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

  const getStatusBadge = (order) => {
    const status = order.status;
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300";
    
    // Add animation for recently updated orders
    const isRecentlyUpdated = order.updatedAt && 
      (new Date() - new Date(order.updatedAt)) < 5000; // Within last 5 seconds
    const animationClass = isRecentlyUpdated ? "animate-pulse" : "";
    
    switch (status) {
      case "pending":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-yellow-900 text-yellow-300 border border-yellow-600" : "bg-yellow-100 text-yellow-800 border border-yellow-300"}`;
      case "preparing":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-blue-900 text-blue-300 border border-blue-600" : "bg-blue-100 text-blue-800 border border-blue-300"}`;
      case "readyForWaiter":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-orange-900 text-orange-300 border border-orange-600" : "bg-orange-100 text-orange-800 border border-orange-300"}`;
      case "ready":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-green-900 text-green-300 border border-green-600" : "bg-green-100 text-green-800 border border-green-300"}`;
      case "completed":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-gray-700 text-gray-300 border border-gray-600" : "bg-gray-100 text-gray-800 border border-gray-300"}`;
      case "readyForCheckout":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-purple-900 text-purple-300 border border-purple-600" : "bg-purple-100 text-purple-800 border border-purple-300"}`;
      case "sent":
        return `${baseClasses} ${animationClass} ${darkMode ? "bg-green-900 text-green-300 border border-green-600" : "bg-green-100 text-green-800 border border-green-300"}`;
      default:
        return `${baseClasses} ${darkMode ? "bg-gray-700 text-gray-300 border border-gray-600" : "bg-gray-100 text-gray-800 border border-gray-300"}`;
    }
  };

  const displayStatusText = (order) => {
    const status = order.status; // Always use the actual status, not displayStatus
    switch (status) {
      case "pending":
        return "Order received - Processing";
      case "preparing":
        return "Being prepared in kitchen";
      case "readyForWaiter":
        return "Your order is sending to your table";
      case "readyForCheckout":
        return "Your order is sending to your table";
      case "sent":
        return "Delivered to table"; 
      case "completed":
        return "Ready for checkout";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Function to call waiter
  const handleCallWaiter = async () => {
    const currentTableId = sessionStorage.getItem("tableId");
    
    if (!currentTableId) {
      Swal.fire({
        title: 'Table ID Missing',
        text: 'Cannot call waiter without table information.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      const response = await fetch(`${APIBASE}/waiter/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber: currentTableId,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to call waiter');
      }

      Swal.fire({
        title: 'Waiter Called!',
        text: `Waiter has been notified for Table ${currentTableId}`,
        icon: 'success',
        confirmButtonText: 'OK',
        timer: 3000,
        timerProgressBar: true
      });

    } catch (error) {
      console.error('Error calling waiter:', error);
      Swal.fire({
        title: 'Call Failed',
        text: 'Failed to call waiter. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
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
      Swal.fire({
        title: 'Cannot Checkout Yet',
        text: 'Please wait for all orders to be ready before checkout. Orders must be sent to your table first.',
        icon: 'warning',        // ⚠️ yellow warning icon
        confirmButtonText: 'OK'
      });      
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = async (paymentMethod) => {
    console.log(`Payment method selected: ${paymentMethod}`);
    console.log(`Total amount: ${totalPrice} MMK`);

    const currentTableId = sessionStorage.getItem("tableId");
    if (!currentTableId) {
      Swal.fire({
        title: 'Table ID Missing',
        text: 'Cannot process checkout.',
        icon: 'error',          // ❌ red error icon
        confirmButtonText: 'OK'
      });      
      return;
    }

    const firstOrder = orders[0];
    if (!firstOrder) {
      Swal.fire({
        title: 'No Orders Found',
        text: 'No orders found to checkout.',
        icon: 'warning',        // ⚠️ yellow warning icon
        confirmButtonText: 'OK'
      });      
      return;
    }

    try {
      if (paymentMethod === "card") {
        setShowCardModal(true);
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
        console.log(" Payment intent recorded:", data);
        Swal.fire({
          title: 'Payment Recorded!',
          text: 'Waiting for admin approval.',
          icon: 'success',         // ✅ green checkmark icon
          confirmButtonText: 'OK',
          confirmButtonColor: '#ff69b4', // 🎨 hot pink background
        });
        setShowPaymentModal(false);
    } catch (err) {
        console.error(" Payment error:", err);
        Swal.fire({
          title: 'Payment Failed',
          text: 'Please try again.',
          icon: 'error',           // ❌ red cross icon
          confirmButtonText: 'OK',
          confirmButtonColor: '#ff69b4', // 🎨 hot pink background
        });
    }
};

  const handleSubmitReceipt = async () => {
    setIsPaymentProcessing(true);

    const currentTableId = sessionStorage.getItem("tableId");
    if (!currentTableId) {
      Swal.fire({
        title: 'Table ID Missing',
        text: 'Cannot process checkout.',
        icon: 'error',           // ❌ red cross icon
        confirmButtonText: 'OK'
      });
      setIsPaymentProcessing(false);
      
      return;
    }

    const firstOrder = orders[0];
    if (!firstOrder) {
      Swal.fire({
        title: 'No Orders Found',
        text: 'No orders found to checkout.',
        icon: 'warning',        // yellow warning icon
        confirmButtonText: 'OK'
      });
      setIsPaymentProcessing(false);
      return;
    }

    try {
      const response = await fetch(`${APIBASE}/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderId: firstOrder._id,
          paymentMethod: "scan",
          finalAmount: totalPrice
        })
      });

      if (!response.ok) throw new Error("Failed to process payment");

      const data = await response.json();
      console.log(" Payment processed:", data);

      // Reset and close
      setShowCardModal(false);
      setShowPaymentModal(false);
      // Navigate back to order history page
      navigate('/order-history');
      // Keep isPaymentProcessing true until admin marks as paid
      // Do NOT setIsPaymentProcessing(false) here
    } catch (err) {
      console.error(" Payment processing error:", err);
      Swal.fire({
        title: 'Payment Failed',
        text: 'Failed to process payment. Please try again.',
        icon: 'error',          // ❌ red cross icon
        confirmButtonText: 'OK'
      });
      setIsPaymentProcessing(false);
    }
  };

  const handleCloseQRModal = () => {
    setShowCardModal(false);
    setShowPaymentModal(false);
    navigate('/order-history');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "dark bg-gray-900" : "bg-gray-50"
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={totalItems} />

      <main className={`pt-32 px-4 sm:px-6 lg:px-8 pb-40 transition-colors duration-300 ${
        darkMode ? "bg-gray-900" : "bg-gray-100"
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-3xl font-bold ${
              darkMode ? "text-pink-300" : "text-pink-900"
            }`}>
             Orders History
            </h1>
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              
              
              
              {/* Debug Info - only show in development */}
              {import.meta.env.DEV && (
                <div className={`text-xs px-2 py-1 rounded ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Table: {sessionStorage.getItem("tableId") || "None"}
                </div>
              )}
            </div>
          </div>

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
              <div className="space-y-4 pb-30">
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-lg font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        Order #{order.orderNumber || order._id.slice(-8)}
                      </h3>
                      <span className={`text-lg font-bold ${
                        darkMode ? "text-pink-300" : "text-pink-600"
                      }`}>
                        {formatPrice(calculateOrderTotal(order.items))}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <span className={getStatusBadge(order)}>
                        {displayStatusText(order)}
                      </span>
                    </div>
                    
                    <div className="text-sm mb-2">
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                        Items:
                      </span>
                      <span className={`ml-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {order.items.map(item => item.name).join(", ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
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
                          {formatTime(order.updatedAt || order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                          Table: {order.tableNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-0 left-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-4 py-4 z-50 shadow-lg">
                <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium">Total:</span>
                    <span className={`text-xl font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                      {totalPrice.toLocaleString('en-US')} MMK
                    </span>
                  </div>
                  {!canCheckout && (
                    <p className={`text-xs text-center mb-3 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      Wait for orders to be ready
                    </p>
                  )}
                  
                  {/* Buttons Container - Side by Side */}
                  <div className="flex gap-3">
                    {/* Call Waiter Button */}
                    <button
                      onClick={handleCallWaiter}
                      className={`flex-1 py-3 rounded-lg text-center font-bold text-sm transition-colors duration-200 flex items-center justify-center gap-2 ${
                        darkMode 
                          ? 'bg-blue-600 text-white hover:bg-blue-500' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <span>🔔</span>
                      Call Waiter
                    </button>

                    <button
                      onClick={handleCheckout}
                      disabled={!canCheckout || isPaymentProcessing || isPaid}
                      className={`flex-1 py-3 rounded-lg text-center font-bold text-base transition-colors duration-200 ${
                        canCheckout && !isPaymentProcessing && !isPaid
                          ? darkMode 
                            ? 'bg-pink-600 text-white hover:bg-pink-500' 
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                          : darkMode
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isDeclined
                      ? 'Payment Declined – Try Again'
                      : isPaymentProcessing && !showPaymentSuccessModal
                        ? 'Payment is under review...'
                        : isPaid
                          ? 'Payment is under review...'
                          : 'Checkout'}
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
                    Order #{selectedOrder.orderNumber || selectedOrder._id.slice(-8)}
                  </span>
                  <span className={getStatusBadge(selectedOrder)}>
                    {displayStatusText(selectedOrder)}
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
                          {formatPrice(item.price)} × {item.quantity} {item.quantity === 1 ? 'item' : 'items'}
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

      {showDeclineModal && declinedOrder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center w-[90%] max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Payment Declined</h2>
            <p className="text-gray-700 mb-6">
              The payment for <strong>Table {declinedOrder.tableNumber}</strong> has been declined.
            </p>
            <button
              onClick={() => setShowDeclineModal(false)}
              className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
                  onClick={() => handlePayment('card')}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-3 ${
                    darkMode 
                      ? 'border-blue-500 bg-blue-900 hover:bg-blue-800 text-blue-300' 
                      : 'border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  <div className="text-2xl">💳</div>
                  <div>
                    <p className="font-bold text-lg">Pay with Card</p>
                    <p className="text-sm opacity-80">Add Card and Pay</p>
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
      {showCardModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCardModal(false)}
        >
          <div
            className={`max-w-md w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-800 border border-gray-600" : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2
                  className={`text-xl font-bold ${
                    darkMode ? "text-pink-300" : "text-pink-900"
                  }`}
                >
                  Card Payment
                </h2>
                <button
                  onClick={() => setShowCardModal(false)}
                  className={`text-gray-400 hover:text-gray-600 ${
                    darkMode ? "hover:text-gray-300" : "hover:text-gray-600"
                  }`}
                >
                  ✕
                </button>
              </div>

              {/* Stripe Card Form */}
              <Elements stripe={stripePromise}>
              <CardPaymentForm
                totalPrice={totalPrice}
                orderId={firstOrder._id}
                onClose={() => handlePaymentSuccess(firstOrder._id)}
              />
              </Elements>
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