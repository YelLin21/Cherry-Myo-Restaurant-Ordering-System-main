import { useState, useEffect } from "react";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import { Link } from "react-router-dom";

const TABS = ["Daily", "Weekly", "Monthly", "Yearly"];
const CHERRY_COLORS = ["#e11d48", "#f472b6", "#be185d", "#fbbf24", "#a21caf", "#f43f5e"];
const APIBASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function AdminSalesReport({ darkMode = false }) {
  const [activeTab, setActiveTab] = useState("Daily");
  const [kpi, setKpi] = useState({ orders: 0, items: 0, revenue: 0, aov: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [salesOverTime, setSalesOverTime] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [periodComparison, setPeriodComparison] = useState({
    prev: { orders: 0, revenue: 0 },
    curr: { orders: 0, revenue: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data from API
  const fetchAnalyticsData = async (period) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${APIBASE}/analytics/dashboard?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      
      setKpi(data.kpi);
      setBestSellers(data.bestSellers || []);
      setSalesOverTime(data.salesOverTime || []);
      setTopItems(data.topItems || []);
      setRevenueByCategory(data.revenueByCategory || []);
      setPeriodComparison(data.periodComparison || {
        prev: { orders: 0, revenue: 0 },
        curr: { orders: 0, revenue: 0 }
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error.message);
      // Set fallback data if API fails
      setKpi({ orders: 0, items: 0, revenue: 0, aov: 0 });
      setBestSellers([]);
      setSalesOverTime([]);
      setTopItems([]);
      setRevenueByCategory([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or active tab changes
  useEffect(() => {
    fetchAnalyticsData(activeTab);
  }, [activeTab]);

  // Export CSV with real data
  const csvData = bestSellers.length > 0 ? bestSellers : [
    { name: "No data available", sold: 0, revenue: 0 }
  ];

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Cherry Myo Sales Report - ${activeTab}`, 14, 16);
    
    // Add KPI summary
    doc.text(`Period: ${activeTab}`, 14, 26);
    doc.text(`Total Orders: ${kpi.orders}`, 14, 34);
    doc.text(`Total Revenue: K${kpi.revenue.toLocaleString()}`, 14, 42);
    doc.text(`Average Order Value: K${kpi.aov}`, 14, 50);
    
    // Add best sellers table
    if (bestSellers.length > 0) {
      doc.autoTable({
        head: [["Item Name", "Quantity Sold", "Revenue (K)"]],
        body: bestSellers.map((row) => [row.name, row.sold, row.revenue.toLocaleString()]),
        startY: 60,
      });
    }
    
    doc.save(`cherry_myo_sales_report_${activeTab.toLowerCase()}.pdf`);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-pink-50'}`}
      aria-label="Admin Sales Report"
    >
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/admin" 
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
              darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            } shadow-md`}
            aria-label="Back to Admin Panel"
          >
            <span className="text-lg">←</span>
            Back to Admin
          </Link>
          <span className="text-3xl">🍒</span>
          <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-pink-300' : 'text-pink-700'}`}>Sales Report</h1>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            disabled={loading}
            className={`px-4 py-2 rounded-full font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400 ${
              activeTab === tab
                ? darkMode
                  ? "bg-pink-600 text-white shadow-lg scale-105"
                  : "bg-pink-700 text-white shadow-lg scale-105"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-white text-gray-800 hover:bg-pink-100"
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-selected={activeTab === tab}
            aria-controls={`tab-panel-${tab}`}
            tabIndex={0}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-lg font-medium">Loading analytics...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <span className="text-red-700 dark:text-red-300">Error: {error}</span>
            <button
              onClick={() => fetchAnalyticsData(activeTab)}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Content - only show when not loading */}
      {!loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center shadow-md border border-pink-200 dark:border-pink-900">
          <span className="text-2xl">🧾</span>
          <span className="text-lg font-semibold mt-2">Orders</span>
          <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">{kpi.orders}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center shadow-md border border-pink-200 dark:border-pink-900">
          <span className="text-2xl">🍽️</span>
          <span className="text-lg font-semibold mt-2">Items Sold</span>
          <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">{kpi.items}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center shadow-md border border-pink-200 dark:border-pink-900">
          <span className="text-2xl">💰</span>
          <span className="text-lg font-semibold mt-2">Revenue</span>
          <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">K{kpi.revenue.toLocaleString()}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center shadow-md border border-pink-200 dark:border-pink-900">
          <span className="text-2xl">📊</span>
          <span className="text-lg font-semibold mt-2">AOV</span>
          <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">K{kpi.aov.toLocaleString()}</span>
        </div>
      </div>
      {/* Charts and Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Sales Over Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900">
          <h2 className="font-semibold mb-2 text-pink-700 dark:text-pink-300">Sales Over Time</h2>
          {salesOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#e11d48" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl mb-3 block">📈</span>
              <p className="text-gray-500 dark:text-gray-400">No sales data to display</p>
            </div>
          )}
        </div>
        {/* Revenue by Category Donut */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900">
          <h2 className="font-semibold mb-2 text-pink-700 dark:text-pink-300">Revenue by Category</h2>
          {revenueByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#e11d48"
                  label
                >
                  {revenueByCategory.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={CHERRY_COLORS[idx % CHERRY_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl mb-3 block">🥧</span>
              <p className="text-gray-500 dark:text-gray-400">No category data to display</p>
            </div>
          )}
        </div>
      </div>
      {/* Top 10 Items Bar Chart & Best Sellers Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Top 10 Items Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900">
          <h2 className="font-semibold mb-2 text-pink-700 dark:text-pink-300">Top 10 Items</h2>
          {topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topItems} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="sold" fill="#e11d48">
                  {topItems.map((entry, idx) => (
                    <Cell key={`cell-bar-${idx}`} fill={CHERRY_COLORS[idx % CHERRY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl mb-3 block">📊</span>
              <p className="text-gray-500 dark:text-gray-400">No items data to display</p>
            </div>
          )}
        </div>
        {/* Best Sellers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900 overflow-x-auto">
          <h2 className="font-semibold mb-2 text-pink-700 dark:text-pink-300">Best-Selling Foods</h2>
          {bestSellers.length > 0 ? (
            <table className="min-w-full divide-y divide-pink-200 dark:divide-pink-900">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Food</th>
                  <th className="px-4 py-2 text-right">Sold</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((row, idx) => (
                  <tr key={row.name} className={idx % 2 === 0 ? 'bg-pink-50 dark:bg-gray-900/30' : ''}>
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2 text-right">{row.sold}</td>
                    <td className="px-4 py-2 text-right">K{row.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">🍒</span>
              <p className="text-gray-500 dark:text-gray-400">No sales data available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Start taking orders to see analytics</p>
            </div>
          )}
        </div>
      </div>
      {/* Period Comparison & Export */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900 flex flex-col md:flex-row items-center gap-4">
          <span className="font-semibold text-pink-700 dark:text-pink-300">Period Comparison:</span>
          <span className="text-sm">Orders: <span className="font-bold">{periodComparison.curr?.orders || 0}</span> vs <span className="text-gray-500">{periodComparison.prev?.orders || 0}</span></span>
          <span className="text-sm">Revenue: <span className="font-bold">K{(periodComparison.curr?.revenue || 0).toLocaleString()}</span> vs <span className="text-gray-500">K{(periodComparison.prev?.revenue || 0).toLocaleString()}</span></span>
        </div>
        <div className="flex gap-2">
          <CSVLink
            data={csvData}
            filename={`cherry_myo_sales_report_${activeTab.toLowerCase()}.csv`}
            className="px-4 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-700 transition-colors duration-200"
            aria-label="Export CSV"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={exportPDF}
            className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors duration-200"
            aria-label="Export PDF"
          >
            Export PDF
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
