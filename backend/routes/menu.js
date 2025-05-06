const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");

router.get("/", async (req, res) => {
  const items = await Menu.find();
  res.json(items);
});

router.post("/", async (req, res) => {
  const newItem = new Menu(req.body);
  await newItem.save();
  res.json(newItem);
});

router.delete("/:id", async (req, res) => {
  await Menu.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.put("/:id", async (req, res) => {
  const updated = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

module.exports = router;
