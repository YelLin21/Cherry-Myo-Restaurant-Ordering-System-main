import { useState } from "react";

export default function FoodMenuPage() {
  const [tab, setTab] = useState("breakfast");

  const breakfastItems = [
    { name: "Mont Hin Gar", price: 40 },
    { name: "Ohn Noh Kyout Swal", price: 40 },
    { name: "Shan Noodles", price: 50 },
    { name: "Mandalay Mont Ti", price: 55 },
  ];

  return (
    <div className="bg-pink-100 min-h-screen p-4">
      <h1 className="text-xl font-bold mb-4">Food Menu</h1>

      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          className={`p-2 rounded-lg ${tab === "breakfast" ? "bg-pink-400 text-white" : "bg-white"}`}
          onClick={() => setTab("breakfast")}
        >
          Breakfast
        </button>
        <button
          className={`p-2 rounded-lg ${tab === "lunch" ? "bg-pink-400 text-white" : "bg-white"}`}
          onClick={() => setTab("lunch")}
        >
          Lunch
        </button>
        <button
          className={`p-2 rounded-lg ${tab === "dinner" ? "bg-pink-400 text-white" : "bg-white"}`}
          onClick={() => setTab("dinner")}
        >
          Dinner
        </button>
      </div>

      {/* Menu List */}
      <div className="space-y-4">
        {breakfastItems.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow flex justify-between">
            <div>
              <h2 className="font-semibold">{item.name}</h2>
              <p className="text-sm">{item.price} Baht</p>
            </div>
            <div className="flex items-center">
              <button className="px-2 py-1 bg-gray-200 rounded">-</button>
              <span className="px-3">0</span>
              <button className="px-2 py-1 bg-gray-200 rounded">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
