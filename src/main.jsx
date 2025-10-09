import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- required to load Tailwind
import { CartProvider } from "./context/CartContext";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { DarkModeProvider } from "./pages/DarkModeContext.jsx"; // 👈 import
import { TableProvider } from "./context/TableContext"; 
import { AuthProvider } from "./context/AuthContext.jsx";


ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
  //   <CartProvider>
  //     <App />
  //   </CartProvider>
  // </React.StrictMode>
  <AuthProvider>            {/* 👈 Add this */}
    <TableProvider>  
      <CartProvider>
        <DarkModeProvider>
          <App />
        </DarkModeProvider>
      </CartProvider>
    </TableProvider>
  </AuthProvider>
);

