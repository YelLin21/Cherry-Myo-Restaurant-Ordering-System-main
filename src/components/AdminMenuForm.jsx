import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";

export default function AdminMenuForm({
  onAdd,
  onUpdate,
  editingItem,
  clearEdit,
  activeTab,
  isOpen,
  onClose,
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // Clear form when activeTab changes
  useEffect(() => {
    if (!editingItem) {
      clearForm();
    }
  }, [activeTab]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setPrice(editingItem.price);
      setImage(editingItem.image);
    } else {
      clearForm();
    }
  }, [editingItem]);

  const clearForm = () => {
    setName("");
    setPrice("");
    setImage("");
    setImageFile(null);
  };

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

    // Clear form and close modal
    clearForm();
    clearEdit();
    onClose();
  };

  const handleClose = () => {
    clearForm();
    clearEdit();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingItem ? "Edit Menu Item" : `Add to ${activeTab}`}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Food Name
              </label>
              <input
                type="text"
                placeholder="Enter food name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                placeholder="Enter price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL (optional)
              </label>
              <input
                type="text"
                placeholder="Enter image URL"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            {imageFile && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className="w-full max-h-48 object-cover rounded-lg border"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 bg-pink-700 text-white py-3 px-4 rounded-lg hover:bg-pink-800 transition-colors font-medium"
              >
                {editingItem ? "Update Item" : "Add Item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
