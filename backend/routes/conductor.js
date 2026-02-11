const express = require("express");
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");
const { decrypt } = require("../utils/encryption");

const router = express.Router();

// ================= GET CONDUCTOR PROFILE =================
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "conductor") {
            return res.status(403).json({ error: "Access denied. Conductor only." });
        }

        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: decrypt(user.email),
            phone: decrypt(user.phone),
            role: user.role
        });
    } catch (err) {
        console.error("Get conductor profile error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// ================= GET SCAN HISTORY =================
router.get("/scans", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "conductor") {
            return res.status(403).json({ error: "Access denied. Conductor only." });
        }

        // Mock scan data for now (you can connect to a Scans model later)
        const scans = [
            {
                id: 1,
                passenger_uid: "A3B7C9D2",
                time: "2 minutes ago",
                amount: 15,
                timestamp: new Date()
            },
            {
                id: 2,
                passenger_uid: "F8E2D1A5",
                time: "8 minutes ago",
                amount: 20,
                timestamp: new Date(Date.now() - 480000)
            },
            {
                id: 3,
                passenger_uid: "C4B9E7F3",
                time: "15 minutes ago",
                amount: 18,
                timestamp: new Date(Date.now() - 900000)
            }
        ];

        res.json({ scans });
    } catch (err) {
        console.error("Get scans error:", err);
        res.status(500).json({ error: "Failed to fetch scans" });
    }
});

// ================= GET TODAY'S STATS =================
router.get("/stats", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "conductor") {
            return res.status(403).json({ error: "Access denied. Conductor only." });
        }

        // Mock stats for now
        const stats = {
            scans_today: 24,
            total_collected: 420,
            active_passengers: 18
        };

        res.json(stats);
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// ================= SCAN PASSENGER =================
router.post("/scan", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "conductor") {
            return res.status(403).json({ error: "Access denied. Conductor only." });
        }

        const { rfid_uid, fare } = req.body;

        if (!rfid_uid || !fare) {
            return res.status(400).json({ error: "RFID UID and fare required" });
        }

        // Find passenger by RFID
        const passenger = await User.findOne({ rfid_uid });

        if (!passenger) {
            return res.status(404).json({ error: "Passenger not found" });
        }

        if (passenger.wallet_balance < fare) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        // Deduct fare
        passenger.wallet_balance -= fare;
        await passenger.save();

        res.json({
            message: "Scan successful",
            passenger_name: passenger.name,
            fare_deducted: fare,
            remaining_balance: passenger.wallet_balance
        });
    } catch (err) {
        console.error("Scan error:", err);
        res.status(500).json({ error: "Scan failed" });
    }
});

module.exports = router;
