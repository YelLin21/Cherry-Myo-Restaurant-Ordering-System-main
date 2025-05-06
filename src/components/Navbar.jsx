import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="p-2 shadow-lg fixed top-0 left-0 w-full z-50" style={{ backgroundColor: "#FFC0CB" }}>
      <div className="container mx-auto flex justify-between items-center">
        {/* Changed this div to use flex */}
        <div className="flex items-center gap-4">
          <img
            src="src/image/cherry_myo.png"
            alt="Cherry Myo Logo"
            className="w-20 h-20 rounded-full"
          />
          <h1 className="text-2xl font-bold text-pink-900">Cherry Myo</h1>
        </div>
        
        <div className="space-x-4">
          {/* Changed href to 'to' for React Router Links */}
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
      </div>
    </nav>
  );
}