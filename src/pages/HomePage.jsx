import { useNavigate } from "react-router-dom";
import { useState } from "react"; // Example only, replace with context if needed


export default function HomePage() {
  
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0); // Replace with dynamic value

  return (
    <div className="bg-pink-100 min-h-screen p-4">
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="w-full p-4 mb-6 shadow-inner" style={{ backgroundColor: "#F3E0DA" }}>
          <div className="flex flex-col items-center">
            <img
              src="/image/cherry_myo.png"
              alt="Cherry Myo Logo"
              className="w-20 h-20 rounded-full"
            />
            <h1 className="text-2xl font-bold my-2">Cherry Myo</h1>
            <input
              type="text"
              placeholder="Search..."
              
              className="w-full max-w-md p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-400 mb-6"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <div
            onClick={() => navigate("/food")}
            className="bg-white rounded-xl overflow-hidden shadow hover:scale-105 transition cursor-pointer"
          >
            <img
              src="/image/food menu.jpg"
              alt="Food"
              className="h-32 w-full object-cover"
            />
            <div className="p-2 text-center font-semibold">Foods</div>
            <p className="text-sm text-center font-sans">Order what you love</p>
          </div>

          <div
            onClick={() => navigate("/grill")}
            className="bg-white rounded-xl overflow-hidden shadow hover:scale-105 transition cursor-pointer"
          >
            <img
              src="/image/grill.jpg"
              alt="Grill"
              className="h-32 w-full object-cover"
            />
            <div className="p-2 text-center font-semibold">Grill</div>
            <p className="text-sm text-center font-sans">Fire up the flavor</p>
          </div>

          <div
            onClick={() => navigate("/beverages")}
            className="bg-white rounded-xl overflow-hidden shadow hover:scale-105 transition cursor-pointer"
          >
            <img
              src="/image/tea.jpg"
              alt="Beverages"
              className="h-32 w-full object-cover"
            />
            <div className="p-2 text-center font-semibold">Beverages</div>
            <p className="text-sm text-center font-sans">Choose what you drink</p>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow">
            <img
              src="/image/promotion.jpg"
              alt="Promotion"
              className="h-32 w-full object-cover"
            />
            <div className="p-2 text-center font-semibold">Promotion</div>
          </div>
        </div>

        {/* Floating Cart Button with Count Badge */}
        <div
          className="fixed bottom-5 right-5 bg-pink-400 p-4 rounded-full shadow-xl text-white text-2xl cursor-pointer"
          onClick={() => navigate("/cart")}
        >
          <div className="relative">
            <span>🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
