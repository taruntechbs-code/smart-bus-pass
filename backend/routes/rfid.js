const express = require("express");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const router = express.Router();

const FARE = 10;

router.post("/scan", async (req, res) => {
    try {
        const { uid } = req.body;

        const user = await User.findOne({ rfidUid: uid });
        if (!user) {
            return res.json({ status: "INVALID_CARD" });
        }

        const wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet || wallet.balance < FARE) {
            return res.json({ status: "LOW_BALANCE" });
        }

        wallet.balance -= FARE;
        await wallet.save();

        await Transaction.create({
            userId: user._id,
            type: "DEBIT",
            amount: FARE,
            description: "Bus Fare Deduction"
        });

        res.json({
            status: "SUCCESS",
            balance: wallet.balance
        });

    } catch (err) {
        res.status(500).json({ status: "ERROR" });
    }
});

module.exports = router;
