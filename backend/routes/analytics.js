import express from "express";
import Order from "../models/Order.js";
import Menu from "../models/Menu.js";
const router = express.Router();

// Clear all data endpoint (for testing)
router.delete("/clear-data", async (req, res) => {
  try {
    await Order.deleteMany({});
    console.log(" All orders cleared from database");
    res.json({ message: "All data cleared successfully" });
  } catch (error) {
    console.error("Error clearing data:", error);
    res.status(500).json({ error: "Failed to clear data" });
  }
});

// Helper function to get date range based on period
const getDateRange = (period, startDate = null, endDate = null) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Handle custom date range
  if (period === "Custom" && startDate && endDate) {
    const customStart = new Date(startDate);
    const customEnd = new Date(endDate);
    // Set end date to end of day
    customEnd.setHours(23, 59, 59, 999);
    
    // Calculate previous period (same duration, shifted back)
    const duration = customEnd.getTime() - customStart.getTime();
    const prevEnd = new Date(customStart.getTime());
    const prevStart = new Date(customStart.getTime() - duration);
    
    return {
      current: {
        start: customStart,
        end: customEnd,
      },
      previous: {
        start: prevStart,
        end: prevEnd,
      },
    };
  }

  switch (period) {
    case "Daily":
      return {
        current: {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        previous: {
          start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          end: today,
        },
      };
    case "Weekly":
      const weekStart = new Date(
        today.getTime() - today.getDay() * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      return {
        current: { start: weekStart, end: weekEnd },
        previous: {
          start: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: weekStart,
        },
      };
    case "Monthly":
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return {
        current: { start: monthStart, end: monthEnd },
        previous: {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: monthStart,
        },
      };
    case "Yearly":
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
      return {
        current: { start: yearStart, end: yearEnd },
        previous: {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: yearStart,
        },
      };
    default:
      return {
        current: {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        previous: {
          start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          end: today,
        },
      };
  }
};

// GET /analytics/dashboard - Get dashboard analytics
router.get("/dashboard", async (req, res) => {
  try {
    const { period = "Daily", startDate, endDate } = req.query;
    const dateRange = getDateRange(period, startDate, endDate);

    // Get current period data
    const currentOrders = await Order.find({
      createdAt: {
        $gte: dateRange.current.start,
        $lt: dateRange.current.end,
      },
    });

    // Get previous period data for comparison
    const previousOrders = await Order.find({
      createdAt: {
        $gte: dateRange.previous.start,
        $lt: dateRange.previous.end,
      },
    });

    // Calculate KPIs
    const currentStats = calculateStats(currentOrders);
    const previousStats = calculateStats(previousOrders);

    // Get best sellers
    const bestSellers = await getBestSellers(dateRange.current);

    // Get sales over time
    const salesOverTime = await getSalesOverTime(dateRange.current, period);

    // Get top items
    const topItems = await getTopItems(dateRange.current);

    // Get revenue by category
    const revenueByCategory = await getRevenueByCategory(dateRange.current);

    res.json({
      kpi: currentStats,
      periodComparison: {
        current: currentStats,
        previous: previousStats,
      },
      bestSellers,
      salesOverTime,
      topItems,
      revenueByCategory,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
});

// Helper function to calculate stats
const calculateStats = (orders) => {
  const totalOrders = orders.length;
  const totalItems = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (itemSum, item) => itemSum + item.price * item.quantity,
        0
      ),
    0
  );
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    orders: totalOrders,
    items: totalItems,
    revenue: Math.round(totalRevenue),
    aov: Math.round(aov),
  };
};

// Get best selling items
const getBestSellers = async (dateRange) => {
   const orders = await Order.find({
    createdAt: { $gte: dateRange.start, $lt: dateRange.end },
  });

  const itemCounts = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  return Object.entries(itemCounts)
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);
};

// Get sales over time
const getSalesOverTime = async (dateRange, period) => {
  const orders = await Order.find({
    createdAt: { $gte: dateRange.start, $lt: dateRange.end },
  });

  const salesByDate = {};

  orders.forEach((order) => {
    let dateKey;
    const orderDate = new Date(order.createdAt);

    switch (period) {
      case "Daily":
        dateKey = orderDate.toISOString().split("T")[0];
        break;
      case "Weekly":
        dateKey = `Week ${Math.ceil(orderDate.getDate() / 7)}`;
        break;
      case "Monthly":
        dateKey = orderDate.toISOString().split("T")[0].slice(0, 7);
        break;
      case "Yearly":
        dateKey = orderDate.getFullYear().toString();
        break;
      case "Custom":
        // For custom ranges, use daily granularity
        dateKey = orderDate.toISOString().split("T")[0];
        break;
      default:
        dateKey = orderDate.toISOString().split("T")[0];
    }

    if (!salesByDate[dateKey]) {
      salesByDate[dateKey] = 0;
    }

    const orderTotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    salesByDate[dateKey] += orderTotal;
  });

  return Object.entries(salesByDate)
    .map(([date, sales]) => ({ date, sales: Math.round(sales) }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Get top items by quantity sold
const getTopItems = async (dateRange) => {
  const orders = await Order.find({
    createdAt: { $gte: dateRange.start, $lt: dateRange.end },
  });

  const itemCounts = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  return Object.entries(itemCounts)
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);
};

// Get revenue by category
const getRevenueByCategory = async (dateRange) => {
  const orders = await Order.find({
    createdAt: { $gte: dateRange.start, $lt: dateRange.end },
  });

  // Get all menu items to map names to categories
  const menuItems = await Menu.find({});
  const itemCategoryMap = {};
  menuItems.forEach((item) => {
    itemCategoryMap[item.name] = item.category;
  });

  const categoryRevenue = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const category = itemCategoryMap[item.name] || "Other";
      if (!categoryRevenue[category]) {
        categoryRevenue[category] = 0;
      }
      categoryRevenue[category] += item.price * item.quantity;
    });
  });

  return Object.entries(categoryRevenue)
    .map(([category, value]) => ({ category, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
};

export default router;
