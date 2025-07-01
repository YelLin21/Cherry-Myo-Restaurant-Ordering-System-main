// import { useState } from "react";
// import { Link } from "react-router-dom";
// import { Menu, X } from "lucide-react"; // Optional: Use any icon library

// export default function Navbar() {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <nav className="p-2 shadow-lg fixed top-0 left-0 w-full z-50" style={{ backgroundColor: "#FFC0CB" }}>
//       <div className="container mx-auto flex justify-between items-center">
//         <div className="flex items-center gap-4">
//           <img
//             src="/image/cherry_myo.png"
//             alt="Cherry Myo Logo"
//             className="w-16 h-16 sm:w-20 sm:h-20 rounded-full"
//           />
//           <h1 className="text-xl sm:text-2xl font-bold text-pink-900">Cherry Myo</h1>
//         </div>

//         {/* Desktop Menu */}
//         <div className="hidden md:flex space-x-4">
//           <Link to="/" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
//             Home
//           </Link>
//           <Link to="/food" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
//             Food Menu
//           </Link>
//           <Link to="/grill" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
//             Grill
//           </Link>
//           <Link to="/beverages" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
//             Beverage
//           </Link>
//         </div>

//         {/* Mobile Menu Button */}
//         <button
//           onClick={() => setIsOpen(!isOpen)}
//           className="md:hidden text-pink-900"
//         >
//           {isOpen ? <X size={30} /> : <Menu size={30} />}
//         </button>
//       </div>

//       {/* Mobile Dropdown Menu */}
//       {isOpen && (
//         <div className="md:hidden bg-pink-100 px-4 pt-2 pb-4 space-y-2">
//           <Link to="/" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
//             Home
//           </Link>
//           <Link to="/food" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
//             Food Menu
//           </Link>
//           <Link to="/grill" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
//             Grill
//           </Link>
//           <Link to="/beverages" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
//             Beverage
//           </Link>
//         </div>
//       )}
//     </nav>
//   );
// }


import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { FaShoppingCart, FaSun, FaMoon } from "react-icons/fa";

export default function Navbar({ darkMode, setDarkMode, cartCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav
      className={`p-2 shadow-lg fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        darkMode ? "bg-gray-800 text-white" : "bg-pink-200 text-pink-900"
      }`}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and title */}
        <div className="flex items-center gap-4">
          <img
            src="/image/cherry_myo.png"
            alt="Cherry Myo Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full"
          />
          <h1 className="text-xl sm:text-2xl font-bold">Cherry Myo</h1>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/" className="hover:bg-pink-400/50 px-3 py-2 rounded-md">
            Home
          </Link>
          <Link to="/food" className="hover:bg-pink-400/50 px-3 py-2 rounded-md">
            Food Menu
          </Link>
          <Link to="/grill" className="hover:bg-pink-400/50 px-3 py-2 rounded-md">
            Grill
          </Link>
          <Link to="/beverages" className="hover:bg-pink-400/50 px-3 py-2 rounded-md">
            Beverage
          </Link>

          {/* Dark Mode Toggle */}
          <button onClick={() => setDarkMode(!darkMode)} className="text-xl hover:text-yellow-300">
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          {/* Cart */}
          <div
            className="relative cursor-pointer hover:text-pink-500 transition"
            onClick={() => navigate("/cart")}
          >
            <FaShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
          {isOpen ? <X size={30} /> : <Menu size={30} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className={`md:hidden px-4 pt-2 pb-4 space-y-2 transition-all duration-300 ${
          darkMode ? "bg-gray-700 text-white" : "bg-pink-100 text-pink-900"
        }`}>
          <Link to="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-pink-300">
            Home
          </Link>
          <Link to="/food" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-pink-300">
            Food Menu
          </Link>
          <Link to="/grill" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-pink-300">
            Grill
          </Link>
          <Link to="/beverages" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-pink-300">
            Beverage
          </Link>

          {/* Dark Mode Toggle */}
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-2 px-3 py-2 hover:bg-pink-300 rounded-md">
            {darkMode ? <FaSun /> : <FaMoon />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* Cart */}
          <div
            onClick={() => {
              navigate("/cart");
              setIsOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer px-3 py-2 hover:bg-pink-300 rounded-md"
          >
            <FaShoppingCart />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="ml-auto bg-black text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
