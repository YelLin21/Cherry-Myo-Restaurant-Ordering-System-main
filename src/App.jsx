import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import FoodMenuPage from "./pages/FoodMenuPage";
import GrillMenuPage from "./pages/GrillMenuPage";
import BeveragePage from "./pages/BeveragePage";
import CartPage from "./pages/CartPage";
import AdminPage from "./pages/AdminPage";
import KitchenPage from "./pages/KitchenPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/food" element={<FoodMenuPage />} />
        <Route path="/grill" element={<GrillMenuPage />} />
        <Route path="/beverages" element={<BeveragePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
      </Routes>
    </Router>
  );
}

export default App;

