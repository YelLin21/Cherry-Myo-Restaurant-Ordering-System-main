import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AdminNavbar from "../components/AdminNavbar.jsx";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000" ||
    "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function AdminCheckoutPage() {
    const [checkoutOrders, setCheckoutOrders] = useState([]);
    const [discounts, setDiscounts] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [paymentMethods, setPaymentMethods] = useState({}); // 'scan' or 'cash'
    const [cashAmounts, setCashAmounts] = useState({}); // cash received amounts
    const [showQrCode, setShowQrCode] = useState({}); // QR code visibility per order

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
                // Check if there's already an order for this table
                const existingTableOrderIndex = prev.findIndex(
                    existingOrder => existingOrder.tableNumber === order.tableNumber
                );

                let updated;
                if (existingTableOrderIndex !== -1) {
                    // Merge with existing table order
                    updated = [...prev];
                    const existingOrder = updated[existingTableOrderIndex];
                    
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

    return (
        <div className="min-h-screen bg-gray-100">
            <AdminNavbar />
            <div className="pt-24 p-3 sm:p-4 md:p-6">
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
                                    <div className="flex items-center gap-3 mb-1 sm:mb-0">
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                            🍽️ Table: {order.tableNumber}
                                        </h2>
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
                                                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                    paymentMethods[order._id] === 'scan'
                                                        ? 'bg-blue-500 text-white border-blue-500'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                📱 QR Scan
                                            </button>
                                            <button
                                                onClick={() => handlePaymentMethodChange(order._id, 'cash')}
                                                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                    paymentMethods[order._id] === 'cash'
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
                                                            <span className={`text-sm font-bold ${
                                                                (cashAmounts[order._id] - finalTotal) >= 0 
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
                                                className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 rounded-lg transition-all duration-200 font-semibold text-base shadow-lg transform hover:scale-105 active:scale-95 ${
                                                    !paymentMethod || (paymentMethod === 'cash' && (!cashReceived || cashReceived < finalTotal))
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