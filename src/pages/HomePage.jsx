import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShoppingCart } from "react-icons/fa";
import Slider from "react-slick"; 

export default function HomePage() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(2);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = [
    {
      title: "Foods",
      subtitle: "Order what you love",
      img: "/image/food menu.jpg",
      route: "/food",
    },
    {
      title: "Grill",
      subtitle: "Fire up the flavor",
      img: "/image/grill.jpg",
      route: "/grill",
    },
    {
      title: "Beverages",
      subtitle: "Choose what you drink",
      img: "/image/tea.jpg",
      route: "/beverages",
    },
    {
      title: "Promotion",
      subtitle: "Today's special",
      img: "/image/promotion.jpg",
    },
  ];

  const sliderImages = [
    "/image/slider-three.jpg",
    "/image/slider-one.jpg",
    "/image/slider-two.jpg",
  ];

  const filteredCategories = categories.filter((item) =>
    `${item.title} ${item.subtitle}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAVBAR */}
      <nav className="w-full bg-pink-700 px-6 py-6 flex justify-between items-center shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img
            src="/image/cherry_myo.png"
            alt="Logo"
            className="w-10 h-10 rounded-full"
          />
          <span className="text-white font-bold text-xl">Cherry Myo</span>
        </div>

        {/* Cart */}
        <div
          className="relative cursor-pointer text-white"
          onClick={() => navigate("/cart")}
        >
          <FaShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </div>
      </nav>

      <div className="relative">
        <Slider
          autoplay
          autoplaySpeed={4000}
          infinite
          arrows={false}
          dots
          pauseOnHover
          className="relative h-96 md:h-[28rem] lg:h-[32rem] overflow-hidden"
        >
          {sliderImages.map((img, index) => (
            <div key={index}>
              <div className="h-96 md:h-[28rem] lg:h-[32rem] relative">
                <img
                  src={img}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="w-full max-w-xl px-4">
                    <input
                      type="text"
                      placeholder="Search your favorite..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 rounded-full border border-pink-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white text-pink-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      <div className="py-10 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-pink-700 mb-6 text-center">
          Menu
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((item, index) => (
              <div
                key={index}
                onClick={() => item.route && navigate(item.route)}
                className="cursor-pointer bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition hover:scale-105"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="h-40 w-full object-cover"
                />
                <div className="p-3 text-center">
                  <h3 className="text-lg font-bold text-pink-700">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600">{item.subtitle}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
              No results found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
