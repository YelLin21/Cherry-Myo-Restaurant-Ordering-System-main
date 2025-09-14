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

  const [feedbackList, setFeedbackList] = useState([]);
  const [fetching, setFetching] = useState(false);

  const { darkMode, setDarkMode } = useDarkMode();
  const { tableId } = useTable();
  const { totalItems } = useCart();
  
  const cartCount = totalItems || 0;

  // Toggle dark mode class
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${APIBASE}/feedback`);
      if (!res.ok) throw new Error("Failed to fetch feedbacks");
      const data = await res.json();
      setFeedbackList(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

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
      fetchFeedbacks(); // refresh list
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: render stars
  const renderStars = (count) => "⭐".repeat(count);

  return (
    <div
      className={`min-h-screen pt-[150px] transition-all duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}
    >
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} cartCount={cartCount} />

      <div
        className={`max-w-2xl mx-auto p-6 rounded-2xl shadow-xl transition-all duration-300 ${
          darkMode
            ? "bg-gray-800 border border-gray-700 shadow-2xl"
            : "bg-white shadow-lg"
        }`}
      >
        <h2
          className={`text-2xl font-bold text-center mb-6 transition-colors duration-300 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          💬 Leave Feedback
        </h2>

        {/* Success / Error */}
        {success && (
          <div
            className={`text-center mb-4 p-3 rounded-lg transition-all duration-300 ${
              darkMode
                ? "text-green-400 bg-green-900/30 border border-green-700"
                : "text-green-600 bg-green-50 border border-green-200"
            }`}
          >
            {success}
          </div>
        )}
        {error && (
          <div
            className={`text-center mb-4 p-3 rounded-lg transition-all duration-300 ${
              darkMode
                ? "text-red-400 bg-red-900/30 border border-red-700"
                : "text-red-600 bg-red-50 border border-red-200"
            }`}
          >
            {error}
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              👤 Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all duration-300 ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              ⭐ Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform duration-200 ${
                    star <= rating
                      ? "text-yellow-400 hover:scale-110"
                      : darkMode
                        ? "text-gray-600 hover:text-yellow-400 hover:scale-110"
                        : "text-gray-300 hover:text-yellow-400 hover:scale-110"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p
              className={`mt-1 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {rating === 5
                ? "Excellent!"
                : rating === 4
                ? "Good!"
                : rating === 3
                ? "Average"
                : rating === 2
                ? "Poor"
                : "Very Bad"}
            </p>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              💭 Your Comment
            </label>
            <textarea
              placeholder="Share your experience with us..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none transition-all duration-300 ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
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
      </div>

      {/* Feedback List */}
      <div className="max-w-3xl mx-auto mt-10 px-6">
        <h3
          className={`text-xl font-bold mb-6 transition-colors duration-300 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          🌟 What Others Say
        </h3>

        {fetching ? (
          <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
            Loading feedbacks...
          </p>
        ) : feedbackList.length === 0 ? (
          <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
            No feedback yet. Be the first! 🚀
          </p>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((fb) => (
              <div
                key={fb.id}
                className={`p-5 rounded-xl shadow-md transition-all duration-300 ${
                  darkMode
                    ? "bg-gray-800 border border-gray-700 hover:bg-gray-750"
                    : "bg-white border border-gray-200 hover:shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                      darkMode ? "bg-pink-600 text-white" : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    {fb.name?.[0]?.toUpperCase() || "👤"}
                  </div>
                  <div>
                    <p
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {fb.name || "Anonymous"}
                    </p>
                    <p className="text-yellow-500 text-sm">
                      {renderStars(fb.rating)}
                    </p>
                  </div>
                </div>
                <p
                  className={`italic ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  "{fb.comment}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
