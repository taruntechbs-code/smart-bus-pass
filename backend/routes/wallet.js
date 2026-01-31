const express = require("express");
const router = express.Router();

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/authMiddleware");

// ===============================
// GET WALLET BALANCE
// ===============================
router.get("/balance", auth, async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ userId: req.user.id });

        if (!wallet) {
            wallet = await Wallet.create({ userId: req.user.id });
        }

        res.json({
            balance: wallet.balance
        });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// ===============================
// RECHARGE WALLET
// ===============================
router.post("/recharge", auth, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ userId: req.user.id });

        if (!wallet) {
            wallet = await Wallet.create({ userId: req.user.id });
        }

        wallet.balance += amount;
        wallet.lastUpdated = new Date();
        await wallet.save();

        await Transaction.create({
            userId: req.user.id,
            type: "RECHARGE",
            amount,
            balanceAfter: wallet.balance
        });

        res.json({
            msg: "Wallet recharged successfully",
            balance: wallet.balance
        });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// ===============================
// DEDUCT FARE (CONDUCTOR)
// ===============================
router.post("/deduct", auth, async (req, res) => {
    try {
        const { passengerId, fare } = req.body;

        if (!passengerId || !fare) {
            return res.status(400).json({ msg: "Missing fields" });
        }

        let wallet = await Wallet.findOne({ userId: passengerId });

        if (!wallet || wallet.balance < fare) {
            return res.status(400).json({ msg: "Insufficient balance" });
        }

        wallet.balance -= fare;
        wallet.lastUpdated = new Date();
        await wallet.save();

        await Transaction.create({
            userId: passengerId,
            type: "DEBIT",
            amount: fare,
            balanceAfter: wallet.balance
        });

        res.json({
            msg: "Fare deducted successfully",
            balance: wallet.balance
        });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
