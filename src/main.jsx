import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- required to load Tailwind
import { CartProvider } from "./context/CartContext";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { DarkModeProvider } from "./pages/DarkModeContext.jsx"; // 👈 import



ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
  //   <CartProvider>
  //     <App />
  //   </CartProvider>
  // </React.StrictMode>
  <CartProvider>
    <DarkModeProvider>
        <App />
      </DarkModeProvider>
  </CartProvider>
);

