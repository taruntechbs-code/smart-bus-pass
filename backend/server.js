const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors());
app.use(express.json());

/* ---------------- ROUTES ---------------- */
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const rfidRoutes = require("./routes/rfid");
const passengerRoutes = require("./routes/passenger");
const conductorRoutes = require("./routes/conductor");

/* ---------------- ROUTE MAPPING ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/rfid", rfidRoutes);
app.use("/api/passenger", passengerRoutes);
app.use("/api/conductor", conductorRoutes);

/* ---------------- ROOT TEST ---------------- */
app.get("/", (req, res) => {
    res.send("🚍 Smart Bus Pass Backend is running");
});

/* ---------------- MONGODB CONNECTION ---------------- */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB connection options to fix SSL/TLS issues
const mongoOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4, skip trying IPv6
};

console.log("🔄 Attempting to connect to MongoDB...");

mongoose
    .connect(MONGO_URI, mongoOptions)
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err.message);
        console.error("\n💡 Troubleshooting tips:");
        console.error("1. Check if your MongoDB connection string is correct in .env");
        console.error("2. Ensure your IP address is whitelisted in MongoDB Atlas");
        console.error("3. Verify your MongoDB username and password are correct");
        console.error("4. Make sure special characters in password are URL-encoded");
        console.error("\nFull error details:");
        console.error(err);
        process.exit(1);
    });


/* ---------------- ERROR HANDLER (SAFETY) ---------------- */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});
