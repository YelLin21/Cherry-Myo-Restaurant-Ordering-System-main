export default function AdminMenuList({ items, onDelete, onEdit }) {
  if (!items.length) {
    return (
      <p className="text-center text-gray-500 italic mt-4">
        No menu items in this category.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div
          key={item._id}
          className="flex items-center justify-between p-4 rounded shadow"
          style={{ backgroundColor: "#FFC0CB" }}
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
              className="w-20 h-20 object-cover rounded"
            />
            }

            <div>
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-gray-700">{item.price} Kyat</p>
              <p className="text-sm text-gray-600 italic">
                Category: {item.category || "Uncategorized"}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(item)}
              className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this item?")) {
                  onDelete(item._id);
                }
              }}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
