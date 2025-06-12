import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";

export default function AdminMenuForm({
  onAdd,
  onUpdate,
  editingItem,
  clearEdit,
  activeTab,
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setPrice(editingItem.price);
      setImage(editingItem.image);
    }
  }, [editingItem]);

  const uploadImageToSupabase = async () => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `menu-images/${fileName}`;

    const { error } = await supabase.storage
      .from("menu-images")
      .upload(filePath, imageFile);

    if (error) {
      console.error("Image upload error:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !price || (!imageFile && !image)) {
      alert("Please fill in both name and price and image url or image.");
      return;
    }
    
    let finalImageUrl = image;

    if (imageFile) {
      const uploadedUrl = await uploadImageToSupabase();
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        console.error("Failed to upload image.");
        return;
      }
    }

    const item = {
      name,
      price: parseFloat(price),
      image: finalImageUrl,
      category: activeTab, 
    };

    if (editingItem) {
      onUpdate({ ...item, _id: editingItem._id, category: editingItem.category });
    } else {
      onAdd({ ...item, category: activeTab });
    }

    // Clear form
    setName("");
    setPrice("");
    setImage("");
    setImageFile(null);
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
          placeholder="Image URL (optional)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />
        {imageFile && (
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
              marginTop: 8,
            }}
          />
        )}

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
