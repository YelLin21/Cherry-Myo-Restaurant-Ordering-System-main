import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import Navbar from "../components/Navbar.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(2);
  const [searchTerm, setSearchTerm] = useState("");
  const { darkMode, setDarkMode } = useDarkMode();

  const categories = [
    {
      title: "Foods",
      subtitle: "Order what you love",
      img: "/image/food menu.jpg",
      icon: "🍱",
      route: "/food",
    },
    {
      title: "Grill",
      subtitle: "Fire up the flavor",
      img: "/image/grill.jpg",
      icon: "🔥",
      route: "/grill",
    },
    {
      title: "Beverages",
      subtitle: "Choose what you drink",
      img: "/image/tea.jpg",
      icon: "🍵",
      route: "/beverages",
    },
    {
      title: "Promotion",
      subtitle: "Today's special",
      img: "/image/promotion.jpg",
      icon: "🎁",
    },
  ];

  const sliderImages = [
    "/image/slider-three.jpg",
    "/image/slider-one.jpg",
    "/image/slider-two.jpg",
  ];

  const filteredCategories = categories.filter((item) =>
    `${item.title} ${item.subtitle}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div
      className={`min-h-screen font-sans transition duration-300 ${
        darkMode
          ? "bg-gray-900 text-white"
          : "bg-gradient-to-b from-pink-100 via-rose-200 to-red-50 text-gray-800"
      }`}
    >
      {/* ✅ Use Navbar with props */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        cartCount={cartCount}
      />

      {/* SLIDER + SEARCH */}
      <div className="relative pt-24"> {/* Add pt-24 to avoid overlap with fixed navbar */}
        <Slider
          autoplay
          autoplaySpeed={4000}
          infinite
          arrows={false}
          dots
          pauseOnHover
          className="relative h-64 sm:h-80 md:h-[28rem] lg:h-[32rem] overflow-hidden"
        >
          {sliderImages.map((img, index) => (
            <div key={index}>
              <img
                src={img}
                alt={`Slide ${index + 1}`}
                className="w-full h-64 sm:h-80 md:h-[28rem] lg:h-[32rem] object-cover"
              />
            </div>
          ))}
        </Slider>

        {/* Search bar */}
        <div className="absolute top-[70%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full px-4 md:px-0 z-10">
          <div className="max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search your favorite..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-3 rounded-full border border-rose-300 shadow-lg bg-white text-gray-700 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
        </div>
      </div>

      {/* CATEGORY MENU */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10 tracking-wide">
          {darkMode ? "Browse Cherry Delights" : "Explore Our Menu"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((item, index) => (
              <div
                key={index}
                onClick={() => item.route && navigate(item.route)}
                className="relative cursor-pointer bg-pink-600 dark:bg-pink-600 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="h-48 w-full object-cover"
                />
                <div className="absolute top-0 left-0 bg-gradient-to-br from-rose-500/80 to-pink-400/60 text-white px-3 py-1 rounded-br-xl shadow-sm">
                  <span className="text-lg">{item.icon}</span>
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-200 dark:text-gray-300">{item.subtitle}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
              No results found.
            </p>
          )}
        </div>

        {/* Falling Blossoms */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="animate-blossom absolute top-[-10%] left-[10%] text-pink-400 text-2xl">🌸</div>
          <div className="animate-blossom delay-1000 absolute top-[-10%] left-[20%] text-rose-400 text-3xl">🌸</div>
          <div className="animate-blossom delay-2000 absolute top-[-10%] left-[30%] text-pink-300 text-xl">🌸</div>
          <div className="animate-blossom delay-3000 absolute top-[-10%] left-[40%] text-pink-400 text-4xl">🌸</div>
          <div className="animate-blossom delay-4000 absolute top-[-10%] left-[50%] text-rose-500 text-2xl">🌸</div>
          <div className="animate-blossom delay-5000 absolute top-[-10%] left-[60%] text-pink-200 text-3xl">🌸</div>
          <div className="animate-blossom delay-6000 absolute top-[-10%] left-[70%] text-pink-300 text-xl">🌸</div>
          <div className="animate-blossom delay-7000 absolute top-[-10%] left-[80%] text-rose-300 text-4xl">🌸</div>
          <div className="animate-blossom delay-8000 absolute top-[-10%] left-[90%] text-pink-400 text-2xl">🌸</div>
        </div>
      </div>
    </div>
  );
}
