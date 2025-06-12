const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");

// Get all menu items
router.get("/", async (req, res) => {
  const items = await Menu.find();
  res.json(items);
});

// Add new menu item
router.post("/", async (req, res) => {
  const newItem = new Menu({ ...req.body, createdAt: new Date() });
  await newItem.save();

  // ✅ emit real-time "menu:new"
  const io = req.app.get("io");
  io.emit("menu:new", newItem);

  res.status(201).json(newItem);
});

// Update existing menu item
router.put("/:id", async (req, res) => {
  const updatedItem = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  // ✅ emit real-time "menu:update"
  const io = req.app.get("io");
  io.emit("menu:update", updatedItem);

  res.json(updatedItem);
});

// Delete a menu item
router.delete("/:id", async (req, res) => {
  await Menu.findByIdAndDelete(req.params.id);

  // ✅ emit real-time "menu:delete"
  const io = req.app.get("io");
  io.emit("menu:delete", req.params.id);

  res.json({ success: true });
});

module.exports = router;
