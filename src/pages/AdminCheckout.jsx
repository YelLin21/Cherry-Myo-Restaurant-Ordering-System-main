import jsPDF from 'jspdf';
import AdminAuth from '../components/AdminAuth';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from './DarkModeContext';
import AdminNavbar from '../components/AdminNavbar';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000" ||
    "https://cherry-myo-restaurant-ordering-system.onrender.com";

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50">
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                        <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-red-600 text-white px-4 py-2 rounded"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function AdminCheckoutPage() {
    return (
        <ErrorBoundary>
            <AdminAuth>
                {({ user, handleLogout }) => (
                    <CheckoutContent user={user} handleLogout={handleLogout} />
                )}
            </AdminAuth>
        </ErrorBoundary>
    );
}

function CheckoutContent({ user, handleLogout }) {
    const [checkoutOrders, setCheckoutOrders] = useState([]);
    const [discounts, setDiscounts] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [paymentMethods, setPaymentMethods] = useState({}); // 'scan' or 'cash'
    const [cashAmounts, setCashAmounts] = useState({}); // cash received amounts
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [payments, setPayments] = useState({});
    const [checkouts, setCheckouts] = useState([]);
    const [expandedOrders, setExpandedOrders] = useState({}); // Track which orders are expanded

    const navigate = useNavigate();
    const { darkMode, setDarkMode } = useDarkMode();
    const isMountedRef = useRef(true);
    const socketRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Safe state setter that checks if component is still mounted
    const safeSetState = useCallback((setter, value) => {
        if (isMountedRef.current) {
            setter(value);
        }
    }, []);

    // Disable browser extension interference
    useEffect(() => {
        // Prevent browser extensions from interfering
        const preventExtensionMessages = (e) => {
            if (e.data && e.data.source === 'react-devtools-bridge') {
                return;
            }
            if (e.data && e.data.source === 'react-devtools-content-script') {
                return;
            }
            // Stop propagation of extension messages
            if (e.data && typeof e.data === 'object' && e.data.type && e.data.type.includes('extension')) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        };

        window.addEventListener('message', preventExtensionMessages, true);
        
        // Also add to document
        document.addEventListener('message', preventExtensionMessages, true);
        
        return () => {
            window.removeEventListener('message', preventExtensionMessages, true);
            document.removeEventListener('message', preventExtensionMessages, true);
        };
    }, []);
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault(); // Prevent the default error handling
        };

        const handleError = (event) => {
            console.error('Global error caught:', event.error);
            event.preventDefault();
        };

        // Chrome extension message handling
        const handleMessage = (event) => {
            // Ignore messages from extensions
            if (event.source !== window) {
                return;
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleError);
            window.removeEventListener('message', handleMessage);
        };
    }, []);


    // Function to sync with database
    const syncWithDatabase = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        safeSetState(setIsRefreshing, true);
        try {
            console.log("Starting database sync...");
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${APIBASE}/orders/checkout`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!isMountedRef.current) return;
            
            if (response.ok) {
                const dbOrders = await response.json();
                console.log("Manual sync - Database orders:", dbOrders.length);
                console.log("Raw database orders (readyForCheckout + sent):", dbOrders.map(o => ({
                    id: o._id,
                    table: o.tableNumber,
                    status: o.status,
                    paid: o.paid,
                    items: o.items?.length || 0,
                    processedAt: o.processedAt
                })));

                const groupedOrders = dbOrders.reduce((acc, order) => {
                    const existingTable = acc.find(o => o.tableNumber === order.tableNumber);
                    if (existingTable) {
                        existingTable.items.push(...order.items);
                        existingTable.orderIds = [...(existingTable.orderIds || [existingTable._id]), order._id];
                        existingTable.processedAt = order.processedAt;
                    } else {
                        acc.push({
                            ...order,
                            orderIds: [order._id]
                        });
                    }
                    return acc;
                }, []);

                console.log("Grouped orders for checkout:", groupedOrders.length);
                console.log("Final grouped orders:", groupedOrders.map(o => ({
                    id: o._id,
                    table: o.tableNumber,
                    status: o.status,
                    items: o.items?.length || 0,
                    orderIds: o.orderIds
                })));

                if (isMountedRef.current) {
                    safeSetState(setCheckoutOrders, groupedOrders);
                    localStorage.setItem("checkoutOrders", JSON.stringify(groupedOrders));
                    console.log("Successfully synced with database");
                }
            } else {
                console.error("❌ Failed to fetch from /orders/checkout, status:", response.status);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error("❌ Request timed out");
            } else {
                console.error("❌ Failed to sync with database:", error);
            }
            // Don't throw the error, handle it gracefully
        } finally {
            if (isMountedRef.current) {
                safeSetState(setIsRefreshing, false);
            }
        }
    }, [safeSetState]);

    const fetchPayments = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const res = await fetch(`${APIBASE}/checkouts`, {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!isMountedRef.current) return;
          
          if (res.ok) {
            const data = await res.json();
      
            const map = {};
            data.forEach(p => {
                if (p.orderId) {
                  map[p.orderId._id ? p.orderId._id.toString() : p.orderId.toString()] = p.paymentMethod;
                }
              });

            if (isMountedRef.current) {
                safeSetState(setPayments, map);
                console.log("Payments synced:", map);
            }
          } else {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.error("❌ Payments fetch timed out");
          } else {
            console.error("❌ Failed to fetch payments:", err);
          }
        }
      }, [safeSetState]);

      const fetchCheckouts = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const res = await fetch(`${APIBASE}/checkouts`, {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!isMountedRef.current) return;
          
          if (res.ok) {
            const data = await res.json();
            if (isMountedRef.current) {
                safeSetState(setCheckouts, data);
                console.log("Checkouts fetched:", data);
            }
          } else {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.error("❌ Checkouts fetch timed out");
          } else {
            console.error("❌ Failed to fetch checkouts:", err);
          }
        }
      }, [safeSetState]);
      

      
      useEffect(() => {
        const init = async () => {
          try {
            await syncWithDatabase();
            await fetchPayments();
            await fetchCheckouts();
          } catch (error) {
            console.error("❌ Error during initialization:", error);
          }
        };
        init();
      }, []);
      

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Load saved orders first
        const saved = localStorage.getItem("checkoutOrders");
        if (saved) {
            try {
                setCheckoutOrders(JSON.parse(saved));
            } catch {
                console.error("❌ Failed to parse saved orders");
            }
        }

        // Fetch current checkout orders from database to sync with reality
        const fetchCheckoutOrders = async () => {
            try {
                await syncWithDatabase();
            } catch (error) {
                console.error("❌ Error fetching checkout orders:", error);
            }
        };

        // Initial fetch
        fetchCheckoutOrders();

        // Initialize socket connection with error handling
        let socket;
        try {
            socket = io(SOCKET_URL, { 
                transports: ["websocket"],
                timeout: 20000,
                forceNew: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                maxReconnectionAttempts: 5,
                autoConnect: true
            });

            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("Admin socket connected:", socket.id);
                console.log("Socket URL:", SOCKET_URL);
            });

            socket.on("disconnect", (reason) => {
                console.log("❌ Admin socket disconnected:", reason);
            });

            socket.on("connect_error", (error) => {
                console.error("❌ Socket connection error:", error);
            });

            socket.on("reconnect", (attemptNumber) => {
                console.log("Socket reconnected after", attemptNumber, "attempts");
            });

            socket.on("reconnect_error", (error) => {
                console.error("❌ Socket reconnection error:", error);
            });

            socket.on("reconnect_failed", () => {
                console.error("❌ Socket reconnection failed");
            });
        } catch (error) {
            console.error("❌ Failed to initialize socket:", error);
        }

        // Set up socket event handlers if socket was created successfully
        if (socket) {

        // Listen for new orders ready for checkout
        socket.on("order:readyForCheckout", (order) => {
            try {
                console.log("Checkout order received:", order);
                console.log("Order items:", order.items);
                console.log("Order table:", order.tableNumber);
                console.log("Order status:", order.status);
                console.log("Order processedAt:", order.processedAt);

                setCheckoutOrders((prev) => {
                    console.log("Current checkout orders before update:", prev.length);

                    const existingTableOrderIndex = prev.findIndex(
                        existingOrder => existingOrder.tableNumber === order.tableNumber
                    );

                    let updated;
                    if (existingTableOrderIndex !== -1) {
                        updated = [...prev];
                        const existingOrder = updated[existingTableOrderIndex];

                        console.log("Found existing order for table", order.tableNumber, "- merging");

                        const combinedItems = [...existingOrder.items, ...order.items];

                        updated[existingTableOrderIndex] = {
                            ...existingOrder,
                            items: combinedItems,
                            processedAt: order.processedAt, // Use latest processed time
                            orderIds: [
                                ...(Array.isArray(existingOrder.orderIds) ? existingOrder.orderIds : [existingOrder._id]),
                                order._id
                            ] // Track all order IDs for this table
                        };

                        console.log(`Merged order ${order._id} with existing table ${order.tableNumber} order`);
                    } else {
                        // Add as new table order
                        updated = [...prev, {
                            ...order,
                            orderIds: [order._id] // Track the original order ID
                        }];
                        console.log(`Added new order for table ${order.tableNumber}`);
                    }

                    console.log("Updated checkout orders count:", updated.length);
                    console.log("Updated checkout orders:", updated.map(o => ({
                        id: o._id,
                        table: o.tableNumber,
                        status: o.status,
                        items: o.items?.length || 0
                    })));
                    localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                    return updated;
                });
            } catch (error) {
                console.error("Error handling order:readyForCheckout:", error);
            }
        });

        // Listen for order deletions/removals
        socket.on("order:deleted", (deletedOrderId) => {
            try {
                console.log("Order deleted:", deletedOrderId);
                setCheckoutOrders((prev) => {
                    const updated = prev.filter(order => {
                        // Remove if this is the main order ID
                        if (order._id === deletedOrderId) {
                            return false;
                        }
                        // Remove if this order ID is in the merged orderIds array
                        if (Array.isArray(order.orderIds) && order.orderIds.includes(deletedOrderId)) {
                            // If this was a merged order, remove just this ID
                            const remainingIds = order.orderIds.filter(id => id !== deletedOrderId);
                            if (remainingIds.length === 0) {
                                return false; // Remove entire table order if no orders left
                            }
                            // Update the order to remove the deleted order ID
                            order.orderIds = remainingIds;
                        }
                        return true;
                    });
                    localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                    return updated;
                });
            } catch (error) {
                console.error("❌ Error handling order:deleted:", error);
            }
        });

        // Listen for order updates (including status changes that might remove from checkout)
        socket.on("order:update", (updatedOrder) => {
            try {
                console.log("Order update received:", updatedOrder);

                // Keep orders that have status "readyForCheckout" or "sent" and are not paid
                const shouldKeepInCheckout = (updatedOrder.status === "readyForCheckout" || updatedOrder.status === "sent") && !updatedOrder.paid;

                if (!shouldKeepInCheckout) {
                    console.log(`Order ${updatedOrder._id} status changed to ${updatedOrder.status} (paid: ${updatedOrder.paid}), removing from checkout`);
                    setCheckoutOrders((prev) => {
                        const updated = prev.filter(order => {
                            if (order._id === updatedOrder._id) {
                                return false;
                            }
                            if (Array.isArray(order.orderIds) && order.orderIds.includes(updatedOrder._id)) {
                                const remainingIds = order.orderIds.filter(id => id !== updatedOrder._id);
                                if (remainingIds.length === 0) {
                                    return false;
                                }
                                order.orderIds = remainingIds;
                            }
                            return true;
                        });
                        localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                        return updated;
                    });
                } else {
                    // Update the order in place if it's still valid for checkout
                    console.log(`🔄 Order ${updatedOrder._id} status updated to ${updatedOrder.status}, keeping in checkout`);
                    setCheckoutOrders((prev) => {
                        const updated = prev.map(order => {
                            if (order._id === updatedOrder._id) {
                                return { ...order, ...updatedOrder };
                            }
                            // Also check if this order ID is in the merged orderIds array
                            if (Array.isArray(order.orderIds) && order.orderIds.includes(updatedOrder._id)) {
                                // Update the main order properties while keeping the merged structure
                                return {
                                    ...order,
                                    status: updatedOrder.status,
                                    processedAt: updatedOrder.processedAt || order.processedAt
                                };
                            }
                            return order;
                        });
                        localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                        return updated;
                    });
                }
            } catch (error) {
                console.error("Error handling order:update:", error);
            }
        });

        // Listen for paid orders (should be removed from checkout)
        socket.on("order:paid", (paidOrderId) => {
            try {
                console.log("Order marked as paid, removing from checkout:", paidOrderId);
                setCheckoutOrders((prev) => {
                    const updated = prev.filter(order => {
                        if (order._id === paidOrderId) {
                            return false;
                        }
                        if (Array.isArray(order.orderIds) && order.orderIds.includes(paidOrderId)) {
                            const remainingIds = order.orderIds.filter(id => id !== paidOrderId);
                            if (remainingIds.length === 0) {
                                return false;
                            }
                            order.orderIds = remainingIds;
                        }
                        return true;
                    });
                    localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                    return updated;
                });
            } catch (error) {
                console.error("❌ Error handling order:paid:", error);
            }
        });
        } // Close the if (socket) block

        return () => {
            try {
                if (socketRef.current) {
                    socketRef.current.removeAllListeners();
                    socketRef.current.disconnect();
                    console.log(" Socket disconnected and cleaned up");
                }
            } catch (error) {
                console.error(" Error cleaning up socket:", error);
            }
        };
    }, []);

    const handleDiscountChange = (orderId, value) => {
        const numeric = parseFloat(value);
        setDiscounts((prev) => ({
            ...prev,
            [orderId]: isNaN(numeric) ? 0 : numeric,
        }));
    };

    const handlePaymentMethodChange = (orderId, method) => {
        setPaymentMethods((prev) => ({
            ...prev,
            [orderId]: method,
        }));

        if (method === 'scan') {
            setCashAmounts((prev) => {
                const updated = { ...prev };
                delete updated[orderId];
                return updated;
            });
        }
    };

    const toggleOrderExpansion = (orderId) => {
        setExpandedOrders((prev) => ({
            ...prev,
            [orderId]: !prev[orderId],
        }));
    };

    const handleCashAmountChange = (orderId, amount) => {
        const numeric = parseFloat(amount);
        setCashAmounts((prev) => ({
            ...prev,
            [orderId]: isNaN(numeric) ? 0 : numeric,
        }));
    };

    const handleMarkAsPaid = async (tableOrder) => {
        try {
            const orderIds = Array.isArray(tableOrder.orderIds) ? tableOrder.orderIds : [tableOrder._id];
            const paymentMethod = paymentMethods[tableOrder._id];
            const finalTotal = calculateFinalTotal(tableOrder);

            if (!paymentMethod) {
                Swal.fire({
                    title: 'No items selected',
                    text: 'Please select a payment method (QR Scan or Cash)',
                    icon: 'warning',
                    confirmButtonText: 'OK',
                    customClass: {
                        confirmButton: 'swal-confirm'
                    },
                    buttonsStyling: false // <- disables default SweetAlert2 styles
                })
                return;
            }

            // Validate cash payment
            if (paymentMethod === 'cash') {
                const cashReceived = cashAmounts[tableOrder._id];
                if (!cashReceived || cashReceived < finalTotal) {
                    Swal.fire({
                        title: 'No items selected',
                        text: '⚠️ Insufficient cash amount received',
                        icon: 'warning',
                        confirmButtonText: 'OK',
                        customClass: {
                            confirmButton: 'swal-confirm'
                        },
                        buttonsStyling: false // <- disables default SweetAlert2 styles
                    })
                    return;
                }
            }

            // Validate QR payment
            if (paymentMethod === 'scan') {
                // QR payment is always valid when selected
                console.log("QR payment method selected");
            }

            console.log("Marking orders as paid for table", tableOrder.tableNumber, ":", orderIds);
            console.log("Payment method:", paymentMethod);

            // Mark all orders for this table as paid
            const markPaidPromises = orderIds.map(orderId =>
                fetch(`${APIBASE}/orders/mark-paid`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId,
                        paymentMethod,
                        finalAmount: finalTotal,
                        cashReceived: paymentMethod === 'cash' ? cashAmounts[tableOrder._id] : null,
                        changeGiven: paymentMethod === 'cash' ? (cashAmounts[tableOrder._id] - finalTotal) : null
                    }),
                })
            );

            const responses = await Promise.all(markPaidPromises);

            // Check if all requests were successful
            const failedResponses = responses.filter(response => !response.ok);
            if (failedResponses.length > 0) {
                throw new Error(`Failed to mark ${failedResponses.length} order(s) as paid`);
            }

            console.log(" All orders marked as paid successfully for table", tableOrder.tableNumber);

            // Remove from local checkout orders list
            setCheckoutOrders((prev) => {
                const updated = prev.filter((order) => order.tableNumber !== tableOrder.tableNumber);
                localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                return updated;
            });

            // Clean up state for this order
            setPaymentMethods((prev) => {
                const updated = { ...prev };
                delete updated[tableOrder._id];
                return updated;
            });
            setCashAmounts((prev) => {
                const updated = { ...prev };
                delete updated[tableOrder._id];
                return updated;
            });

            const orderCount = orderIds.length;
            const orderText = orderCount === 1 ? 'order' : 'orders';
            const paymentText = paymentMethod === 'cash'
                ? `Cash: ${cashAmounts[tableOrder._id]}MMK, Change: ${(cashAmounts[tableOrder._id] - finalTotal).toFixed(2)}MMK`
                : 'QR Scan payment';

            // Generate PDF receipt automatically after successful payment
            try {
                generateReceiptPDF(tableOrder);
                console.log("Receipt PDF generated successfully");
            } catch (pdfError) {
                console.error("Error generating PDF receipt:", pdfError);
                // Continue even if PDF generation fails
            }
        } catch (error) {
            Swal.fire({
                title: 'No items selected',
                text: 'Failed to mark orders as paid. Please try again.',
                icon: 'warning',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'swal-confirm'
                },
                buttonsStyling: false // <- disables default SweetAlert2 styles
            })
            return;
        }
    };

    const calculateFinalTotal = (order) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const total = orderItems.reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
            0
        );
        const discountPercent = discounts[order._id] || 0;
        const discountAmount = (discountPercent / 100) * total;
        return Math.max(total - discountAmount, 0);
    };

    // Keep only basic English letters, numbers, spaces, and common punctuation.
// Everything else (including Myanmar) is removed.
function safeAscii(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9 .,:;'"\-_/#+&%@!?\[\]]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
// 58mm thermal print (TEXT-ONLY) via hidden iframe 
function printThermal58(order, { discountPercent = 0, paymentMethod, cashReceived = 0 }) {
  const COLS = 30;
  const ascii = (t) => String(t ?? '')
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9 .,:;'"\-_/#+&%@!?[\]]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const padL = (l, r = '') => {
    const left = String(l), right = String(r);
    const pad = Math.max(0, COLS - left.length - right.length);
    return left + ' '.repeat(pad) + right;
  };
  const wrap = (s) => {
    const out = []; let t = String(s ?? '');
    while (t.length) { out.push(t.slice(0, COLS)); t = t.slice(COLS); }
    return out;
  };
  const n0 = (x) => (Number(x) || 0).toFixed(0);

  const items = Array.isArray(order?.items) ? order.items : [];
  let subtotal = 0;
  const lines = [];

  lines.push('Cherry Myo');
  lines.push('Restaurant (MM)');
  lines.push('-'.repeat(COLS));

  const now = new Date();
  const tableLabel = ascii(order?.tableNumber ?? order?.tableName ?? '');
  lines.push(`Table: ${tableLabel || '-'}`);
  lines.push(padL(
    `Date: ${now.toLocaleDateString()}`,
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  ));
  lines.push('-'.repeat(COLS));
  lines.push('Items:');

  items.forEach((it, i) => {
    const name = ascii(it?.name) || `Item ${i + 1}`;
    const qty = Number(it?.quantity || it?.qty || 0);
    const price = Number(it?.price || 0);
    const tot = qty * price; subtotal += tot;

    wrap(name).forEach((ln, idx) => lines.push((idx === 0 ? '' : ' ') + ln));
    lines.push(padL(`${qty} x ${n0(price)} `, `${n0(tot)} MMK`));
  });

  lines.push('-'.repeat(COLS));
  const discAmt = Math.round((Number(discountPercent) / 100) * subtotal);
  const finalTotal = Math.max(subtotal - discAmt, 0);
  lines.push(padL('Subtotal:', `${n0(subtotal)} MMK`));
  if (discountPercent > 0) lines.push(padL(`Discount(${discountPercent}%):`, `-${n0(discAmt)} MMK`));
  lines.push(padL('Final Total:', `${n0(finalTotal)} MMK`));
  lines.push('');

  const paidCash = paymentMethod === 'cash';
  lines.push(`Method: ${paidCash ? 'Cash' : 'QR Scan'}`);
  if (paidCash) {
    const cash = Number(cashReceived) || 0;
    const change = Math.max(0, cash - finalTotal);
    lines.push(padL('Cash:', `${n0(cash)} MMK`));
    lines.push(padL('Change:', `${n0(change)} MMK`));
  }

  lines.push('');
  lines.push('Thank you!');
  // form feed often ignored by browsers, but harmless
  lines.push('\f');

  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @page { margin: 0; }            /* remove default margins */
  html, body { margin:0; padding:0; }
  body { font: 12px monospace; }  /* fixed-width for alignment */
  pre  { white-space: pre; margin: 0; line-height: 1.25; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
<pre>${lines.join('\n')}</pre>`;

  // --- print via hidden iframe (no popup) ---
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  // set handlers BEFORE attaching srcdoc for reliable onload
  iframe.onload = () => {
    const w = iframe.contentWindow;
    if (!w) return cleanup();
    // give layout a tick, then print
    requestAnimationFrame(() => {
      const after = () => cleanup();
      w.addEventListener('afterprint', after, { once: true });
      w.focus();
      w.print();
      // Fallback cleanup in case afterprint doesn't fire (some browsers)
      setTimeout(after, 1500);
    });
  };

  const cleanup = () => {
    try { document.body.removeChild(iframe); } catch {}
  };

  iframe.srcdoc = html; // more reliable than doc.write
  document.body.appendChild(iframe);
}


    // Function to generate PDF receipt
    const generateReceiptPDF = async (order) => {
        const doc = new jsPDF();
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const total = orderItems.reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
            0
        );
        const discountPercent = discounts[order._id] || 0;
        const discountAmount = (discountPercent / 100) * total;
        const finalTotal = Math.max(total - discountAmount, 0);
        const paymentMethod = paymentMethods[order._id];
        const cashReceived = cashAmounts[order._id];
        const change = paymentMethod === 'cash' ? (cashReceived - finalTotal) : 0;

        try {
            // Try to add logo
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            
            await new Promise((resolve) => {
                logoImg.onload = () => {
                    try {
                        // Create canvas to convert image to base64
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = logoImg.width;
                        canvas.height = logoImg.height;
                        ctx.drawImage(logoImg, 0, 0);
                        
                        const dataURL = canvas.toDataURL('image/png');
                        doc.addImage(dataURL, 'PNG', 85, 8, 20, 20);
                    } catch (error) {
                        console.warn('Could not add logo to PDF:', error);
                    }
                    resolve();
                };
                logoImg.onerror = () => {
                    console.warn('Logo image not found');
                    resolve();
                };
                logoImg.src = '/image/cherry_myo.png';
            });
        } catch (error) {
            console.warn('Error loading logo:', error);
        }

        // Header with better styling
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 127); // Cherry pink color
        doc.text('Cherry Myo Restaurant', 105, 35, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Cherry Myo Restaurant (Myanmar)', 105, 43, { align: 'center' });
        
        // Receipt title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Payment Receipt', 105, 55, { align: 'center' });
        
        // Decorative line
        doc.setDrawColor(220, 38, 127);
        doc.setLineWidth(1);
        doc.line(20, 60, 190, 60);
        
        // Receipt details section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        const receiptInfo = [
            [`Table: ${order.tableNumber}`, `Receipt #: ${Date.now().toString().slice(-8)}`],
            [`Date: ${new Date().toLocaleDateString()}`, `Time: ${new Date().toLocaleTimeString()}`]
        ];
        
        let yPos = 75;
        receiptInfo.forEach(([left, right]) => {
            doc.text(left, 20, yPos);
            doc.text(right, 130, yPos);
            yPos += 8;
        });
        
        // Order items section
        yPos += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Order Items:', 20, yPos);
        
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, yPos, 190, yPos);
        
        // Table headers
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Item Name', 20, yPos);
        doc.text('Qty', 120, yPos);
        doc.text('Price', 140, yPos);
        doc.text('Total', 170, yPos);
        
        yPos += 3;
        doc.line(20, yPos, 190, yPos);
        
        // Order items
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9); // Slightly smaller font to prevent overlap
        orderItems.forEach((item) => {
            const itemTotal = (item.price || 0) * (item.quantity || 0);
            
            // Handle long item names more carefully
            let itemName = safeAscii(item?.name) || `Item ${index + 1}`;
            if (itemName.length > 30) {
                itemName = itemName.substring(0, 30) + '...';
            }
            
            doc.text(itemName, 20, yPos);
            doc.text(`${item.quantity || 0}`, 125, yPos);
            doc.text(`${(item.price || 0).toFixed(2)}`, 145, yPos);
            doc.text(`${itemTotal.toFixed(2)}`, 175, yPos);
            yPos += 10; // Increased spacing between items
        });
        
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        const summaryItems = [
            ['Subtotal:', `${total.toFixed(2)} MMK`],
            ...(discountPercent > 0 ? [['Discount (' + discountPercent + '%):', `-${discountAmount.toFixed(2)} MMK`]] : [])
        ];
        
        summaryItems.forEach(([label, value]) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            
            doc.text(label, 120, yPos);
            doc.text(value, 175, yPos, { align: 'right' });
            yPos += 10;
        });
        
        // Final Total with proper spacing
        yPos += 5; // Extra spacing before final total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 127);
        
        doc.text('Final Total:', 120, yPos);
        doc.text(`${finalTotal.toFixed(2)} MMK`, 175, yPos, { align: 'right' });
        yPos += 15;
        
        // Payment details
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Payment Details:', 20, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        const paymentDetails = [
            [`Method: ${paymentMethod === 'cash' ? 'Cash Payment' : 'QR Code Scan'}`, ''],
            ...(paymentMethod === 'cash' ? [
                [`Cash Received: ${cashReceived.toFixed(2)} MMK`, ''],
                [`Change Given: ${change.toFixed(2)} MMK`, '']
            ] : [])
        ];
        
        paymentDetails.forEach(([detail]) => {
            doc.text(detail, 20, yPos);
            yPos += 8;
        });
        
        // Footer section with proper spacing
        yPos += 20; // Extra spacing before footer
        const pageHeight = doc.internal.pageSize.height;
        const footerY = Math.max(yPos, pageHeight - 50); // More space for footer
        
        // Decorative line
        doc.setDrawColor(220, 38, 127);
        doc.setLineWidth(0.5);
        doc.line(20, footerY, 190, footerY);
        
        // Footer text with proper spacing
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        
        const footerMessages = [
            'Thank you for dining with us!',
            'Cherry Myo Restaurant',
            'Authentic Myanmar Cuisine - Visit us again soon!'
        ];
        
        footerMessages.forEach((message, index) => {
            doc.text(message, 105, footerY + 15 + (index * 8), { align: 'center' });
        });
        
        // Save the PDF
        const fileName = `Cherry-Myo-Receipt-Table-${order.tableNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName); //to save
      

        printThermal58(order, {
  discountPercent: discounts[order._id] || 0,
  paymentMethod: paymentMethods[order._id],
  cashReceived: cashAmounts[order._id] || 0,
});

        console.log("PDF receipt generated:", fileName);
    };

    // Debug log for checkout orders
    console.log("Current checkout orders:", checkoutOrders);
    console.log("Orders count:", checkoutOrders.length);

    return (
        <div className={`min-h-screen transition-all duration-500 relative overflow-hidden ${darkMode
                ? "bg-gradient-to-br from-gray-900 via-red-950 to-pink-950 text-white"
                : "bg-gradient-to-br from-pink-50 via-rose-100 to-red-50 text-gray-800"
            }`}>
            {/* Admin Navigation */}
            <AdminNavbar />
            
            {/* Animated Cherry Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute animate-float opacity-20 ${darkMode ? 'text-pink-400' : 'text-red-400'
                            }`}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 10}s`,
                            animationDuration: `${8 + Math.random() * 4}s`,
                            fontSize: `${12 + Math.random() * 8}px`,
                        }}
                    >
                        🍒
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className={`relative z-10 border-b backdrop-blur-md shadow-xl mt-16 ${darkMode
                    ? 'bg-gradient-to-r from-gray-900/90 via-red-950/90 to-pink-950/90 border-pink-700/40'
                    : 'bg-gradient-to-r from-white/95 via-pink-50/95 to-rose-50/95 border-pink-300/60'
                }`}>
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        {/* Title Section */}
                        <div className="flex items-center gap-6">
                            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transform transition-all duration-300 hover:scale-110 ${darkMode
                                    ? 'bg-gradient-to-br from-red-600 via-pink-600 to-rose-600 shadow-pink-500/30'
                                    : 'bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 shadow-red-400/40'
                                }`}>
                                <div className="absolute inset-0 rounded-3xl bg-white/20 animate-pulse"></div>
                                <span className="text-3xl relative z-10 filter drop-shadow-lg">🧾</span>
                            </div>
                            <div className="space-y-2">
                                <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-pink-300' : 'text-pink-700'
                                    } bg-clip-text bg-gradient-to-r ${darkMode ? 'from-pink-300 to-rose-300' : 'from-pink-300 to-pink-700'
                                    }`}>
                                    Cherry Myo Checkout
                                </h1>
                                <p className={`text-base font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                    Restaurant Payment Management
                                </p>
                            </div>
                        </div>

                        {/* Right Side Controls */}
                        <div className="flex items-center gap-4">
                            {/* Current Time */}
                            <div className={`relative px-4 py-3 rounded-2xl text-sm font-mono font-bold transform transition-all duration-300 hover:scale-105 ${darkMode
                                    ? 'bg-gray-800/80 border border-pink-600/30 shadow-lg shadow-pink-500/20 text-pink-200'
                                    : 'bg-white/90 border border-gray-200 shadow-lg shadow-gray-300/30 text-gray-800'
                                } backdrop-blur-md`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-base animate-pulse">🕐</span>
                                    <span className="tracking-wide">{currentTime.toLocaleTimeString()}</span>
                                </div>
                            </div>

                            {/* Admin Info */}
                            
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl h-14 ${darkMode ? 'bg-gray-700/50 text-gray-200' : 'bg-white/80 text-gray-700'
                                    } shadow-lg`}>
                                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">
                                            {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="font-semibold text-sm leading-tight">{user.displayName || 'Admin'}</span>
                                        <span className="text-xs opacity-75 leading-tight">{user.email}</span>
                                    </div>
                                </div>


                                {/* Sign Out Button */}
                                <button
                                    onClick={async () => {
                                        try {
                                            await handleLogout();
                                            navigate('/checkout');
                                        } catch (error) {
                                            console.error("Sign out error:", error);
                                        }
                                    }}
                                    className={`relative group px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden ${darkMode
                                            ? 'bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white shadow-xl shadow-red-500/40'
                                            : 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 text-white shadow-xl shadow-red-400/50'
                                        }`}
                                >
                                    {/* Cherry decorative elements */}
                                    <div className="absolute inset-0 opacity-20">
                                        <div className="absolute top-1 left-2 text-xs">🍒</div>
                                        <div className="absolute bottom-1 right-2 text-xs transform rotate-45">🍒</div>
                                    </div>

                                    {/* Animated shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                                    {/* Button content */}
                                    <div className="relative flex items-center gap-2">
                                        <span className="animate-pulse">👋</span>
                                        <span>Sign Out</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                    {checkoutOrders.length === 0 ? (
                        <div className="text-center py-16">
                            <div className={`max-w-md mx-auto p-8 rounded-3xl shadow-2xl backdrop-blur-sm ${darkMode ? 'bg-gray-800/50' : 'bg-white/80'
                                }`}>
                                <div className="text-8xl mb-6 animate-bounce">🍒</div>
                                <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-pink-300' : 'text-red-700'
                                    }`}>
                                    All Clear!
                                </h3>
                                <p className={`text-lg mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                    No orders ready for checkout
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                    Waiting for kitchen to process orders...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">

                            {checkoutOrders.map((order) => {
                                // Ensure order.items exists and is an array
                                const orderItems = Array.isArray(order.items) ? order.items : [];
                                const total = orderItems.reduce(
                                    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
                                    0
                                );
                                const discountPercent = discounts[order._id] || 0;
                                const discountAmount = (discountPercent / 100) * total;
                                const finalTotal = Math.max(total - discountAmount, 0);

                                return (
                                    <div
                                        key={order._id}
                                        className={`rounded-3xl shadow-2xl backdrop-blur-sm transform transition-all duration-500 hover:scale-[1.02] ${darkMode
                                                ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-pink-800/30'
                                                : 'bg-gradient-to-br from-white/90 to-pink-50/90 border border-pink-200/50'
                                            }`}
                                    >
                                        {/* Clickable Order Header - Summary View */}
                                        <div 
                                            className={`p-6 cursor-pointer hover:bg-opacity-80 transition-all duration-300 ${
                                                expandedOrders[order._id] ? 'border-b border-pink-200/30' : ''
                                            }`}
                                            onClick={() => toggleOrderExpansion(order._id)}
                                        >
                                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${darkMode
                                                            ? 'bg-gradient-to-br from-pink-600 to-red-600'
                                                            : 'bg-gradient-to-br from-pink-500 to-red-500'
                                                        }`}>
                                                        <span className={`text-xl font-bold ${darkMode ? 'text-gray-300' : 'text-red-700'
                                                            }`}>
                                                            {order.tableNumber}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h2 className={`text-2xl font-bold ${darkMode ? 'text-pink-300' : 'text-red-700'
                                                            }`}>
                                                            Table {order.tableNumber}
                                                        </h2>
                                                        <div className="flex items-center gap-2 mt-1">
                                                        

