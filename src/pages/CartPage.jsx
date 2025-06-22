import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import "../index.css";

const APIBASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000" || "https://cherry-myo-restaurant-ordering-system.onrender.com";
import { io } from "socket.io-client";

export default function CartPage() {
    const [selectedItems, setSelectedItems] = useState({});
    const [tableNumber, setTableNumber] = useState("");
    const [orderSent, setOrderSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const { cart, addToCart, removeFromCart, total, clearCart } = useCart();

    const handleCheckboxChange = (id) => {
        setSelectedItems((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleDeleteSelected = () => {
        Object.keys(selectedItems).forEach((id) => {
            if (selectedItems[id]) {
                removeFromCart(id, true);
            }
        });
        setSelectedItems({});
    };

    const handlePlaceOrder = async () => {
        if (!tableNumber.trim()) {
            alert("Please enter your table number.");
            return;
        }

        setLoading(true);

        const order = {
            tableNumber,
            items: Object.values(cart).map(({ item, quantity }) => ({
                itemId: item._id,
                name: item.name,
                price: item.price,
                quantity,
            })),
        };

        try {
            const res = await fetch(`${APIBASE}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });

            if (!res.ok) throw new Error("Order failed");

            setOrderSent(true);
            clearCart();
            setTimeout(() => setOrderSent(false), 3000);
        } catch (err) {
            alert("Failed to send order.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Navbar />
            {orderSent && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-800 px-6 py-3 rounded shadow-lg z-50 animate-fadeIn">
                    ✅ Your order is sending to the kitchen...
                </div>
            )}

            <main className="pt-20 px-4 sm:px-6 lg:px-8 bg-gray-100 min-h-screen">
                <div className="bg-pink-50 rounded-xl p-4 sm:p-6 lg:p-8 shadow-md">
                    <h1 className="text-2xl font-bold text-center mb-6">Cart</h1>

                    {Object.values(cart).length > 0 ? (
                        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4">🛒 Your Cart</h2>

                            <div className="hidden md:flex justify-between font-semibold border-b pb-2 mb-2">
                                <span className="w-[5%]"></span>
                                <span className="w-[35%]">Item</span>
                                <span className="w-[20%] text-right">Price</span>
                                <span className="w-[20%] text-center">Quantity</span>
                                <span className="w-[20%] text-right">Total</span>
                            </div>

                            <ul className="space-y-4">
                                {Object.values(cart).map(({ item, quantity }) => (
                                    <li
                                        key={item._id}
                                        className="flex flex-col md:flex-row justify-between items-center border rounded-md p-3 gap-4"
                                    >
                                        <input
                                            type="checkbox"
                                            className="md:w-[5%]"
                                            checked={!!selectedItems[item._id]}
                                            onChange={() => handleCheckboxChange(item._id)}
                                        />
                                        <span className="md:w-[35%] text-center md:text-left">
                                            {item.name}
                                        </span>
                                        <span className="md:w-[20%] text-right">
                                            {item.price} Baht
                                        </span>

                                        <span className="md:w-[20%] flex justify-center items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(item._id)}
                                                className="px-2 py-1 rounded bg-gray-400 hover:bg-gray-500 text-white"
                                            >
                                                −
                                            </button>
                                            {quantity}
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="px-2 py-1 rounded bg-pink-600 hover:bg-pink-700 text-white"
                                            >
                                                +
                                            </button>
                                        </span>

                                        <span className="md:w-[20%] text-right">
                                            {item.price * quantity} Baht
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
                                <button
                                    onClick={handleDeleteSelected}
                                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full md:w-auto"
                                >
                                    Delete Selected
                                </button>
                                <div className="text-lg font-bold">Total Price: {total} Baht</div>
                            </div>

                            <div className="mt-6">
                                <input
                                    type="text"
                                    placeholder="Enter Table Number"
                                    value={tableNumber}
                                    onChange={(e) => setTableNumber(e.target.value)}
                                    className="border px-4 py-2 rounded w-full md:w-1/2 mb-4"
                                />

                                <button
                                    onClick={handlePlaceOrder}
                                    className={`${orderSent || loading
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700"
                                        } text-white px-6 py-2 rounded w-full md:w-auto`}
                                    disabled={orderSent || loading}
                                >
                                    {loading ? "⌛ Sending..." : orderSent ? "Order Sent" : "Next →"}
                                </button>


                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-lg">Your cart is empty.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
