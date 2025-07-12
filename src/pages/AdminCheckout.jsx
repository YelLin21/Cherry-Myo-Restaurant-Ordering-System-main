import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000" ||
    "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function AdminCheckoutPage() {
    const [checkoutOrders, setCheckoutOrders] = useState([]);
    const [discounts, setDiscounts] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("checkoutOrders");
        if (saved) {
            try {
                setCheckoutOrders(JSON.parse(saved));
            } catch {
                console.error("❌ Failed to parse saved orders");
            }
        }

        const socket = io(SOCKET_URL, { transports: ["websocket"] });

        socket.on("connect", () => {
            console.log("🧾 Admin socket connected:", socket.id);
        });

        socket.on("order:readyForCheckout", (order) => {
            console.log("📥 Checkout order received:", order);
            console.log("📱 Order items:", order.items);
            console.log("📱 Order table:", order.tableNumber);
            setCheckoutOrders((prev) => {
                const updated = [...prev, order];
                console.log("📱 Updated checkout orders:", updated);
                localStorage.setItem("checkoutOrders", JSON.stringify(updated));
                return updated;
            });
        });

        return () => socket.disconnect();
    }, []);

    const handleDiscountChange = (orderId, value) => {
        const numeric = parseFloat(value);
        setDiscounts((prev) => ({
            ...prev,
            [orderId]: isNaN(numeric) ? 0 : numeric,
        }));
    };

    const handleMarkAsPaid = (orderId) => {
        console.log("💰 Marking order as paid:", orderId);
        setCheckoutOrders((prev) => {
            const updated = prev.filter((order) => order._id !== orderId);
            localStorage.setItem("checkoutOrders", JSON.stringify(updated));
            return updated;
        });
        alert(`💰 Order ${orderId} marked as paid.`);
    };

    // Debug log for checkout orders
    console.log("🧾 Current checkout orders:", checkoutOrders);
    console.log("📱 Orders count:", checkoutOrders.length);

    return (
        <div className="min-h-screen p-3 sm:p-4 md:p-6 bg-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
                <h1 className="text-2xl sm:text-3xl font-bold">🧾 Admin Checkout</h1>
                <p className="text-gray-600 font-mono text-xs sm:text-sm">
                    {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                </p>
            </div>

            {checkoutOrders.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                    <div className="bg-white rounded-lg p-6 shadow-md border">
                        <div className="text-6xl mb-4">📋</div>
                        <p className="text-gray-600 text-base sm:text-lg mb-2">No orders ready for checkout.</p>
                        <p className="text-gray-500 text-sm">Waiting for kitchen to send orders...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {/* Debug info for mobile */}
                    <div className="sm:hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-blue-800 text-sm font-medium">
                            📱 Mobile View • {checkoutOrders.length} order(s) found
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
                                    <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-0 text-gray-900">
                                        🍽️ Table: {order.tableNumber}
                                    </h2>
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
                                </div>

                                <div className="text-center sm:text-right mt-6">
                                    <button
                                        onClick={() => handleMarkAsPaid(order._id)}
                                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-base shadow-lg transform hover:scale-105 active:scale-95"
                                    >
                                        💰 Mark as Paid
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}