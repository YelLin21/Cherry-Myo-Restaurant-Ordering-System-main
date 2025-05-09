import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react"; // Optional: Use any icon library

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="p-2 shadow-lg fixed top-0 left-0 w-full z-50" style={{ backgroundColor: "#FFC0CB" }}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img
            src="/image/cherry_myo.png"
            alt="Cherry Myo Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-pink-900">Cherry Myo</h1>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-4">
          <Link to="/" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
            Home
          </Link>
          <Link to="/food" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
            Food Menu
          </Link>
          <Link to="/grill" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
            Grill
          </Link>
          <Link to="/beverages" className="text-pink hover:bg-pink-500 px-3 py-2 rounded-md">
            Beverage
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-pink-900"
        >
          {isOpen ? <X size={30} /> : <Menu size={30} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden bg-pink-100 px-4 pt-2 pb-4 space-y-2">
          <Link to="/" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
            Home
          </Link>
          <Link to="/food" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
            Food Menu
          </Link>
          <Link to="/grill" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
            Grill
          </Link>
          <Link to="/beverages" onClick={() => setIsOpen(false)} className="block text-pink-900 hover:bg-pink-300 px-3 py-2 rounded-md">
            Beverage
          </Link>
        </div>
      )}
    </nav>
  );
}
