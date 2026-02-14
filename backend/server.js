const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

// Export io to be used in routes
app.set("io", io);

/* ---------------- SECURITY MIDDLEWARE ---------------- */
// 1. Helmet for secure headers
app.use(helmet());
app.disable("x-powered-by"); // Extra safety

// 2. HTTPS Redirect (Production Only)
if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
        if (req.headers["x-forwarded-proto"] !== "https") {
            return res.redirect(`https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to critical routes
app.use("/api/auth", limiter);
app.use("/api/payment", limiter);

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors()); // Configure strict CORS if needed, default is * which is ok for dev
app.use(express.json());

/* ---------------- ROUTES ---------------- */
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const rfidRoutes = require("./routes/rfidRoutes");
const passengerRoutes = require("./routes/passenger");
const conductorRoutes = require("./routes/conductor");
const paymentRoutes = require("./routes/payment");

/* ---------------- ROUTE MAPPING ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/rfid", rfidRoutes);
app.use("/api/passenger", passengerRoutes);
app.use("/api/conductor", conductorRoutes);
app.use("/api/payment", paymentRoutes);

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
        // Use server.listen instead of app.listen
        server.listen(PORT, () => {
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

/* ---------------- SOCKET.IO EVENTS ---------------- */
io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});
