import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx"; // shared cart context

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
        removeFromCart(id, true); // true = force delete
      }
    });
    setSelectedItems({});
  };

  return (
    <div>
      <Navbar />
      <main className="p-8 bg-gray-100 min-h-screen pt-10">
        <div className="pt-16 p-6 bg-pink-50 min-h-screen">
          <h1 className="text-2xl font-bold text-center mb-6">Cart</h1>

          {Object.values(cart).length > 0 ? (
            <div className="mt-10 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">🛒 Cart</h2>

              {/* Header Row */}
              <div className="flex justify-between font-semibold border-b pb-2 mb-2">
                <span className="w-1/12"></span>
                <span className="w-4/12">Item</span>
                <span className="w-2/12 text-right">Price</span>
                <span className="w-2/12 text-center">Quantity</span>
                <span className="w-2/12 text-right">Total</span>
              </div>

              {/* Cart Items */}
              <ul className="space-y-2">
                {Object.values(cart).map(({ item, quantity }) => (
                  <li key={item._id} className="flex justify-between items-center">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      className="w-1/12"
                      checked={!!selectedItems[item._id]}
                      onChange={() => handleCheckboxChange(item._id)}
                    />
                    
                    {/* Item name */}
                    <span className="w-4/12">{item.name}</span>

                    {/* Item price */}
                    <span className="w-2/12 text-right">{item.price} Baht</span>

                    {/* Quantity controls */}
                    <span className="w-2/12 text-center flex justify-center items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="px-2 py-1 rounded hover:bg-gray-400" style={{ backgroundColor: "#9B9B9B" }}
                      >
                        −
                      </button>
                      {quantity}
                      <button
                        onClick={() => addToCart(item)}
                        className="px-2 py-1 text-white rounded hover:bg-pink-600" style={{ backgroundColor: "#BD3B53" }}
                      >
                        +
                      </button>
                    </span>

                    {/* Total price */}
                    <span className="w-2/12 text-right">{item.price * quantity} Baht</span>
                  </li>
                ))}
              </ul>

              {/* Total and Delete */}
              <div className="flex justify-between items-center mt-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleDeleteSelected}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Delete Selected
                  </button>
                </div>
                <div className="text-lg font-bold">
                  Total Price: {total} Baht
                </div>
              </div>

              {/* Proceed button */}
              <button
                onClick={() => navigate("/checkout")}
                className="mt-6 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 float-right"
              >
                Next →
              </button>
            </div>
          ) : (
            <p className="text-center text-lg">Your cart is empty.</p>
          )}
        </div>
      </main>
    </div>
  );
}
