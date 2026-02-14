const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { hashData, encryptData } = require("../utils/encryption");

const FARE = 10;

exports.scanRFID = async (req, res) => {
    try {
        const io = req.app.get("io"); // ✅ Declare io ONLY ONCE
        const { uid } = req.body; // Input UID

        if (!uid) return res.send("INVALID_CARD");

        // Lookup user by Hashed UID
        // Using hashData from utils/encryption to ensure consistency with User model
        const hashedUid = hashData(uid);

        // Emit Socket.IO Event for Auto-Linking (regardless of user existence)
        if (io) {
            io.emit("rfid_scanned", {
                uid,
                uidHash: hashedUid,
                timestamp: Date.now()
            });
        }

        const user = await User.findOne({ rfid_uid_hash: hashedUid });

        if (!user) {
            console.log(`❌ Card Scanned but User Not Found. UID: ${uid}`);
            return res.send("USER_NOT_FOUND");
        }

        // Find Wallet
        const wallet = await Wallet.findOne({ userId: user._id });

        if (!wallet) {
            console.log(`❌ Wallet not found for User: ${user.name}`);
            return res.send("ERROR");
        }

        if (wallet.balance < FARE) {
            console.log(`⚠️ Low Balance for User: ${user.name}. Balance: ${wallet.balance}`);
            return res.send("LOW_BALANCE");
        }

        // Deduct Fare and Save
        wallet.balance -= FARE;
        await wallet.save();

        // Sync User model balance
        user.wallet_balance = wallet.balance;
        await user.save();

        // Create Transaction
        await Transaction.create({
            userId: user._id,
            type: "DEBIT",
            amount: FARE,
            description: "Bus Fare Deduction (RFID)"
        });

        console.log(`✅ Fare Deducted. User: ${user.name}, New Balance: ${wallet.balance}`);

        // Emit Socket.IO Event
        if (io) {
            io.emit("rfidScan", {
                name: user.name,
                uid: uid,
                fare: FARE,
                balance: wallet.balance,
                status: "SUCCESS",
                timestamp: new Date()
            });
        }

        // Return plain text for ESP32
        res.send("SUCCESS");

    } catch (err) {
        console.error("RFID Scan Error:", err);
        res.send("ERROR");
    }
};

exports.linkRFID = async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ error: "UID is required" });
        }

        // req.user.id comes from authMiddleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Prevent re-linking
        if (user.rfid_uid_hash) {
            return res.status(400).json({
                error: "RFID already linked to this account",
            });
        }

        // Hash UID for checking duplicates
        const uidHash = hashData(uid);

        // Ensure card not already linked to another user
        const existing = await User.findOne({ rfid_uid_hash: uidHash });
        if (existing) {
            return res.status(400).json({
                error: "This RFID card is already assigned to another user",
            });
        }

        // Encrypt UID for storage
        const encryptedUID = encryptData(uid);

        user.rfid_uid = encryptedUID;
        user.rfid_uid_hash = uidHash;

        await user.save();

        return res.json({
            success: true,
            message: "RFID Card linked successfully",
        });

    } catch (err) {
        console.error("RFID Link Error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

exports.linkRFIDByScan = async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) return res.status(400).json({ error: "UID missing" });

        const user = await User.findById(req.user.id);

        if (user.rfid_uid_hash) {
            return res.status(400).json({ error: "RFID already linked" });
        }

        // Hash UID for checking duplicates
        const uidHash = hashData(uid);

        const existing = await User.findOne({ rfid_uid_hash: uidHash });
        if (existing) {
            return res.status(400).json({ error: "Card already assigned" });
        }

        // Encrypt and Save
        const encryptedUID = encryptData(uid);
        user.rfid_uid = encryptedUID;
        user.rfid_uid_hash = uidHash;

        await user.save();

        return res.json({
            success: true,
            message: "RFID Linked Successfully via Scan",
        });

    } catch (err) {
        console.error("Auto-Link Error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
