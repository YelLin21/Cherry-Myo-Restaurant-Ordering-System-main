import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { useDarkMode } from "./DarkModeContext.jsx";
import { useTable } from "../context/TableContext";
import { useCart } from "../context/CartContext";

const APIBASE = import.meta.env.VITE_API_URL;

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { darkMode, setDarkMode } = useDarkMode();
  const { tableId } = useTable();
  const { totalItems } = useCart();
  
  const cartCount = totalItems || 0;

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    console.log("FeedbackPage - Dark mode:", darkMode); // Debug log
  }, [darkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${APIBASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, comment, tableId }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      setSuccess("✅ Thank you for your feedback!");
      setName("");
      setRating(5);
      setComment("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pt-[150px] transition-all duration-300 ${
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={cartCount} />

      <div className={`max-w-md mx-auto p-6 rounded-2xl shadow-xl transition-all duration-300 ${
        darkMode 
          ? "bg-gray-800 border border-gray-700 shadow-2xl" 
          : "bg-white shadow-lg"
      }`}>
        <h2 className={`text-2xl font-bold text-center mb-6 transition-colors duration-300 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}>
          💬 Leave Feedback
        </h2>

        {success && (
          <div className={`text-center mb-4 p-3 rounded-lg transition-all duration-300 ${
            darkMode 
              ? "text-green-400 bg-green-900/30 border border-green-700" 
              : "text-green-600 bg-green-50 border border-green-200"
          }`}>
            {success}
          </div>
        )}
        
        {error && (
          <div className={`text-center mb-4 p-3 rounded-lg transition-all duration-300 ${
            darkMode 
              ? "text-red-400 bg-red-900/30 border border-red-700" 
              : "text-red-600 bg-red-50 border border-red-200"
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              👤 Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-650" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 hover:border-gray-400"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              ⭐ Rating
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-650" 
                  : "bg-white border-gray-300 text-gray-900 hover:border-gray-400"
              }`}
            >
              <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
              <option value={4}>⭐⭐⭐⭐ Good</option>
              <option value={3}>⭐⭐⭐ Average</option>
              <option value={2}>⭐⭐ Poor</option>
              <option value={1}>⭐ Very Bad</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              💭 Your Comment
            </label>
            <textarea
              placeholder="Share your experience with us..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none transition-all duration-300 ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-650" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 hover:border-gray-400"
              }`}
              rows="4"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
              darkMode
                ? "bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white shadow-lg hover:shadow-pink-500/25"
                : "bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-lg hover:shadow-pink-500/25"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </div>
            ) : (
              "🚀 Submit Feedback"
            )}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm transition-colors duration-300 ${
          darkMode ? "text-gray-400" : "text-gray-500"
        }`}>
          Your feedback helps us improve our service! 🙏
        </div>
      </div>
    </div>
  );
}
