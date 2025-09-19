// Modal.jsx
import React from "react";

export default function Modal({ isOpen, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="mb-6">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          OK
        </button>
      </div>
    </div>
  );
}
