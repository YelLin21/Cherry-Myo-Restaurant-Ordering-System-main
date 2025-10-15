import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // your mongoose model
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
    try {
      // Only admin can fetch all users
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only admin can view users." });
      }
  
      // Fetch all users, exclude passwords
      const users = await User.find().select("-password").sort({ createdAt: -1 });
  
      res.status(200).json(users);
    } catch (error) {
      console.error("❌ Fetch users error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
/**
 * 🧱 REGISTER (Admin only)
 * POST /api/users/register
 */
router.post("/register",verifyToken, async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log("Registering user:", email, role);
        if (!email || !password || !role) {
          return res.status(400).json({ message: "All fields are required." });
        }
    
        const existingAdmin = await User.findOne({ email: email });
        if (existingAdmin) {
          return res.status(403).json({ message: "Admin already exists." });
        }
    
        const hashedPassword = await bcrypt.hash(password, 10);
    
        const newAdmin = new User({
          email,
          password: hashedPassword,
          role,
        });
    
        await newAdmin.save();
    
        res.status(201).json({
          message: "First admin created successfully",
          user: {
            id: newAdmin._id,
            email: newAdmin.email,
            role: newAdmin.role,
          },
        });
      } catch (error) {
        console.error("❌ Register-first error:", error);
        res.status(500).json({ message: "Server error" });
      }
    
});

/**
 * 🔐 LOGIN (Admin / Waiter / Kitchen)
 * POST /api/users/login
 */
router.post("/login", async (req, res) => {
    try {
      let { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ message: "Email and password required." });
  
      email = email.toLowerCase().trim();
      password = password.trim();
  
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found." });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });
  
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "your_secret_key",
        { expiresIn: "7d" }
      );
  
      res.status(200).json({
        message: "Login successful",
        token,
        user: { id: user._id, email: user.email, role: user.role },
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
router.delete("/:id", async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found." });
  
      await User.findByIdAndDelete(req.params.id);
  
      res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      console.error("❌ Delete user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
/**
 * 👤 GET CURRENT USER (with JWT)
 * GET /api/users/me
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Fetch user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
