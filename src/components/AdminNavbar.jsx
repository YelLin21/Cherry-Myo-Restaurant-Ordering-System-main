import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { FaSun, FaMoon, FaHome, FaCog, FaUtensils, FaStar, FaGift, FaConciergeBell, FaCashRegister } from "react-icons/fa";
import { useDarkMode } from "../pages/DarkModeContext.jsx";

export default function AdminNavbar() {
  const { darkMode, setDarkMode } = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const adminMenuItems = [
    {
      title: "Dashboard",
      path: "/admin",
      icon: <FaCog className="w-4 h-4" />,
      description: "Main Admin Panel"
    },
    {
      title: "Special Menu",
      path: "/admin/special",
      icon: <FaStar className="w-4 h-4" />,
      description: "Manage Special Items"
    },
    {
      title: "Promotion Menu",
      path: "/admin/promotion",
      icon: <FaGift className="w-4 h-4" />,
      description: "Manage Promotions"
    },
    {
      title: "Kitchen Orders",
      path: "/kitchen",
      icon: <FaConciergeBell className="w-4 h-4" />,
      description: "Kitchen Management"
    },
    {
      title: "Checkout",
      path: "/checkout",
      icon: <FaCashRegister className="w-4 h-4" />,
      description: "Payment Processing"
    }
  ];

  return (
    <nav
      className={`shadow-lg fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        darkMode 
          ? "bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white border-b border-red-700" 
          : "bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white border-b border-pink-400"
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        background: darkMode 
          ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)' 
          : 'linear-gradient(135deg, #dc2626 0%, #ec4899 25%, #f43f5e 50%, #ec4899 75%, #dc2626 100%)'
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Admin Title */}
          <div className="flex items-center gap-4">
            <img
              src="/image/cherry_myo.png"
              alt="Cherry Myo Logo"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-lg"
            />
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">
                Cherry Myo Admin
              </h1>
              <p className="text-xs sm:text-sm text-red-200 hidden sm:block">
                Restaurant Management System
              </p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-2">
            {adminMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  isActivePath(item.path)
                    ? darkMode
                      ? "bg-red-800 text-yellow-300 shadow-lg transform scale-105"
                      : "bg-white/20 text-yellow-200 shadow-lg transform scale-105"
                    : darkMode
                      ? "text-red-300 hover:bg-red-800 hover:text-white"
                      : "text-red-100 hover:bg-white/20 hover:text-white"
                }`}
                title={item.description}
              >
                {item.icon}
                <span className="hidden xl:block">{item.title}</span>
              </Link>
            ))}
            
            {/* Return to Customer Site */}
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm border-2 ${
                darkMode
                  ? "border-red-600 text-red-300 hover:bg-red-800 hover:text-white hover:border-red-500"
                  : "border-red-300 text-red-100 hover:bg-white/20 hover:text-white hover:border-red-200"
              }`}
            >
              <FaHome className="w-4 h-4" />
              <span className="hidden xl:block">Customer Site</span>
            </Link>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-lg ${
                darkMode
                  ? "text-yellow-300 hover:bg-red-800 hover:text-yellow-200"
                  : "text-yellow-200 hover:bg-white/20 hover:text-yellow-100"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className={`lg:hidden p-2 rounded-md transition-all duration-200 ${
              darkMode
                ? "text-white hover:bg-red-800"
                : "text-white hover:bg-white/20"
            }`}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isOpen && (
          <div 
            className={`lg:hidden mt-4 pb-4 space-y-2 transition-all duration-300 border-t ${
              darkMode 
                ? "border-red-700" 
                : "border-red-400"
            }`}
            style={{
              backdropFilter: 'blur(10px)',
            }}
          >
            {adminMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActivePath(item.path)
                    ? darkMode
                      ? "bg-red-800 text-yellow-300 shadow-lg"
                      : "bg-white/20 text-yellow-200 shadow-lg"
                    : darkMode
                      ? "text-red-300 hover:bg-red-800"
                      : "text-red-100 hover:bg-white/20"
                }`}
              >
                {item.icon}
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs opacity-75">{item.description}</span>
                </div>
              </Link>
            ))}

            {/* Mobile Return to Customer Site */}
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-2 border-dashed ${
                darkMode
                  ? "border-red-600 text-red-300 hover:bg-red-800"
                  : "border-red-300 text-red-100 hover:bg-white/20"
              }`}
            >
              <FaHome className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="font-medium">Customer Site</span>
                <span className="text-xs opacity-75">Return to main website</span>
              </div>
            </Link>

            {/* Mobile Dark Mode Toggle */}
            <button 
              onClick={() => {
                setDarkMode(!darkMode);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                darkMode
                  ? "text-yellow-300 hover:bg-red-800"
                  : "text-yellow-200 hover:bg-white/20"
              }`}
            >
              {darkMode ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
              <div className="flex flex-col items-start">
                <span className="font-medium">
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </span>
                <span className="text-xs opacity-75">
                  Switch theme
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
