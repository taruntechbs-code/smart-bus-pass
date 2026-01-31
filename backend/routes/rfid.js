const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// ----------------------------------
// RFID SCAN API (ESP32 calls this)
// ----------------------------------
router.post("/scan", async (req, res) => {
    try {
        const { uid, fare } = req.body;

        if (!uid || !fare) {
            return res.status(400).json({ msg: "Missing UID or fare" });
        }

        // Find passenger
        const user = await User.findOne({ rfid_uid: uid });

        if (!user) {
            return res.status(404).json({ msg: "Invalid card" });
        }

        // Find wallet
        const wallet = await Wallet.findOne({ userId: user._id });

        if (!wallet || wallet.balance < fare) {
            return res.status(400).json({ msg: "Insufficient balance" });
        }

        // Deduct fare
        wallet.balance -= fare;
        wallet.lastUpdated = new Date();
        await wallet.save();

        // Log transaction
        await Transaction.create({
            userId: user._id,
            type: "DEBIT",
            amount: fare,
            balanceAfter: wallet.balance
        });

        res.json({
            status: "success",
            passenger: user.name,
            balance: wallet.balance
        });

    } catch (err) {
        res.status(500).json({ msg: "RFID scan failed" });
    }
});

module.exports = router;
