import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function CartPage() {
  const [selectedItems, setSelectedItems] = useState({});
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, total } = useCart();

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

  return (
    <div>
      <Navbar />
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
                    <span className="md:w-[35%] text-center md:text-left">{item.name}</span>
                    <span className="md:w-[20%] text-right">{item.price} Baht</span>

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

                    <span className="md:w-[20%] text-right">{item.price * quantity} Baht</span>
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

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => navigate("/checkout")}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Next →
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
