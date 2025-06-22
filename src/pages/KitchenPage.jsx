import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000" || "https://cherry-myo-restaurant-ordering-system.onrender.com";

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${APIBASE}/orders`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => setOrders(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("order:new", (newOrder) => {
      if (newOrder.status === "Pending") {
        setOrders((prev) => [...prev, newOrder]);
      }
    });

    socket.on("order:update", (updatedOrder) => {
      setOrders((prev) => {
        if (updatedOrder.status !== "Pending") {
          return prev.filter((order) => order._id !== updatedOrder._id);
        }
        return prev.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        );
      });
    });

    socket.on("order:delete", (id) => {
      setOrders((prev) => prev.filter((order) => order._id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);



  const handleMarkAsProcessing = async (orderId) => {
    try {
      const res = await fetch(`${APIBASE}/orders/${orderId}/process`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to update order");

      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      
      alert("✅ Sending to the admin Checkout...");
    } catch (error) {
      console.error(error);
      alert("❌ Failed to mark as processing.");
    }
  };


  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold text-center mb-6">👨‍🍳 Kitchen View</h1>

      {loading && <p className="text-center">Loading orders...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {orders.length === 0 && !loading && (
        <p className="text-center text-gray-600">No orders yet.</p>
      )}

      <div className="grid gap-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-2">
              Table: {order.tableNumber}
            </h2>
            <div className="w-full max-w-md mx-auto">
              <div className="flex justify-between font-semibold text-gray-800 border-b pb-1 mb-2">
                <span>Product</span>
                <span>Quantity</span>
              </div>
              <ul>
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm py-1 border-b border-gray-200">
                    <span>{item.name}</span>
                    <span className="text-gray-600">{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-right mt-4">

              <button
                onClick={() => handleMarkAsProcessing(order._id)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Order processing complete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
