import { useEffect, useState } from "react";

export default function AdminMenuForm({
  onAdd,
  onUpdate,
  editingItem,
  clearEdit,
  activeTab, // 👈 receive from parent
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setPrice(editingItem.price);
      setImage(editingItem.image);
    }
  }, [editingItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const item = {
      name,
      price: parseFloat(price),
      image,
    };

    if (editingItem) {
      onUpdate({ ...item, _id: editingItem._id, category: editingItem.category });
    } else {
      onAdd(item); // 👈 `category` is added in AdminPage
    }

    setName("");
    setPrice("");
    setImage("");
    clearEdit();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-4">
        {editingItem ? "Edit Menu Item" : `Add to ${activeTab}`}
      </h2>
      <div className="flex flex-col space-y-3">
        <input
          type="text"
          placeholder="Food Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="border p-2 rounded"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-pink-700 text-white py-2 px-4 rounded hover:bg-pink-800"
          >
            {editingItem ? "Update Item" : "Add Item"}
          </button>
          {editingItem && (
            <button
              type="button"
              onClick={clearEdit}
              className="bg-gray-300 text-black py-2 px-4 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
