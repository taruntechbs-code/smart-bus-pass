const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { encrypt } = require("../utils/encryption");

const router = express.Router();

// ================= SIGNUP =================
router.post("/signup", async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        if (!name || !phone || !email || !password || !role) {
            return res.status(400).json({ error: "All fields required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            phone: encrypt(phone),
            email: encrypt(email),
            password: hashedPassword,
            role
        });

        await user.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Signup failed" });
    }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
    try {
        const { password } = req.body;

        const user = await User.findOne();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router;
