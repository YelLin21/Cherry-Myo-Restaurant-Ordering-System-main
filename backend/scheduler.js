// backend/scheduler.js

const cron = require("node-cron");
const Order = require("./models/Order");

// Configuration for different cleanup strategies
const CLEANUP_CONFIG = {
  // How many days to keep orders (orders older than this will be deleted)
  RETENTION_DAYS: 7, // Keep orders for 7 days
  
  // Enable/disable automatic cleanup
  AUTO_CLEANUP_ENABLED: true,
  
  // Cleanup schedule (runs daily at 2:00 AM)
  SCHEDULE: "0 2 * * *"
};

// Function to delete orders from a specific date
async function deleteOrdersByDate(targetDate) {
  try {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Order.deleteMany({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    console.log(`🗑️ Deleted ${result.deletedCount} orders from ${targetDate.toDateString()}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to delete orders from ${targetDate.toDateString()}:`, error);
    throw error;
  }
}

// Function to delete orders older than specified days
async function deleteOldOrders(retentionDays = CLEANUP_CONFIG.RETENTION_DAYS) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    cutoffDate.setHours(23, 59, 59, 999); // End of the cutoff day

    const result = await Order.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Cleanup completed: ${result.deletedCount} orders older than ${retentionDays} days deleted.`);
    console.log(`📅 Cutoff date: ${cutoffDate.toDateString()}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to clean up old orders:", error);
    throw error;
  }
}

// Function to get order statistics by date range
async function getOrderStats(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalPrice" }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 }
      }
    ]);

    console.log(`Order statistics for last ${days} days:`, stats);
    return stats;
  } catch (error) {
    console.error("❌ Failed to get order statistics:", error);
    throw error;
  }
}

// Scheduled cleanup task - runs daily at 2:00 AM
if (CLEANUP_CONFIG.AUTO_CLEANUP_ENABLED) {
  cron.schedule(CLEANUP_CONFIG.SCHEDULE, async () => {
    console.log(`Starting scheduled cleanup at ${new Date().toISOString()}`);
    
    try {
      // Show statistics before cleanup
      await getOrderStats(CLEANUP_CONFIG.RETENTION_DAYS + 5);
      
      // Perform cleanup
      await deleteOldOrders(CLEANUP_CONFIG.RETENTION_DAYS);
      
      console.log("✅ Scheduled cleanup completed successfully");
    } catch (error) {
      console.error("❌ Scheduled cleanup failed:", error);
    }
  });

  console.log(`🤖 Automatic order cleanup scheduled: ${CLEANUP_CONFIG.SCHEDULE}`);
  console.log(`📅 Retention period: ${CLEANUP_CONFIG.RETENTION_DAYS} days`);
}

// Manual cleanup functions for administrative use
const orderCleanup = {
  // Delete orders from a specific date
  deleteByDate: deleteOrdersByDate,
  
  // Delete orders older than X days
  deleteOldOrders: deleteOldOrders,
  
  // Get order statistics
  getStats: getOrderStats,
  
  // Delete orders from yesterday
  deleteYesterday: async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return await deleteOrdersByDate(yesterday);
  },
  
  // Delete orders from last week
  deleteLastWeek: async () => {
    return await deleteOldOrders(7);
  },
  
  // Emergency cleanup - delete all orders older than 1 day
  emergencyCleanup: async () => {
    console.log("🚨 Emergency cleanup initiated...");
    return await deleteOldOrders(1);
  }
};

module.exports = orderCleanup;
