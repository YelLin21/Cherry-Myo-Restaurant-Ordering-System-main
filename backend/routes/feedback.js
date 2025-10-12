import express from "express";
import Feedback from "../models/Feedback.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // If date range is provided, filter by dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Set end date to end of day (23:59:59.999)
      end.setHours(23, 59, 59, 999);
      
      dateFilter.createdAt = {
        $gte: start,
        $lte: end
      };
    }
    
    const feedbacks = await Feedback.find(dateFilter).sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ error: "Rating is required" });
    }

    const newFeedback = new Feedback({
      name,
      rating,
      comment,
    });
    const savedFeedback = await newFeedback.save();
    
    // Emit Socket.IO event for real-time feedback updates
    const io = req.app.get('io');
    if (io) {
      io.emit('feedback:new', savedFeedback);
    }
    
    res.status(201).json(savedFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Feedback.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json({ message: "Feedback deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
