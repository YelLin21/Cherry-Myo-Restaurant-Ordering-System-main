import { useState } from "react";
import Navbar from "../components/Navbar.jsx"; // Import NavBar component

export default function FoodMenuPage() {
  const BeerItems = [
    { name: "Chang Beer", price: 40 },
    { name: "Singer Beer", price: 40 },
    { name: "Leo Beer", price: 50 },
    { name: "Water", price: 10 },
  ];

  // Maintain quantity for each item separately
  const [quantities, setQuantities] = useState(
    Array(BeerItems.length).fill(0)
  );

  const handleIncrement = (index) => {
    const updated = [...quantities];
    updated[index]++;
    setQuantities(updated);
  };

  const handleDecrement = (index) => {
    const updated = [...quantities];
    if (updated[index] > 0) updated[index]--;
    setQuantities(updated);
  };

  return (
     <div>
          <Navbar />
          <main className="p-8 bg-gray-100 min-h-screen pt-10">
    <div className="pt-16 p-6 bg-pink-50 min-h-screen">
      <h1 className="text-xl font-bold mb-4">Grill Menu</h1>

      {/* Menu List */}
      <div className="space-y-4">
        {BeerItems.map((item, index) => (
          <div 
          style={{ backgroundColor: "#FFC0CB" }}
            key={index}
            className="bg-white p-4 rounded-lg shadow flex justify-between"
          >
            <div>
              <h2 className="font-semibold">{item.name}</h2>
              <p className="text-sm">{item.price} Baht</p>
            </div>
            <div className="flex items-center">
              <button
                className="px-2 py-1 text-white rounded hover:opacity-80"
                style={{ backgroundColor: "#9B9B9B" }}
                onClick={() => handleDecrement(index)}
              >
                -
              </button>
              <span className="px-3">{quantities[index]}</span>
              <button
                className="px-2 py-1 text-white rounded hover:opacity-80"
                style={{ backgroundColor: "#BD3B53" }}
                onClick={() => handleIncrement(index)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </main>
    </div>
  );
}
