export default function AdminMenuList({ items, onDelete, onEdit, darkMode }) {
  if (!items.length) {
    return (
      <p className={`text-center italic mt-4 ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        No menu items in this category.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div
          key={item._id}
          className={`flex items-center justify-between p-4 rounded shadow-lg transition-all duration-300 ${
            darkMode 
              ? 'bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600' 
              : 'bg-gradient-to-r from-pink-100 to-pink-200 border border-pink-300'
          }`}
        >
          <div className="flex items-center space-x-4">
            {item.image &&
            <img
              src={item.image}
              alt={item.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/100x100?text=No+Image";
              }}
              className="w-20 h-20 object-cover rounded shadow-md"
            />
            }

            <div>
              <h3 className={`font-semibold text-lg ${
                darkMode ? 'text-pink-300' : 'text-gray-800'
              }`}>
                {item.name}
              </h3>
              <p className={`font-medium ${
                darkMode ? 'text-green-400' : 'text-gray-700'
              }`}>
                {item.price} Kyat
              </p>
              <p className={`text-sm italic ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Category: {item.category || "Uncategorized"}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(item)}
              className={`px-3 py-1 rounded font-medium transition-colors duration-200 ${
                darkMode 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-500' 
                  : 'bg-yellow-400 text-white hover:bg-yellow-500'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this item?")) {
                  onDelete(item._id);
                }
              }}
              className={`px-3 py-1 rounded font-medium transition-colors duration-200 ${
                darkMode 
                  ? 'bg-red-600 text-white hover:bg-red-500' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
