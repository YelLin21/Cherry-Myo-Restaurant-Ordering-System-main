import express from "express";
import Menu from "../models/Menu.js";
const router = express.Router();

router.get("/", async (req, res) => {
  const items = await Menu.find();
  res.json(items);
});

router.post("/", async (req, res) => {
  const newItem = new Menu({ ...req.body, createdAt: new Date() });
  await newItem.save();

  const io = req.app.get("io");
  io.emit("menu:new", newItem);

  res.status(201).json(newItem);
});

router.put("/:id", async (req, res) => {
  const updatedItem = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  const io = req.app.get("io");
  io.emit("menu:update", updatedItem);

  res.json(updatedItem);
});

router.delete("/:id", async (req, res) => {
  await Menu.findByIdAndDelete(req.params.id);

  const io = req.app.get("io");
  io.emit("menu:delete", req.params.id);

  res.json({ success: true });
});

export default router;
