import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: "../.env" });

const app = express();
const server = http.createServer(app);

app.get("/health", (_, res) => res.send("ok now: (from script)"));

/*const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://cherry-myo-restaurant-ordering-system-main.vercel.app"
  
];*/
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",")
.map(s => s.trim())
.filter(Boolean);

app.use(
  cors({
    /*origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, */
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    /*[origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,]*/
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET","POST"],
    credentials: false, 
  },
});

app.set("io", io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/order.js";
import qrRoutes from "./routes/qrCode.js";
import sessionRoutes from "./routes/session.js";
import analyticsRoutes from "./routes/analytics.js";
import feedbackRoutes from "./routes/feedback.js";
import checkoutRoutes from "./routes/checkout.js";
import waiterRoutes from "./routes/waiter.js";
import stripeRoutes from "./routes/stripe.js";

app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/checkouts", checkoutRoutes);
app.use("/api/waiter", waiterRoutes);
app.use("/api/stripe", stripeRoutes);

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);

const PORT = process.env.API_PORT || process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
