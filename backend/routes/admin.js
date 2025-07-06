// backend/routes/admin.js

const express = require("express");
const router = express.Router();
const orderCleanup = require("../scheduler");
const Order = require("../models/Order");

// Get order statistics
router.get("/orders/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await orderCleanup.getStats(days);
    
    // Also get total count
    const totalOrders = await Order.countDocuments();
    
    res.json({
      success: true,
      totalOrders,
      statsForDays: days,
      dailyStats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get order statistics",
      error: error.message
    });
  }
});

// Delete orders from a specific date
router.delete("/orders/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    const result = await orderCleanup.deleteByDate(targetDate);
    
    res.json({
      success: true,
      message: `Successfully deleted orders from ${targetDate.toDateString()}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete orders",
      error: error.message
    });
  }
});

// Delete orders older than specified days
router.delete("/orders/older-than/:days", async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    
    if (isNaN(days) || days < 1) {
      return res.status(400).json({
        success: false,
        message: "Days must be a positive number"
      });
    }

    const result = await orderCleanup.deleteOldOrders(days);
    
    res.json({
      success: true,
      message: `Successfully deleted orders older than ${days} days`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete old orders",
      error: error.message
    });
  }
});

// Delete yesterday's orders
router.delete("/orders/yesterday", async (req, res) => {
  try {
    const result = await orderCleanup.deleteYesterday();
    
    res.json({
      success: true,
      message: "Successfully deleted yesterday's orders",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete yesterday's orders",
      error: error.message
    });
  }
});

// Delete last week's orders
router.delete("/orders/last-week", async (req, res) => {
  try {
    const result = await orderCleanup.deleteLastWeek();
    
    res.json({
      success: true,
      message: "Successfully deleted orders from last week",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete last week's orders",
      error: error.message
    });
  }
});

// Emergency cleanup (delete all orders older than 1 day)
router.delete("/orders/emergency-cleanup", async (req, res) => {
  try {
    const result = await orderCleanup.emergencyCleanup();
    
    res.json({
      success: true,
      message: "Emergency cleanup completed",
      deletedCount: result.deletedCount,
      warning: "This deleted all orders older than 1 day"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Emergency cleanup failed",
      error: error.message
    });
  }
});

// Get all orders with pagination and date filtering
router.get("/orders", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
});

module.exports = router;
