import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { CSVLink } from "react-csv";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import { Link } from "react-router-dom";
import AdminAuth from "../components/AdminAuth.jsx";
import { io } from "socket.io-client";

const CHERRY_COLORS = ["#e11d48", "#f472b6", "#be185d", "#fbbf24", "#a21caf", "#f43f5e"];
const APIBASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function AdminSalesReport({ darkMode = false }) {
  const [activeTab, setActiveTab] = useState("Custom");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [kpi, setKpi] = useState({ orders: 0, items: 0, revenue: 0, aov: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [salesOverTime, setSalesOverTime] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [periodComparison, setPeriodComparison] = useState({
    previous: { orders: 0, revenue: 0 },
    current: { orders: 0, revenue: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [customFilterActive, setCustomFilterActive] = useState(false);
  const [detailedOrders, setDetailedOrders] = useState([]);


  // Fetch data from API
  const fetchAnalyticsData = async (period, isAutoRefresh = false, customDates = null) => {
    if (!isAutoRefresh) setLoading(true);
    setError(null);
    try {
      let url = `${APIBASE}/analytics/dashboard?period=${period}`;
      
      // Add custom date range parameters if using custom period
      if (period === 'Custom') {
        const dates = customDates || customDateRange;
        url += `&startDate=${dates.startDate}&endDate=${dates.endDate}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      
      // Ensure KPI data is properly structured with fallback values
      setKpi({
        orders: data.kpi?.orders || 0,
        items: data.kpi?.items || 0,
        revenue: data.kpi?.revenue || 0,
        aov: data.kpi?.aov || 0
      });
      setBestSellers(data.bestSellers || []);
      setSalesOverTime(data.salesOverTime || []);
      setTopItems(data.topItems || []);
      setRevenueByCategory(data.revenueByCategory || []);
      setPeriodComparison(data.periodComparison || {
        previous: { orders: 0, revenue: 0 },
        current: { orders: 0, revenue: 0 }
      });
      setLastUpdated(new Date());
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
      if (!isAutoRefresh) setLoading(false);
    }
  };

  const fetchFeedback = async (customDates = null) => {
    try {
      let url = `${APIBASE}/feedback`;
      
      // Add date filtering if custom date range is active
      if (activeTab === 'Custom' || customDates) {
        const dates = customDates || customDateRange;
        url += `?startDate=${dates.startDate}&endDate=${dates.endDate}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch feedback");
      }
      const data = await response.json();
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      setFeedbacks([]); // Set empty array on error
    }
  };

  const fetchDetailedOrders = async (customDates = null) => {
    try {
      let url = `${APIBASE}/orders/detailed`;
      
      // Add date filtering if custom date range is active
      const dates = customDates || customDateRange;
      url += `?startDate=${dates.startDate}&endDate=${dates.endDate}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch detailed orders");
      }
      const data = await response.json();
      setDetailedOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching detailed orders:", error);
      setDetailedOrders([]); // Set empty array on error
    }
  };

  // Export functions for PDF and CSV
  const exportToPDF = () => {
    try {
      console.log('Starting PDF export...');
      
      const doc = new jsPDF();
      console.log('PDF document created');
      
      // Set UTF-8 encoding for better text support
      doc.setFont('helvetica');
      doc.setCharSpace(0);
      
      // Set colors
      const primaryColor = [225, 29, 72]; // Cherry red
      const secondaryColor = [244, 114, 182]; // Pink
      const textColor = [55, 65, 81]; // Gray
      const lightGray = [243, 244, 246];
      
      // Header with background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 30, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Cherry Myo Restaurant', 20, 18);
      doc.setFontSize(14);
      doc.text('Sales Report', 20, 25);
      
      // Reset text color
      doc.setTextColor(...textColor);
      
      // Report info box
      doc.setFillColor(...lightGray);
      doc.rect(20, 35, 170, 20, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, 35, 170, 20, 'S');
      
      doc.setFontSize(10);
      doc.text(`Report Period: ${customDateRange.startDate} to ${customDateRange.endDate}`, 25, 42);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 25, 50);
      
      let currentY = 70;
      
      // KPI Summary Table
      doc.setFillColor(...secondaryColor);
      doc.rect(20, currentY, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('SUMMARY METRICS', 25, currentY + 6);
      
      currentY += 12;
      doc.setTextColor(...textColor);
      
      // KPI table structure
      const kpiData = [
        ['Total Orders', (kpi.orders || 0).toString()],
        ['Items Sold', (kpi.items || 0).toString()], 
        ['Revenue', `${(kpi.revenue || 0).toLocaleString()} MMK`],
        ['Avg Order Value', `${(kpi.aov || 0).toLocaleString()} MMK`]
      ];
      
      kpiData.forEach((row, index) => {
        const y = currentY + (index * 8);
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, y - 2, 170, 8, 'F');
        }
        doc.setFontSize(10);
        doc.text(row[0], 25, y + 3);
        doc.text(row[1], 150, y + 3);
      });
      
      currentY += 45;
      
      // Best Sellers Table
      if (bestSellers && bestSellers.length > 0) {
        console.log('Adding best sellers table...');
        
        // Section header
        doc.setFillColor(...secondaryColor);
        doc.rect(20, currentY, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text('BEST SELLING ITEMS', 25, currentY + 6);
        
        currentY += 12;
        doc.setTextColor(...textColor);
        
        // Table header
        doc.setFillColor(229, 231, 235);
        doc.rect(20, currentY, 170, 8, 'F');
        doc.setFontSize(9);
        doc.text('No.', 25, currentY + 5);
        doc.text('Item Name', 35, currentY + 5);
        doc.text('Qty Sold', 120, currentY + 5);
        doc.text('Revenue (MMK)', 150, currentY + 5);
        
        currentY += 10;
        
        // Table rows
        bestSellers.slice(0, 15).forEach((item, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(20, currentY - 2, 170, 8, 'F');
          }
          
          doc.setFontSize(8);
          doc.text((index + 1).toString(), 25, currentY + 3);
          // Remove Myanmar text completely - only keep English/Latin characters
          let itemName = item.name || 'Unknown';
          // Remove anything in parentheses that contains non-English characters
          itemName = itemName.replace(/\([^)]*[^\x00-\x7F][^)]*\)/g, '');
          // Remove any remaining non-English characters
          itemName = itemName.replace(/[^\x00-\x7F]/g, '');
          // Clean up extra spaces and limit length
          itemName = itemName.trim().substring(0, 30) || 'Unknown Item';
          doc.text(itemName, 35, currentY + 3);
          doc.text((item.sold || 0).toString(), 125, currentY + 3);
          doc.text((item.revenue || 0).toLocaleString(), 155, currentY + 3);
          
          currentY += 8;
        });
        
        currentY += 10;
      }
      
      // Detailed Orders Table
      if (detailedOrders && detailedOrders.length > 0) {
        console.log('Adding detailed orders table...');
        
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }
        
        // Section header
        doc.setFillColor(...secondaryColor);
        doc.rect(20, currentY, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text('ORDER DETAILS', 25, currentY + 6);
        
        currentY += 12;
        doc.setTextColor(...textColor);
        
        // Table header
        doc.setFillColor(229, 231, 235);
        doc.rect(20, currentY, 170, 8, 'F');
        doc.setFontSize(8);
        doc.text('Order ID', 25, currentY + 5);
        doc.text('Table', 70, currentY + 5);
        doc.text('Payment', 90, currentY + 5);
        doc.text('Date/Time', 120, currentY + 5);
        doc.text('Items', 155, currentY + 5);
        doc.text('Amount', 170, currentY + 5);
        
        currentY += 10;
        
        // Table rows
        detailedOrders.slice(0, 30).forEach((order, index) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
            
            // Repeat header on new page
            doc.setFillColor(229, 231, 235);
            doc.rect(20, currentY, 170, 8, 'F');
            doc.setFontSize(8);
            doc.text('Order ID', 25, currentY + 5);
            doc.text('Table', 70, currentY + 5);
            doc.text('Payment', 90, currentY + 5);
            doc.text('Date/Time', 120, currentY + 5);
            doc.text('Items', 155, currentY + 5);
            doc.text('Amount', 170, currentY + 5);
            currentY += 10;
          }
          
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(20, currentY - 2, 170, 8, 'F');
          }
          
          doc.setFontSize(7);
          doc.text(order.orderNumber || '', 25, currentY + 3);
          doc.text(`Table ${order.tableNumber || ''}`, 70, currentY + 3);
          doc.text((order.paymentMethod || 'Cash').substring(0, 8), 90, currentY + 3);
          doc.text(`${new Date(order.paidAt).toLocaleDateString()}`, 120, currentY + 3);
          doc.text(`${new Date(order.paidAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`, 120, currentY + 6);
          doc.text((order.totalItems || 0).toString(), 158, currentY + 3);
          doc.text(`${(order.totalAmount || 0).toLocaleString()}`, 175, currentY + 3);
          
          currentY += 8;
        });
        
        currentY += 10;
      }
      
      // Customer Feedback Summary
      if (feedbacks && feedbacks.length > 0) {
        console.log('Adding feedback summary...');
        
        if (currentY > 220) {
          doc.addPage();
          currentY = 20;
        }
        
        // Section header
        doc.setFillColor(...secondaryColor);
        doc.rect(20, currentY, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text('CUSTOMER FEEDBACK', 25, currentY + 6);
        
        currentY += 12;
        doc.setTextColor(...textColor);
        
        // Feedback stats
        const avgRating = feedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) / feedbacks.length;
        
        doc.setFillColor(248, 250, 252);
        doc.rect(20, currentY, 170, 16, 'F');
        doc.setFontSize(10);
        doc.text(`Total Feedback: ${feedbacks.length}`, 25, currentY + 6);
        doc.text(`Average Rating: ${avgRating.toFixed(1)}/5.0 stars`, 25, currentY + 14);
        
        currentY += 20;
        
        // Recent feedback table (show first 10)
        if (feedbacks.length > 0) {
          doc.setFillColor(229, 231, 235);
          doc.rect(20, currentY, 170, 8, 'F');
          doc.setFontSize(8);
          doc.text('Customer', 25, currentY + 5);
          doc.text('Rating', 80, currentY + 5);
          doc.text('Comment', 110, currentY + 5);
          doc.text('Date', 165, currentY + 5);
          
          currentY += 10;
          
          feedbacks.slice(0, 10).forEach((feedback, index) => {
            if (currentY > 275) {
              doc.addPage();
              currentY = 20;
            }
            
            if (index % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(20, currentY - 2, 170, 8, 'F');
            }
            
            doc.setFontSize(7);
            // Remove Myanmar text completely - only keep English/Latin characters
            let customerName = feedback.name || 'Anonymous';
            customerName = customerName.replace(/[^\x00-\x7F]/g, '').trim().substring(0, 15) || 'Customer';
            
            let comment = feedback.comment || '';
            comment = comment.replace(/[^\x00-\x7F]/g, '').trim().substring(0, 25) || 'No comment';
            
            doc.text(customerName, 25, currentY + 3);
            doc.text(`${feedback.rating || 5}/5 stars`, 85, currentY + 3);
            doc.text(comment, 110, currentY + 3);
            doc.text(new Date(feedback.createdAt || Date.now()).toLocaleDateString(), 165, currentY + 3);
            
            currentY += 8;
          });
        }
      }
      
      // Footer on last page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...primaryColor);
        doc.rect(0, 287, 210, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`Cherry Myo Restaurant - Sales Report | Page ${i} of ${pageCount}`, 20, 293);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 150, 293);
      }
      
      // Save the PDF
      console.log('Saving PDF...');
      const filename = `Cherry-Myo-Sales-Report-${customDateRange.startDate}-to-${customDateRange.endDate}.pdf`;
      doc.save(filename);
      console.log('PDF export completed successfully:', filename);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      console.error('Error stack:', error.stack);
      alert(`Failed to export PDF: ${error.message}. Please check the console for more details.`);
    }
  };

  // Prepare CSV data
  const getCSVData = () => {
    const csvData = [];
    
    // Add summary row
    csvData.push(['CHERRY MYO RESTAURANT - SALES REPORT']);
    csvData.push([`Report Period: ${customDateRange.startDate} to ${customDateRange.endDate}`]);
    csvData.push([`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`]);
    csvData.push([]);
    csvData.push(['SUMMARY']);
    csvData.push(['Total Orders', kpi.orders]);
    csvData.push(['Total Items Sold', kpi.items]);
    csvData.push(['Total Revenue (MMK)', kpi.revenue || 0]);
    csvData.push(['Average Order Value (MMK)', kpi.aov || 0]);
    csvData.push([]);
    
    // Add best sellers data
    if (bestSellers && bestSellers.length > 0) {
      csvData.push(['BEST SELLING ITEMS']);
      csvData.push(['Item Name', 'Quantity Sold', 'Revenue (MMK)']);
      bestSellers.forEach(item => {
        csvData.push([item.name, item.sold, item.revenue || 0]);
      });
      csvData.push([]);
    }
    
    // Add revenue by category data
    if (revenueByCategory && revenueByCategory.length > 0) {
      csvData.push(['REVENUE BY CATEGORY']);
      csvData.push(['Category', 'Revenue (MMK)']);
      revenueByCategory.forEach(category => {
        csvData.push([category.category, category.value || 0]);
      });
      csvData.push([]);
    }
    
    csvData.push(['ORDER DETAILS']);
    csvData.push(['Order ID', 'Table Number', 'Payment Method', 'Date', 'Time', 'Total Items', 'Total Amount (MMK)']);
    
    // Add order data
    detailedOrders.forEach(order => {
      csvData.push([
        order.orderNumber,
        order.tableNumber,
        order.paymentMethod,
        new Date(order.paidAt).toLocaleDateString(),
        new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        order.totalItems,
        order.totalAmount
      ]);
    });
    
    // Add feedback summary
    if (feedbacks && feedbacks.length > 0) {
      csvData.push([]);
      csvData.push(['CUSTOMER FEEDBACK SUMMARY']);
      csvData.push(['Total Feedback', feedbacks.length]);
      
      const avgRating = feedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) / feedbacks.length;
      csvData.push(['Average Rating', `${avgRating.toFixed(1)}/5`]);
      csvData.push([]);
      csvData.push(['Customer Name', 'Rating', 'Comment', 'Date']);
      
      feedbacks.forEach(feedback => {
        csvData.push([
          feedback.name || 'Anonymous',
          `${feedback.rating}/5`,
          feedback.comment || '',
          new Date(feedback.createdAt || Date.now()).toLocaleDateString()
        ]);
      });
    }
    
    return csvData;
  };
  

  // Fetch data when component mounts
  useEffect(() => {
    setCustomFilterActive(true);
    fetchAnalyticsData('Custom');
    fetchFeedback(); // Fetch feedback data with custom date range
    fetchDetailedOrders(); // Fetch detailed orders data
  }, []);

  // Fetch data when custom date range changes
  useEffect(() => {
    setCustomFilterActive(true);
    fetchAnalyticsData('Custom');
    fetchFeedback(); // Fetch filtered feedback data
    fetchDetailedOrders(); // Fetch filtered detailed orders
  }, [customDateRange]);

  // Socket.IO connection and real-time updates
  useEffect(() => {
    // Only try to connect if we have a valid API base URL
    if (!APIBASE) {
      console.warn('No API base URL available for Socket.IO connection');
      return;
    }

    const newSocket = io(APIBASE.replace('/api', ''), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(' Connected to Socket.IO server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for order events that should trigger data refresh
    // Check current state to avoid auto-refresh when custom filter is active
    const handleOrderEvent = (eventName, data) => {
      console.log(`📊 ${eventName}:`, data);
      // Use a state check to determine if we should auto-refresh
      setCustomFilterActive(currentCustomFilter => {
        if (!currentCustomFilter) {
          // Only refresh if custom filter is not active
          setTimeout(() => {
            fetchAnalyticsData('Custom', true);
            fetchDetailedOrders(); // Also refresh detailed orders
          }, 100);
        }
        return currentCustomFilter;
      });
    };

    newSocket.on('order:new', (order) => handleOrderEvent('New order received', order));
    newSocket.on('order:update', (order) => handleOrderEvent('Order updated', order));
    newSocket.on('order:paid', (orderId) => handleOrderEvent('Order paid', orderId));
    newSocket.on('order:readyForCheckout', (order) => handleOrderEvent('Order ready for checkout', order));
    
    // Listen for feedback events
    newSocket.on('feedback:new', (feedback) => {
      console.log('💬 New feedback received:', feedback);
      // Only refresh feedback if not using custom filter, or if feedback is within current date range
      if (!customFilterActive) {
        // For non-custom filters, just refresh the feedback
        fetchFeedback();
      } else {
        // For custom filters, check if the new feedback falls within the date range
        const feedbackDate = new Date(feedback.createdAt);
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        if (feedbackDate >= startDate && feedbackDate <= endDate) {
          // Feedback is within range, refresh the feedback list
          fetchFeedback();
        }
      }
    });

    return () => {
      console.log(' Cleaning up Socket.IO connection');
      newSocket.disconnect();
    };
  }, []); // Remove dependencies to prevent reconnections

  // Auto-refresh data every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      // Only auto-refresh if custom filter is not active to preserve user's date selection
      if (!customFilterActive) {
        fetchAnalyticsData('Custom', true); // true indicates this is an auto-refresh
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [customFilterActive]);


  
  return (
    <AdminAuth>
      {({ user, handleLogout }) => (
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
        
        {/* Time Interval and Last Updated Display */}
        <div className={`text-sm flex flex-col items-end ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {/* Current Time Interval */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs">📊</span>
            <span className="font-medium">
              {customDateRange.startDate} to {customDateRange.endDate}
            </span>
          </div>
          
          {/* Connection Status and Last Updated */}
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </span>
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        <button
            onClick={handleLogout}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
              darkMode 
                ? 'bg-red-700 text-red-100 hover:bg-red-600' 
                : 'bg-red-600 text-white hover:bg-red-700'
            } shadow-md`}
            aria-label="Sign Out"
          >
            
            Sign Out
          </button>
        
      </div>

      {/* Date Range Section */}
      <div className={`mb-6 p-4 rounded-2xl border ${
        darkMode 
          ? 'bg-gray-800 border-pink-900' 
          : 'bg-white border-pink-200'
      } shadow-md`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
          darkMode ? 'text-pink-300' : 'text-pink-700'
        }`}>
          <span className="text-xl">📅</span>
          Select Date Range
        </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  From:
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                  className={`px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  To:
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  min={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                  className={`px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setCustomFilterActive(true);
                fetchAnalyticsData('Custom');
                fetchFeedback(); // Also refresh feedback data with custom date filter
                fetchDetailedOrders(); // Also refresh detailed orders data
              }}
              disabled={loading || new Date(customDateRange.startDate) > new Date(customDateRange.endDate)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                darkMode
                  ? 'bg-pink-600 text-white hover:bg-pink-700'
                  : 'bg-pink-600 text-white hover:bg-pink-700'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
              title={new Date(customDateRange.startDate) > new Date(customDateRange.endDate) ? 'Start date cannot be after end date' : ''}
            >
              <span className="text-sm">🔍</span>
              Apply Filter
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const newDateRange = { startDate: today, endDate: today };
                setCustomDateRange(newDateRange);
                setCustomFilterActive(true);
                fetchAnalyticsData('Custom', false, newDateRange);
                fetchFeedback(newDateRange);
                fetchDetailedOrders(newDateRange);
              }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const newDateRange = {
                  startDate: lastWeek.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                };
                setCustomDateRange(newDateRange);
                setCustomFilterActive(true);
                fetchAnalyticsData('Custom', false, newDateRange);
                fetchFeedback(newDateRange);
                fetchDetailedOrders(newDateRange);
              }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                const newDateRange = {
                  startDate: lastMonth.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                };
                setCustomDateRange(newDateRange);
                setCustomFilterActive(true);
                fetchAnalyticsData('Custom', false, newDateRange);
                fetchFeedback(newDateRange);
                fetchDetailedOrders(newDateRange);
              }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 30 Days
            </button>
          </div>
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
          <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">{(kpi.revenue || 0).toLocaleString()} MMK</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center shadow-md border border-pink-200 dark:border-pink-900">
          <span className="text-2xl">📅</span>
          <span className="text-lg font-semibold mt-2">Duration</span>
          <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">
            {Math.ceil((new Date(customDateRange.endDate) - new Date(customDateRange.startDate)) / (1000 * 60 * 60 * 24)) + 1} Days
          </span>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-2 mb-2">
              <span className="text-xl">📋</span>
              Export Report
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download your sales report data for {customDateRange.startDate} to {customDateRange.endDate}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Export PDF Button */}
            <button
              onClick={() => {
                console.log('Main PDF button clicked');
                exportToPDF();
              }}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                darkMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
              title="Export complete report to PDF"
            >
              <span className="text-lg">📄</span>
              Export PDF
            </button>
            
            {/* Export CSV Button */}
            <CSVLink
              data={getCSVData()}
              filename={`Cherry-Myo-Sales-Report-${customDateRange.startDate}-to-${customDateRange.endDate}.csv`}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                darkMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } shadow-md text-decoration-none`}
              title="Export complete report to CSV"
            >
              <span className="text-lg">📊</span>
              Export CSV
            </CSVLink>
          </div>
        </div>
      </div>

      {/* User Feedback Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-2">
            <span className="text-xl">💬</span>
            User Feedback
            <span className="text-sm bg-pink-100 dark:bg-pink-900/30 px-2 py-1 rounded-full">
              {customDateRange.startDate} to {customDateRange.endDate}
            </span>
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{isConnected ? 'Live Updates' : 'Offline'}</span>
          </div>
        </div>
        {feedbacks && feedbacks.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {feedbacks.map((fb, idx) => (
              <div key={fb._id || idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center font-bold text-pink-700 dark:text-pink-300">
                      {(fb.name?.[0] || 'A').toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {fb.name || 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {'⭐'.repeat(fb.rating || 5)}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({fb.rating || 5}/5)
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(fb.createdAt || Date.now()).toLocaleDateString()} {new Date(fb.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{fb.comment || 'No comment provided'}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">💭</span>
            <p className="text-gray-500 dark:text-gray-400">
              No feedback found for the selected date range ({customDateRange.startDate} to {customDateRange.endDate})
            </p>
          </div>
        )}
      </div>

      {/* Detailed Orders Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-2">
            <span className="text-xl">🧾</span>
            Order Details
            <span className="text-sm bg-pink-100 dark:bg-pink-900/30 px-2 py-1 rounded-full">
              {customDateRange.startDate} to {customDateRange.endDate}
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {detailedOrders.length} orders
            </span>
          </div>
        </div>
        
        {detailedOrders && detailedOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Paid At
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {detailedOrders.map((order, idx) => (
                  <tr key={order._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-900/20' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-xs font-bold text-pink-700 dark:text-pink-300 mr-3">
                          #{order.orderNumber.slice(-3)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {order._id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🪑</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Table {order.tableNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentMethod === 'Cash' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : order.paymentMethod === 'Card'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : order.paymentMethod === 'QR Code'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                      }`}>
                        {order.paymentMethod === 'Cash' && '💵'}
                        {order.paymentMethod === 'Card' && '💳'}
                        {order.paymentMethod === 'QR Code' && '📱'}
                        {order.paymentMethod === 'Mobile Banking' && '🏦'}
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div>
                        {new Date(order.paidAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center justify-end">
                        <span className="text-lg mr-1">🍽️</span>
                        {order.totalItems}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-pink-600 dark:text-pink-300">
                      {order.totalAmount.toLocaleString()} MMK
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">🧾</span>
            <p className="text-gray-500 dark:text-gray-400">
              No orders found for the selected date range ({customDateRange.startDate} to {customDateRange.endDate})
            </p>
          </div>
        )}
      </div>

      {/* Charts and Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Sales Over Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-pink-200 dark:border-pink-900">
          <h2 className="font-semibold mb-2 text-pink-700 dark:text-pink-300">Sales Over Time</h2>
          {salesOverTime && salesOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${(value || 0).toLocaleString()} MMK`, 'Sales']} />
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
          {revenueByCategory && revenueByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
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
                  label={({ value }) => `${(value || 0).toLocaleString()}`}
                  labelLine={false}
                >
                  {revenueByCategory.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={CHERRY_COLORS[idx % CHERRY_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value) => [`${(value || 0).toLocaleString()} MMK`, 'Revenue']} />
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
          {topItems && topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={850}>
              <BarChart data={topItems} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => [`${value} sold`, 'Quantity']} />
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
          <h2 className="font-semibold mb-2 text-pink-700 dark:text-pink-300">Revenue</h2>
          {bestSellers && bestSellers.length > 0 ? (
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
                    <td className="px-4 py-2 text-right">{(row.revenue || 0).toLocaleString()} MMK</td>
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
        </>
      )}
    </div>
      )}
    </AdminAuth>
  );
}
