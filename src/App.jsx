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
import KitchenPage from "./pages/KitchenPage";
import AdminCheckoutPage from "./pages/AdminCheckout"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/food" element={<FoodMenuPage />} />
        <Route path="/grill" element={<GrillMenuPage />} />
        <Route path="/beverages" element={<BeveragePage />} />
        <Route path="/special" element={<SpecialMenuPage />} />
        <Route path="/promotion" element={<PromotionMenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order-history" element={<OrderHistoryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/special" element={<AdminSpecialMenuPage />} />
        <Route path="/admin/promotion" element={<AdminPromotionMenuPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/checkout" element={<AdminCheckoutPage />} />
      </Routes>
    </Router>
  );
}

export default App;

