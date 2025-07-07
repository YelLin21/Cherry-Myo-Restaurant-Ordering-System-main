import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function AdminCheckoutPage() {
  const [checkoutOrders, setCheckoutOrders] = useState([]);
  const [discounts, setDiscounts] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setInterval(() => setCurrentTime(new Date()), 1000);
  }, []);

  // 🔁 Load from API
  useEffect(() => {
    fetch(`${APIBASE}/api/orders/checkout`)
      .then((res) => res.json())
      .then((data) => setCheckoutOrders(data))
      .catch((err) => console.error("Failed to load checkout orders:", err));
  }, []);

  // 🔁 Socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Admin connected via socket:", socket.id);
    });

    socket.on("order:readyForCheckout", (order) => {
      console.log("📥 New order received:", order);
      setCheckoutOrders((prev) => [...prev, order]);
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

  // 🧾 Mark as paid (via API)
  const handleMarkAsPaid = async (orderId) => {
    try {
      const res = await fetch(`${APIBASE}/api/orders/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        setCheckoutOrders((prev) => prev.filter((order) => order._id !== orderId));
        alert(`💰 Order ${orderId} marked as paid.`);
      } else {
        alert("❌ Failed to mark order as paid.");
      }
    } catch (err) {
      console.error("Mark as paid error:", err);
      alert("❌ Network error");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🧾 Admin Checkout</h1>
        <p className="text-gray-600 font-mono text-sm">
          {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
        </p>
      </div>

      {checkoutOrders.length === 0 ? (
        <p className="text-center text-gray-600">No orders ready for checkout.</p>
      ) : (
        <div className="grid gap-6">
          {checkoutOrders.map((order) => {
            const total = order.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            const discountPercent = discounts[order._id] || 0;
            const discountAmount = (discountPercent / 100) * total;
            const finalTotal = Math.max(total - discountAmount, 0);

            return (
              <div
                key={order._id}
                className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
              >
                <h2 className="text-xl font-semibold">Table: {order.tableNumber}</h2>
                {order.processedAt && (
                  <p className="text-sm text-gray-500">
                    ✅ Processed at: {new Date(order.processedAt).toLocaleString()}
                  </p>
                )}

                <div className="mt-4">
                  <div className="grid grid-cols-4 font-semibold border-b pb-2 text-gray-800">
                    <div>Product</div>
                    <div className="text-center">Qty</div>
                    <div className="text-center">Price</div>
                    <div className="text-right">Total</div>
                  </div>

                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-4 text-sm text-gray-700 py-2 border-b border-gray-100"
                    >
                      <div>{item.name}</div>
                      <div className="text-center">{item.quantity.toFixed(2)}</div>
                      <div className="text-center">{item.price.toFixed(2)}</div>
                      <div className="text-right">
                        ฿{(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-sm bg-gray-50 p-4 rounded-lg shadow-inner border">
                  <div className="flex justify-between py-1">
                    <span className="font-medium text-gray-700">Total</span>
                    <span className="text-gray-900 font-semibold">
                      ฿{total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <label
                      className="font-medium text-gray-700"
                      htmlFor={`discount-${order._id}`}
                    >
                      Discount (%)
                    </label>
                    <input
                      id={`discount-${order._id}`}
                      type="number"
                      className="border border-gray-300 px-2 py-1 rounded-md w-24 text-right text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={discounts[order._id] || ""}
                      placeholder="0"
                      min="0"
                      max="100"
                      onChange={(e) => handleDiscountChange(order._id, e.target.value)}
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

                <div className="text-right mt-4">
                  <button
                    onClick={() => handleMarkAsPaid(order._id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Mark as Paid
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
