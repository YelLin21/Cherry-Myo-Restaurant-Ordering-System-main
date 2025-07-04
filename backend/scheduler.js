// backend/scheduler.js

const cron = require("node-cron");
const Order = require("./models/Order");

// Schedule: runs once every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    const result = await Order.deleteMany({ createdAt: { $lt: oneDayAgo } });
    console.log(`🧹 Daily cleanup ran: ${result.deletedCount} old orders deleted.`);
  } catch (error) {
    console.error("❌ Failed to clean up old orders:", error);
  }
});
