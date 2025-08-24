import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import AdminNavbar from "../components/AdminNavbar.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, signInWithGoogle } from "../firebase";

function GoogleIcon({ className = "w-6 h-6" }) {
    return (
        <svg className={className} viewBox="0 0 48 48">
            <g>
                <path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.6 0 5 .9 6.9 2.4l6-6C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.2-.3-3.5z" />
                <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.8 13 24 13c2.6 0 5 .9 6.9 2.4l6-6C34.5 6.5 29.6 4 24 4 15.6 4 8.1 9.7 6.3 14.7z" />
                <path fill="#FBBC05" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.6 35.5 27 36.5 24 36.5c-4.6 0-8.7-2.7-10.3-7l-6.6 5.1C8.1 38.3 15.6 44 24 44z" />
                <path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.1 3-3.6 5.2-6.3 6.3l6.5 5.3C40.7 36.2 44 31.7 44 24c0-1.3-.1-2.2-.4-3.5z" />
            </g>
        </svg>
    );
}

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000" ||
    "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function AdminCheckoutPage() {
    // Admin email addresses
    const ADMIN_EMAIL = ["2001yellin@gmail.com", "u6520242@au.edu", "cherrymyo@gmail.com"];

    const [checkoutOrders, setCheckoutOrders] = useState([]);
    const [discounts, setDiscounts] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [paymentMethods, setPaymentMethods] = useState({}); // 'scan' or 'cash'
    const [cashAmounts, setCashAmounts] = useState({}); // cash received amounts
    const [showQrCode, setShowQrCode] = useState({}); // QR code visibility per order
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auth states
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [resetMessage, setResetMessage] = useState("");

    const navigate = useNavigate();
    const { darkMode, setDarkMode } = useDarkMode();


    // Function to sync with database
    const syncWithDatabase = async () => {
        setIsRefreshing(true);
        try {
            console.log("🔄 Starting database sync...");
            const response = await fetch(`${APIBASE}/orders/checkout`);
            if (response.ok) {
                const dbOrders = await response.json();
                console.log("🔄 Manual sync - Database orders:", dbOrders.length);
                console.log("🔄 Raw database orders (readyForCheckout + sent):", dbOrders.map(o => ({
                    id: o._id,
                    table: o.tableNumber,
                    status: o.status,
                    paid: o.paid,
                    items: o.items?.length || 0,
                    processedAt: o.processedAt
                })));


                // Group orders by table (same logic as socket handler)
                const groupedOrders = dbOrders.reduce((acc, order) => {
                    const existingTable = acc.find(o => o.tableNumber === order.tableNumber);
                    if (existingTable) {
                        existingTable.items.push(...order.items);
                        existingTable.orderIds = [...(existingTable.orderIds || [existingTable._id]), order._id];
                        existingTable.processedAt = order.processedAt; // Use latest
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

                setCheckoutOrders(groupedOrders);
                localStorage.setItem("checkoutOrders", JSON.stringify(groupedOrders));
                console.log("✅ Successfully synced with database");
            } else {
                console.error("❌ Failed to fetch from /orders/checkout, status:", response.status);
            }
        } catch (error) {
            console.error("❌ Failed to sync with database:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Auto-hide messages after 10 seconds
    useEffect(() => {
        if (loginError) {
            const timer = setTimeout(() => {
                setLoginError("");
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [loginError]);

    useEffect(() => {
        if (resetMessage) {
            const timer = setTimeout(() => {
                setResetMessage("");
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [resetMessage]);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && !ADMIN_EMAIL.includes(user.email)) {
                setLoginError("You are not authorized to access the Admin Checkout page.");
                setUser(null);
                await signOut(auth);
                setAuthLoading(false);
                return;
            }
            setUser(user);
            setAuthLoading(false);
        });
        return () => unsubscribe();
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
            await syncWithDatabase();
        };

        // Initial fetch
        fetchCheckoutOrders();

        const socket = io(SOCKET_URL, { transports: ["websocket"] });

        socket.on("connect", () => {
            console.log("🧾 Admin socket connected:", socket.id);
            console.log("🧾 Socket URL:", SOCKET_URL);
        });

        socket.on("disconnect", () => {
            console.log("❌ Admin socket disconnected");
        });

        socket.on("connect_error", (error) => {
            console.error("❌ Socket connection error:", error);
        });

        // Listen for new orders ready for checkout
        socket.on("order:readyForCheckout", (order) => {
            console.log("📥 Checkout order received:", order);
            console.log("📱 Order items:", order.items);
            console.log("📱 Order table:", order.tableNumber);
            console.log("📱 Order status:", order.status);
            console.log("📱 Order processedAt:", order.processedAt);

            setCheckoutOrders((prev) => {
                console.log("📋 Current checkout orders before update:", prev.length);

                // Check if there's already an order for this table
                const existingTableOrderIndex = prev.findIndex(
                    existingOrder => existingOrder.tableNumber === order.tableNumber
                );

                let updated;
                if (existingTableOrderIndex !== -1) {
                    // Merge with existing table order
                    updated = [...prev];
                    const existingOrder = updated[existingTableOrderIndex];

                    console.log("🔄 Found existing order for table", order.tableNumber, "- merging");

                    // Combine items from both orders
                    const combinedItems = [...existingOrder.items, ...order.items];

                    // Update the existing order with combined items and latest timestamp
                    updated[existingTableOrderIndex] = {
                        ...existingOrder,
                        items: combinedItems,
                        processedAt: order.processedAt, // Use latest processed time
                        orderIds: [
                            ...(existingOrder.orderIds || [existingOrder._id]),
                            order._id
                        ] // Track all order IDs for this table
                    };

                    console.log(`🔄 Merged order ${order._id} with existing table ${order.tableNumber} order`);
                } else {
                    // Add as new table order
                    updated = [...prev, {
                        ...order,
                        orderIds: [order._id] // Track the original order ID
                    }];
                    console.log(`➕ Added new order for table ${order.tableNumber}`);
                }

                console.log("📱 Updated checkout orders count:", updated.length);
                console.log("📱 Updated checkout orders:", updated.map(o => ({
                    id: o._id,
                    table: o.tableNumber,
                    status: o.status,
                    items: o.items?.length || 0
                })));
                localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                return updated;
            });
        });

        // Listen for order deletions/removals
        socket.on("order:deleted", (deletedOrderId) => {
            console.log("🗑️ Order deleted:", deletedOrderId);
            setCheckoutOrders((prev) => {
                const updated = prev.filter(order => {
                    // Remove if this is the main order ID
                    if (order._id === deletedOrderId) {
                        return false;
                    }
                    // Remove if this order ID is in the merged orderIds array
                    if (order.orderIds && order.orderIds.includes(deletedOrderId)) {
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
        });

        // Listen for order updates (including status changes that might remove from checkout)
        socket.on("order:update", (updatedOrder) => {
            console.log("🔄 Order update received:", updatedOrder);

            // Keep orders that have status "readyForCheckout" or "sent" and are not paid
            const shouldKeepInCheckout = (updatedOrder.status === "readyForCheckout" || updatedOrder.status === "sent") && !updatedOrder.paid;
            
            if (!shouldKeepInCheckout) {
                console.log(`🔄 Order ${updatedOrder._id} status changed to ${updatedOrder.status} (paid: ${updatedOrder.paid}), removing from checkout`);
                setCheckoutOrders((prev) => {
                    const updated = prev.filter(order => {
                        if (order._id === updatedOrder._id) {
                            return false;
                        }
                        if (order.orderIds && order.orderIds.includes(updatedOrder._id)) {
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
                        if (order.orderIds && order.orderIds.includes(updatedOrder._id)) {
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
        });

        // Listen for paid orders (should be removed from checkout)
        socket.on("order:paid", (paidOrderId) => {
            console.log("💰 Order marked as paid, removing from checkout:", paidOrderId);
            setCheckoutOrders((prev) => {
                const updated = prev.filter(order => {
                    if (order._id === paidOrderId) {
                        return false;
                    }
                    if (order.orderIds && order.orderIds.includes(paidOrderId)) {
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
        });

        return () => socket.disconnect();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Login error:", error);
            setLoginError("Failed to sign in with Google. Please try again.");
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoginError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (!ADMIN_EMAIL.includes(user.email)) {
                setLoginError("You are not authorized to access the promotion menu page.");
                await signOut(auth);
                return;
            }

            if (rememberMe) {
                localStorage.setItem('rememberAdmin', 'true');
            }

        } catch (error) {
            console.error("Email login error:", error);
            switch (error.code) {
                case 'auth/user-not-found':
                    setLoginError("No admin account found with this email address.");
                    break;
                case 'auth/wrong-password':
                    setLoginError("Incorrect password. Please try again.");
                    break;
                case 'auth/invalid-email':
                    setLoginError("Invalid email address format.");
                    break;
                case 'auth/too-many-requests':
                    setLoginError("Too many failed attempts. Please try again later.");
                    break;
                default:
                    setLoginError("Login failed. Please check your credentials and try again.");
            }
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setLoginError("Please enter your email address first.");
            return;
        }

        if (!ADMIN_EMAIL.includes(email)) {
            setLoginError("This email is not authorized for admin access.");
            return;
        }

        setLoginError("");
        setResetMessage("");

        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage("Password reset email sent! Check your inbox and follow the instructions.");
        } catch (error) {
            console.error("Password reset error:", error);
            switch (error.code) {
                case 'auth/user-not-found':
                    setLoginError("No admin account found with this email address.");
                    break;
                case 'auth/invalid-email':
                    setLoginError("Invalid email address format.");
                    break;
                case 'auth/too-many-requests':
                    setLoginError("Too many reset requests. Please try again later.");
                    break;
                default:
                    setLoginError("Failed to send reset email. Please try again.");
            }
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };


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

        // Reset related states when changing payment method
        if (method === 'scan') {
            setCashAmounts((prev) => {
                const updated = { ...prev };
                delete updated[orderId];
                return updated;
            });
        } else {
            setShowQrCode((prev) => ({
                ...prev,
                [orderId]: false,
            }));
        }
    };

    const handleCashAmountChange = (orderId, amount) => {
        const numeric = parseFloat(amount);
        setCashAmounts((prev) => ({
            ...prev,
            [orderId]: isNaN(numeric) ? 0 : numeric,
        }));
    };

    const generateQrCode = (orderId, amount) => {
        setShowQrCode((prev) => ({
            ...prev,
            [orderId]: true,
        }));
    };

    const generateThaiQrCode = (amount) => {
        // Thai QR Code format (PromptPay)
        // This is a simplified version - you might want to use a proper library
        const merchantId = "0123456789012"; // Replace with actual merchant ID
        const qrData = `00020101021229370016A000000677010111011${merchantId}520454045802TH5909Cherry Myo6007Bangkok62070503***6304`;

        // Add amount to QR code
        const amountStr = amount.toFixed(2);
        const qrWithAmount = qrData.replace('***', amountStr);

        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrWithAmount)}`;
    };

    const handleMarkAsPaid = async (tableOrder) => {
        try {
            const orderIds = tableOrder.orderIds || [tableOrder._id];
            const paymentMethod = paymentMethods[tableOrder._id];
            const finalTotal = calculateFinalTotal(tableOrder);

            // Validate payment method selection
            if (!paymentMethod) {
                alert('⚠️ Please select a payment method (QR Scan or Cash)');
                return;
            }

            // Validate cash payment
            if (paymentMethod === 'cash') {
                const cashReceived = cashAmounts[tableOrder._id];
                if (!cashReceived || cashReceived < finalTotal) {
                    alert('⚠️ Insufficient cash amount received');
                    return;
                }
            }

            // Validate QR payment
            if (paymentMethod === 'scan' && !showQrCode[tableOrder._id]) {
                alert('⚠️ Please generate QR code before marking as paid');
                return;
            }

            console.log("💰 Marking orders as paid for table", tableOrder.tableNumber, ":", orderIds);
            console.log("💳 Payment method:", paymentMethod);

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

            console.log("✅ All orders marked as paid successfully for table", tableOrder.tableNumber);

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
            setShowQrCode((prev) => {
                const updated = { ...prev };
                delete updated[tableOrder._id];
                return updated;
            });

            const orderCount = orderIds.length;
            const orderText = orderCount === 1 ? 'order' : 'orders';
            const paymentText = paymentMethod === 'cash'
                ? `Cash: ฿${cashAmounts[tableOrder._id]}, Change: ฿${(cashAmounts[tableOrder._id] - finalTotal).toFixed(2)}`
                : 'QR Scan payment';

            alert(`💰 Table ${tableOrder.tableNumber} - ${orderCount} ${orderText} marked as paid\n💳 ${paymentText}\n✅ Removed from customer order history.`);
        } catch (error) {
            console.error('Error marking orders as paid:', error);
            alert('❌ Failed to mark orders as paid. Please try again.');
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

    // Debug log for checkout orders
    console.log("🧾 Current checkout orders:", checkoutOrders);
    console.log("📱 Orders count:", checkoutOrders.length);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span>Loading...</span>
            </div>
        );
    }

    if (!user || loginError) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${darkMode
                    ? 'bg-gradient-to-br from-gray-900 via-red-900 to-pink-900'
                    : 'bg-gradient-to-br from-pink-50 via-white to-rose-100'
                }`}>
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationName: 'fall',
                                animationDuration: `${5 + Math.random() * 5}s`,
                                animationDelay: `${Math.random() * 10}s`,
                                animationIterationCount: 'infinite',
                                animationTimingFunction: 'linear'
                            }}
                        >
                            <div
                                className="text-red-500 opacity-60"
                                style={{
                                    fontSize: `${12 + Math.random() * 8}px`,
                                    transform: `rotate(${Math.random() * 360}deg)`
                                }}
                            >
                                🍒
                            </div>
                        </div>
                    ))}
                </div>

                <style jsx>{`
          @keyframes fall {
            0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
        `}</style>

                <div className={`relative z-10 w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-lg border transition-all duration-300 hover:shadow-xl ${darkMode
                        ? 'bg-gray-800/70 border-pink-500/20 shadow-pink-500/10'
                        : 'bg-white/80 border-pink-200/50 shadow-pink-500/20'
                    } transform hover:scale-105`}>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg relative overflow-hidden">
                            <span className="text-white text-2xl font-bold">🎉</span>
                            <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent"></div>
                        </div>
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent" style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}>
                            Admin Checkout
                        </h1>
                        <h2 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-pink-300' : 'text-red-700'}`} style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}>
                            Admin Access
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {resetMessage && (
                            <div className="p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800 dark:text-green-200">{resetMessage}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loginError && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 animate-bounce">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800 dark:text-red-200">{loginError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Admin Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@cherrymyo.com"
                                required
                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${darkMode
                                        ? 'bg-gray-700/50 border-gray-600 text-gray-300 placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                                    } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200 ${darkMode
                                            ? 'bg-gray-700/50 border-gray-600 text-gray-300 placeholder-gray-500'
                                            : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                                        } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors duration-200 ${darkMode
                                            ? 'text-gray-400 hover:text-gray-300'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className={`text-sm hover:underline transition-colors duration-200 ${darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-red-600 hover:text-red-800'
                                    }`}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            onClick={handleEmailLogin}
                            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center gap-2 text-lg"
                            style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Login with Email</span>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-500/50 flex items-center justify-center gap-3 text-lg border border-gray-300"
                            style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}
                        >
                            <GoogleIcon className="w-6 h-6" />
                            <span>Continue with Google</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gray-100">
            <AdminNavbar />
            <div className="pt-24 p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
                    <h1 className="text-2xl sm:text-3xl font-bold">🧾 Admin Checkout</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={syncWithDatabase}
                            disabled={isRefreshing}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${isRefreshing
                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            title="Sync with database to fetch all ready and sent orders"
                        >
                            {isRefreshing ? '🔄 Syncing...' : '🔄 Sync DB'}
                        </button>
                        <p className="text-gray-600 font-mono text-xs sm:text-sm">
                            {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {checkoutOrders.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                        <div className="bg-white rounded-lg p-6 shadow-md border">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-gray-600 text-base sm:text-lg mb-2">No orders ready for checkout.</p>
                            <p className="text-gray-500 text-sm">Waiting for kitchen to process and send orders...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Debug info for mobile */}
                        <div className="sm:hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-blue-800 text-sm font-medium">
                                📱 Mobile View • {checkoutOrders.length} order(s) found (Ready + Sent)
                            </p>
                        </div>

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
                                    className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 relative overflow-hidden"
                                >
                                    {/* Mobile indicator */}
                                    <div className="sm:hidden absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                        Mobile
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pt-6 sm:pt-0">
                                        <div className="flex items-center gap-3 mb-1 sm:mb-0">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                                🍽️ Table: {order.tableNumber}
                                            </h2>
                                            
                                            {/* Order Status Badge */}
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                order.status === 'readyForCheckout' 
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : order.status === 'sent' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {order.status === 'readyForCheckout' ? '🔵 Ready' : 
                                                 order.status === 'sent' ? '✅ Sent' : 
                                                 order.status}
                                            </span>
                                            
                                            {(order.orderIds && order.orderIds.length > 1) && (
                                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                                                    {order.orderIds.length} merged orders
                                                </span>
                                            )}
                                        </div>
                                        {order.processedAt && (
                                            <p className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                ✅ Processed: {new Date(order.processedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Items display - responsive design */}
                                    <div className="mt-4">
                                        {/* Mobile-friendly cards for small screens */}
                                        <div className="sm:hidden space-y-3">
                                            {order.items && order.items.length > 0 ? (
                                                order.items.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                                                    >
                                                        <div className="font-medium text-gray-800 mb-2 text-base">{item.name}</div>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Qty:</span>
                                                                <span className="font-medium">{item.quantity}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Price:</span>
                                                                <span className="font-medium">฿{item.price.toFixed(2)}</span>
                                                            </div>
                                                            <div className="col-span-2 flex justify-between border-t pt-2 mt-2">
                                                                <span className="font-semibold text-gray-800">Total:</span>
                                                                <span className="font-bold text-green-600">
                                                                    ฿{(item.quantity * item.price).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-gray-500 py-4">
                                                    No items in this order
                                                </div>
                                            )}
                                        </div>

                                        {/* Desktop table for larger screens */}
                                        <div className="hidden sm:block">
                                            <div className="grid grid-cols-4 font-semibold border-b pb-2 text-gray-800 text-sm lg:text-base bg-gray-100 p-2 rounded-t-lg">
                                                <div>Product</div>
                                                <div className="text-center">Qty</div>
                                                <div className="text-center">Price</div>
                                                <div className="text-right">Total</div>
                                            </div>

                                            {orderItems && orderItems.length > 0 ? (
                                                orderItems.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="grid grid-cols-4 text-sm lg:text-base text-gray-700 py-3 px-2 border-b border-gray-100 hover:bg-gray-50"
                                                    >
                                                        <div className="pr-2 font-medium">{item.name}</div>
                                                        <div className="text-center">{item.quantity}</div>
                                                        <div className="text-center">฿{item.price.toFixed(2)}</div>
                                                        <div className="text-right font-semibold">
                                                            ฿{(item.quantity * item.price).toFixed(2)}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-gray-500 py-4 col-span-4">
                                                    No items in this order
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 sm:mt-6 text-sm bg-gray-50 p-3 sm:p-4 rounded-lg shadow-inner border">
                                        <div className="flex justify-between py-1">
                                            <span className="font-medium text-gray-700">Total</span>
                                            <span className="text-gray-900 font-semibold">
                                                ฿{total.toFixed(2)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 gap-2 sm:gap-0">
                                            <label
                                                className="font-medium text-gray-700"
                                                htmlFor={`discount-${order._id}`}
                                            >
                                                Discount (%)
                                            </label>
                                            <input
                                                id={`discount-${order._id}`}
                                                type="number"
                                                className="border border-gray-300 px-2 py-1 rounded-md w-full sm:w-24 text-right text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                value={discounts[order._id] || ""}
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                onChange={(e) =>
                                                    handleDiscountChange(order._id, e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Discount Amount</span>
                                            <span className="text-gray-500">
                                                -฿{discountAmount.toFixed(2)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between border-t pt-2 mt-2 text-base font-bold text-green-700">
                                            <span>Final Total</span>
                                            <span>฿{finalTotal.toFixed(2)}</span>
                                        </div>

                                        {/* Payment Method Selection */}
                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                            <label className="font-medium text-gray-700 block mb-2">
                                                Payment Method
                                            </label>
                                            <div className="flex gap-3 mb-3">
                                                <button
                                                    onClick={() => handlePaymentMethodChange(order._id, 'scan')}
                                                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${paymentMethods[order._id] === 'scan'
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    📱 QR Scan
                                                </button>
                                                <button
                                                    onClick={() => handlePaymentMethodChange(order._id, 'cash')}
                                                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${paymentMethods[order._id] === 'cash'
                                                            ? 'bg-green-500 text-white border-green-500'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    💵 Cash
                                                </button>
                                            </div>

                                            {/* QR Code Section */}
                                            {paymentMethods[order._id] === 'scan' && (
                                                <div className="bg-white p-3 rounded-lg border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            QR Code Payment: ฿{finalTotal.toFixed(2)}
                                                        </span>
                                                        <button
                                                            onClick={() => generateQrCode(order._id, finalTotal)}
                                                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                                        >
                                                            Generate QR
                                                        </button>
                                                    </div>

                                                    {showQrCode[order._id] && (
                                                        <div className="text-center py-3">
                                                            <img
                                                                src={generateThaiQrCode(finalTotal)}
                                                                alt="Thai QR Code"
                                                                className="mx-auto border rounded-lg shadow-sm"
                                                                style={{ maxWidth: '200px', height: 'auto' }}
                                                            />
                                                            <p className="text-xs text-gray-600 mt-2">
                                                                Scan to pay ฿{finalTotal.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Cash Payment Section */}
                                            {paymentMethods[order._id] === 'cash' && (
                                                <div className="bg-white p-3 rounded-lg border">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-sm font-medium text-gray-700">
                                                                Cash Received (฿)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                className="border border-gray-300 px-2 py-1 rounded w-24 text-right text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
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
                                                            <div className="flex justify-between items-center pt-2 border-t">
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    Change
                                                                </span>
                                                                <span className={`text-sm font-bold ${(cashAmounts[order._id] - finalTotal) >= 0
                                                                        ? 'text-green-600'
                                                                        : 'text-red-600'
                                                                    }`}>
                                                                    ฿{Math.max(0, (cashAmounts[order._id] - finalTotal)).toFixed(2)}
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
                                        </div>
                                    </div>

                                    <div className="text-center sm:text-right mt-6">
                                        {(() => {
                                            const paymentMethod = paymentMethods[order._id];
                                            const cashReceived = cashAmounts[order._id];
                                            const isValidPayment = paymentMethod === 'scan'
                                                ? showQrCode[order._id]
                                                : paymentMethod === 'cash' && cashReceived >= finalTotal;

                                            return (
                                                <button
                                                    onClick={() => handleMarkAsPaid(order)}
                                                    disabled={!paymentMethod || (paymentMethod === 'cash' && (!cashReceived || cashReceived < finalTotal))}
                                                    className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 rounded-lg transition-all duration-200 font-semibold text-base shadow-lg transform hover:scale-105 active:scale-95 ${!paymentMethod || (paymentMethod === 'cash' && (!cashReceived || cashReceived < finalTotal))
                                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                                                        }`}
                                                >
                                                    💰 Mark as Paid
                                                    {(order.orderIds && order.orderIds.length > 1) && (
                                                        <span className="ml-2 text-xs bg-blue-800 px-2 py-1 rounded">
                                                            {order.orderIds.length} orders
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })()}

                                        {/* Payment Status Indicator */}
                                        <div className="mt-2 text-xs">
                                            {!paymentMethods[order._id] && (
                                                <span className="text-orange-600">⚠️ Select payment method</span>
                                            )}
                                            {paymentMethods[order._id] === 'cash' && (!cashAmounts[order._id] || cashAmounts[order._id] < finalTotal) && (
                                                <span className="text-red-600">⚠️ Enter sufficient cash amount</span>
                                            )}
                                            {paymentMethods[order._id] === 'scan' && !showQrCode[order._id] && (
                                                <span className="text-blue-600">ℹ️ Generate QR code to proceed</span>
                                            )}
                                            {((paymentMethods[order._id] === 'scan' && showQrCode[order._id]) ||
                                                (paymentMethods[order._id] === 'cash' && cashAmounts[order._id] >= finalTotal)) && (
                                                    <span className="text-green-600">✅ Ready to mark as paid</span>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}