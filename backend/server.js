const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

// ✅ CREATE APP FIRST
const app = express();

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// MongoDB Connection
// --------------------
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ DB Error:", err));

// --------------------
// Routes
// --------------------
app.use("/api/auth", require("./routes/auth"));

// --------------------
// Test Route
// --------------------
app.get("/", (req, res) => {
    res.send("Smart Bus Pass Backend Running 🚍");
});

// --------------------
// Server Start
// --------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

