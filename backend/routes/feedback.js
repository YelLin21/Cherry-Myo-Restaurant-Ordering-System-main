const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");

router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
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

module.exports = router;