{(() => {
  const firstPayment = Array.isArray(order.orderIds)
    ? order.orderIds.map(id => payments[id.toString()]).find(Boolean)
    : null;

  if (!firstPayment) return null;

  if (firstPayment === "cash") {
    return (
      <span className="ml-3 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        💵 Pay with Cash
      </span>
    );
  }

  // For scan/QR, just show the scan badge without image
  return (
    <span className="ml-3 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      📱 Scan
    </span>
  );
})()}

                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'readyForCheckout'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : order.status === 'sent'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {order.status === 'readyForCheckout' ? '🔵 Ready' :
                                                                    order.status === 'sent' ? '✅ Sent' :
                                                                        order.status}
                                                            </span>
                                                            {(Array.isArray(order.orderIds) && order.orderIds.length > 1) && (
                                                                <span className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full font-medium">
                                                                    {order.orderIds.length} merged orders
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {order.processedAt && (
                                                    <div className={`px-4 py-2 rounded-xl text-sm ${darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        ✅ {new Date(order.processedAt).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Order Details */}
                                        {expandedOrders[order._id] && (
                                            <div className="p-6">
                                                {/* Order Items */}
                                                <div className={`rounded-2xl p-4 mb-6 ${darkMode ? 'bg-gray-700/30' : 'bg-pink-50/50'
                                                    }`}>
                                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-pink-300' : 'text-red-700'
                                                    }`}>
                                                    Order Items
                                                </h3>
                                                <div className="space-y-3">
                                                    {orderItems.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`flex justify-between items-center p-4 rounded-xl ${darkMode ? 'bg-gray-600/30' : 'bg-white/70'
                                                                } shadow-sm`}
                                                        >
                                                            <div className="flex-1">
                                                                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'
                                                                    }`}>{item.name}</h4>
                                                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'
                                                                    }`}>
                                                                    Qty: {item.quantity} × {item.price.toFixed(2)}MMK   
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'
                                                                    }`}>
                                                                    {(item.quantity * item.price).toFixed(2)}MMK
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Payment Summary */}
                                            <div className={`rounded-2xl p-6 mb-6 ${darkMode ? 'bg-gray-700/30' : 'bg-gradient-to-r from-pink-50 to-red-50'
                                                }`}>
                                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-pink-300' : 'text-red-700'
                                                    }`}>
                                                    Payment Summary
                                                </h3>

                                                <div className="space-y-3">
                                                    <div className={`flex justify-between ${darkMode ? 'text-gray-200' : 'text-gray-800'
                                                        }`}>
                                                        <span>Subtotal</span>
                                                        <span>{total.toFixed(2)}MMK</span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <label htmlFor={`discount-${order._id}`} className={
                                                            darkMode ? 'text-gray-200' : 'text-gray-800'
                                                        }>
                                                            Discount (%)
                                                        </label>
                                                        <input
                                                            id={`discount-${order._id}`}
                                                            type="number"
                                                            className={`w-20 px-3 py-2 rounded-lg border text-center ${darkMode
                                                                    ? 'bg-gray-600 border-gray-500 text-white'
                                                                    : 'bg-white border-gray-300 text-gray-900'
                                                                }`}
                                                            value={discounts[order._id] || ""}
                                                            placeholder="0"
                                                            min="0"
                                                            max="100"
                                                            onChange={(e) =>
                                                                handleDiscountChange(order._id, e.target.value)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex justify-between text-red-600">
                                                        <span>Discount Amount</span>
                                                        <span>{discountAmount.toFixed(2)}-MMK</span>
                                                    </div>

                                                    <div className={`flex justify-between text-xl font-bold pt-3 border-t ${darkMode ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'
                                                        }`}>
                                                        <span>Final Total</span>
                                                        <span>{finalTotal.toFixed(2)}MMK</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Slip Images */}
                                            {(() => {
                                                // Find payment slip images for this order
                                                const orderSlips = checkouts.filter(checkout => 
                                                    checkout.orderId && 
                                                    Array.isArray(order.orderIds) && 
                                                    order.orderIds.includes(checkout.orderId._id || checkout.orderId) &&
                                                    checkout.slipImage
                                                );

                                                if (orderSlips.length === 0) return null;

                                                return (
                                                    <div className={`rounded-2xl p-6 mb-6 ${darkMode ? 'bg-gray-700/30' : 'bg-blue-50/70'}`}>
                                                        <h3 className={`text-lg font-semibold mb-4 text-center ${darkMode ? 'text-pink-300' : 'text-blue-700'}`}>
                                                            📄 Payment Slip Images
                                                        </h3>
                                                        <div className="flex flex-wrap justify-center items-center gap-4">
                                                            {orderSlips.map((slip, index) => (
                                                                <div key={index} className={`relative group rounded-xl overflow-hidden shadow-lg w-64 ${darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                                                                    {/* Image Container */}
                                                                    <div className="relative aspect-square">
                                                                        <img
                                                                            src={slip.slipImage}
                                                                            alt={`Payment Slip ${index + 1}`}
                                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                            onError={(e) => {
                                                                                e.target.src = '/image/cherry_myo.png'; // Fallback image
                                                                            }}
                                                                        />
                                                                        
                                                                        {/* View Overlay */}
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                                            <button
                                                                                onClick={() => {
                                                                                    // Open image in new tab
                                                                                    window.open(slip.slipImage, '_blank');
                                                                                }}
                                                                                className="bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
                                                                                title="View Full Image"
                                                                            >
                                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>

                                                                        {/* Payment Method Badge */}
                                                                        <div className="absolute top-2 right-2">
                                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                                slip.paymentMethod === 'cash' 
                                                                                    ? 'bg-green-100 text-green-800' 
                                                                                    : 'bg-blue-100 text-blue-800'
                                                                            }`}>
                                                                                {slip.paymentMethod === 'cash' ? '💵 Cash' : '📱 QR'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Image Info */}
                                                                    <div className="p-3 text-center">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                                Payment Slip {index + 1}
                                                                            </span>
                                                                            {slip.createdAt && (
                                                                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                                    {new Date(slip.createdAt).toLocaleDateString()}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {slip.finalAmount && (
                                                                            <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                                                 {slip.finalAmount.toFixed(2)} MMK
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Payment Method */}
                                            <div className={`rounded-2xl p-6 ${darkMode ? 'bg-gray-700/30' : 'bg-white/70'
                                                }`}>
                                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-pink-300' : 'text-red-700'
                                                    }`}>
                                                    Payment Method
                                                </h3>

                                                <div className="flex gap-4 mb-6">
                                                    <button
                                                        onClick={() => handlePaymentMethodChange(order._id, 'scan')}
                                                        className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${paymentMethods[order._id] === 'scan'
                                                                ? 'border-blue-500 bg-blue-500 text-white'
                                                                : darkMode
                                                                    ? 'border-gray-600 bg-gray-600/30 text-gray-300 hover:bg-gray-600/50'
                                                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div className="text-center">
                                                            <div className="text-2xl mb-2">📱</div>
                                                            <div className="font-semibold">QR Scan</div>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => handlePaymentMethodChange(order._id, 'cash')}
                                                        className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${paymentMethods[order._id] === 'cash'
                                                                ? 'border-blue-500 bg-blue-500 text-white'
                                                                : darkMode
                                                                    ? 'border-gray-600 bg-gray-600/30 text-gray-300 hover:bg-gray-600/50'
                                                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div className="text-center">
                                                            <div className="text-2xl mb-2">💵</div>
                                                            <div className="font-semibold">Cash</div>
                                                        </div>
                                                    </button>
                                                </div>

                                                {/* QR Code Section */}
                                                {paymentMethods[order._id] === 'scan' && (
                                                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                                                        }`}>
                                                        <div className="text-center py-4">
                                                            <div className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'
                                                                }`}>
                                                                QR Payment Selected: {finalTotal.toFixed(2)} MMK
                                                            </div>
                                                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'
                                                                }`}>
                                                                Customer will pay via QR scan
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Cash Payment Section */}
                                                {paymentMethods[order._id] === 'cash' && (
                                                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'
                                                        }`}>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <label className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'
                                                                    }`}>Cash Received (MMK)</label>
                                                                <input
                                                                    type="number"
                                                                    className={`w-32 px-3 py-2 rounded-lg border text-center ${darkMode
                                                                            ? 'bg-gray-600 border-gray-500 text-white'
                                                                            : 'bg-white border-gray-300 text-gray-900'
                                                                        }`}
                                                                    value={cashAmounts[order._id] || ""}
                                                                    placeholder="0.00"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) =>
                                                                        handleCashAmountChange(order._id, e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            {cashAmounts[order._id] && (
                                                                <div className="flex justify-between items-center pt-3 border-t border-green-200">
                                                                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'
                                                                        }`}>Change</span>
                                                                    <span className={`font-bold ${(cashAmounts[order._id] - finalTotal) >= 0
                                                                            ? 'text-green-600'
                                                                            : 'text-red-600'
                                                                        }`}>
                                                                        {Math.max(0, (cashAmounts[order._id] - finalTotal)).toFixed(2)}MMK
                                                                        {(cashAmounts[order._id] - finalTotal) < 0 && (
                                                                            <span className="text-xs text-red-500 ml-1">
                                                                                (Insufficient)
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-6 text-right pt-3">
                                                    <button
                                                        onClick={() => handleMarkAsPaid(order)}
                                                        disabled={!paymentMethods[order._id] ||
                                                            (paymentMethods[order._id] === 'cash' &&
                                                                (!cashAmounts[order._id] || cashAmounts[order._id] < finalTotal))}
                                                        className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${!paymentMethods[order._id]
                                                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 text-white shadow-red-400/50'
                                                            }`}
                                                    >
                                                        🍒 Mark as Paid & Print Receipt
                                                        {(Array.isArray(order.orderIds) && order.orderIds.length > 1) && (
                                                            <span className="ml-2 px-2 py-1 bg-red-600 rounded text-sm">
                                                                {order.orderIds.length} orders
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
  onClick={() => printThermal58(order, {
    discountPercent: discounts[order._id] || 0,
    paymentMethod: paymentMethods[order._id],
    cashReceived: cashAmounts[order._id] || 0,
  })}
  className="ml-3 px-6 py-3 rounded-xl font-bold bg-white/80 hover:bg-white text-pink-700"
>
  🧾 Print 58mm Receipt
</button>

                                                    {/* Payment Status */}
                                                    <div className="mt-3 text-right">
                                                        {!paymentMethods[order._id] && (
                                                            <span className="text-orange-600">⚠️ Select payment method</span>
                                                        )}
                                                        {paymentMethods[order._id] === 'cash' &&
                                                            (!cashAmounts[order._id] || cashAmounts[order._id] < finalTotal) && (
                                                                <span className="text-red-600">⚠️ Enter sufficient cash amount</span>
                                                            )}
                                                        {paymentMethods[order._id] === 'scan' && (
                                                            <span className="text-green-600">✅ QR payment method selected - Ready to proceed</span>
                                                        )}
                                                        {(paymentMethods[order._id] === 'cash' &&
                                                            cashAmounts[order._id] >= finalTotal) && (
                                                                <span className="text-green-600">✅ Ready to mark as paid & print receipt</span>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <style>
                {`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                .animate-float {
                    animation: float 8s ease-in-out infinite;
                }
                `}
            </style>
        </div>
    );
}