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
        darkMode 
          ? "bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white" 
          : "bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white"
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        background: darkMode 
          ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)' 
          : 'linear-gradient(135deg, #dc2626 0%, #ec4899 25%, #f43f5e 50%, #ec4899 75%, #dc2626 100%)'
      }}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and title */}
        <div className="flex items-center gap-4">
          <img
            src="/image/cherry_myo.png"
            alt="Cherry Myo Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white shadow-lg"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Cherry Myo</h1>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/" className="text-white hover:bg-white/20 hover:text-red-100 px-3 py-2 rounded-md transition-all duration-200 font-medium">
            Home
          </Link>
          <Link to="/food" className="text-white hover:bg-white/20 hover:text-red-100 px-3 py-2 rounded-md transition-all duration-200 font-medium">
            Food Menu
          </Link>
          <Link to="/grill" className="text-white hover:bg-white/20 hover:text-red-100 px-3 py-2 rounded-md transition-all duration-200 font-medium">
            Grill
          </Link>
          <Link to="/beverages" className="text-white hover:bg-white/20 hover:text-red-100 px-3 py-2 rounded-md transition-all duration-200 font-medium">
            Beverage
          </Link>
          <Link to="/order-history" className="text-white hover:bg-white/20 hover:text-red-100 px-3 py-2 rounded-md transition-all duration-200 font-medium">
            Order History
          </Link>

          {/* Dark Mode Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="text-xl hover:text-yellow-300 hover:bg-white/20 p-2 rounded-md transition-all duration-200"
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          {/* Cart */}
          <div
            className="relative cursor-pointer hover:text-yellow-300 hover:bg-white/20 p-2 rounded-md transition-all duration-200"
            onClick={() => navigate("/cart")}
          >
            <FaShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-800 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white">
                {cartCount}
              </span>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="md:hidden text-white hover:bg-white/20 p-2 rounded-md transition-all duration-200"
        >
          {isOpen ? <X size={30} /> : <Menu size={30} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div 
          className={`md:hidden px-4 pt-2 pb-4 space-y-2 transition-all duration-300 ${
            darkMode 
              ? "bg-red-900/95 text-white border-t border-red-700" 
              : "bg-red-600/95 text-white border-t border-red-400"
          }`}
          style={{
            backdropFilter: 'blur(10px)',
            background: darkMode 
              ? 'rgba(127, 29, 29, 0.95)' 
              : 'rgba(220, 38, 38, 0.95)'
          }}
        >
          <Link to="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-white/20 transition-all duration-200">
            Home
          </Link>
          <Link to="/food" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-white/20 transition-all duration-200">
            Food Menu
          </Link>
          <Link to="/grill" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-white/20 transition-all duration-200">
            Grill
          </Link>
          <Link to="/beverages" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-white/20 transition-all duration-200">
            Beverage
          </Link>
          <Link to="/order-history" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md hover:bg-white/20 transition-all duration-200">
            Order History
          </Link>

          {/* Dark Mode Toggle */}
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-2 px-3 py-2 hover:bg-white/20 rounded-md transition-all duration-200">
            {darkMode ? <FaSun /> : <FaMoon />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* Cart */}
          <div
            onClick={() => {
              navigate("/cart");
              setIsOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer px-3 py-2 hover:bg-white/20 rounded-md transition-all duration-200"
          >
            <FaShoppingCart />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="ml-auto bg-yellow-400 text-red-800 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
