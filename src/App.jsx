import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import FoodMenuPage from "./pages/FoodMenuPage";
import GrillMenuPage from "./pages/GrillMenuPage";
import BeveragePage from "./pages/BeveragePage";
import SpecialMenuPage from "./pages/SpecialMenuPage";
import PromotionMenuPage from "./pages/PromotionMenuPage";
import CartPage from "./pages/CartPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import AdminPage from "./pages/AdminPage";
import AdminSpecialMenuPage from "./pages/AdminSpecialMenuPage";
import AdminPromotionMenuPage from "./pages/AdminPromotionMenuPage";
import AdminSalesReport from "./pages/AdminSalesReport";
import KitchenPage from "./pages/KitchenPage";
import AdminCheckoutPage from "./pages/AdminCheckout"; 
import TableViewPage from "./pages/TableView";
import WaiterPage from "./pages/WaiterPage";
import { useDarkMode } from "./pages/DarkModeContext.jsx";
import FeedbackPage from "./pages/FeedbackPage.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const { darkMode } = useDarkMode();
  
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/food" element={<FoodMenuPage />} />
          <Route path="/grill" element={<GrillMenuPage />} />
          <Route path="/beverages" element={<BeveragePage />} />
          <Route path="/special" element={<SpecialMenuPage />} />
          <Route path="/promotion" element={<PromotionMenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/cart/:tableId" element={<CartPage />} />
          <Route path="/order-history" element={<OrderHistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/special" element={<AdminSpecialMenuPage />} />
          <Route path="/admin/promotion" element={<AdminPromotionMenuPage />} />
          <Route path="/admin/sales-report" element={<AdminSalesReport darkMode={darkMode} />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/waiter" element={<WaiterPage />} />
          <Route path="/checkout" element={<AdminCheckoutPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/table/:tableId" element={<TableViewPage />} />
        </Routes>
      </Router>

      {/* Toast notifications container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </>
  );
}

export default App;
