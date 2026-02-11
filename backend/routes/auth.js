const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { encrypt, decrypt } = require("../utils/encryption");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ================= SIGNUP =================
router.post("/signup", async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        console.log("📝 SIGNUP REQUEST RECEIVED");
        console.log("Name:", name);
        console.log("Email:", email);
        console.log("Phone:", phone);
        console.log("Role:", role);
        console.log("Password length:", password?.length);

        if (!name || !phone || !email || !password || !role) {
            console.log("❌ Missing fields");
            return res.status(400).json({ error: "All fields required" });
        }

        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase().trim();
        console.log("📧 Normalized email:", normalizedEmail);

        // Check if user already exists
        const users = await User.find();
        const existingUser = users.find(u => {
            try {
                return decrypt(u.email).toLowerCase().trim() === normalizedEmail;
            } catch (err) {
                return false;
            }
        });

        if (existingUser) {
            console.log("❌ Email already registered:", normalizedEmail);
            return res.status(400).json({ error: "Email already registered" });
        }

        // Hash password
        console.log("🔒 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("✅ Password hashed successfully");
        console.log("Hash length:", hashedPassword.length);

        const user = new User({
            name,
            phone: encrypt(phone),
            email: encrypt(normalizedEmail),
            password: hashedPassword,
            role
        });

        await user.save();
        console.log("✅ User created successfully");
        console.log("User ID:", user._id);
        console.log("User name:", user.name);
        console.log("User role:", user.role);

        res.status(201).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (err) {
        console.error("💥 SIGNUP ERROR:", err);
        res.status(500).json({ error: "Signup failed" });
    }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("\n🔐 ========== LOGIN REQUEST ==========");
        console.log("Request body:", req.body);
        console.log("Email received:", email);
        console.log("Password received:", password ? "YES (length: " + password.length + ")" : "NO");

        if (!email || !password) {
            console.log("❌ Missing email or password");
            return res.status(400).json({ error: "Email and password required" });
        }

        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase().trim();
        console.log("📧 Normalized email:", normalizedEmail);

        // Find user by decrypting emails
        const users = await User.find();
        console.log("👥 Total users in database:", users.length);

        let user = null;
        for (let i = 0; i < users.length; i++) {
            try {
                const decryptedEmail = decrypt(users[i].email).toLowerCase().trim();
                console.log(`🔍 Checking user ${i + 1}:`, decryptedEmail);

                if (decryptedEmail === normalizedEmail) {
                    user = users[i];
                    console.log("✅ USER FOUND!");
                    console.log("User ID:", user._id);
                    console.log("User name:", user.name);
                    console.log("User role:", user.role);
                    console.log("Stored password hash:", user.password);
                    break;
                }
            } catch (err) {
                console.error("❌ Decryption error for user:", err.message);
            }
        }

        if (!user) {
            console.log("❌ USER NOT FOUND for email:", normalizedEmail);
            return res.status(404).json({ error: "User not found" });
        }

        // Compare passwords
        console.log("\n🔑 COMPARING PASSWORDS...");
        console.log("Plain password:", password);
        console.log("Stored hash:", user.password);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log("🔑 Password match result:", isMatch);

        if (!isMatch) {
            console.log("❌ PASSWORD MISMATCH");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("✅ PASSWORD MATCHED!");

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log("✅ JWT TOKEN GENERATED");
        console.log("Token:", token.substring(0, 50) + "...");

        const responseData = {
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: decrypt(user.email),
                phone: decrypt(user.phone),
                role: user.role,
                wallet_balance: user.wallet_balance,
                rfid_uid: user.rfid_uid
            }
        };

        console.log("✅ LOGIN SUCCESSFUL!");
        console.log("Response:", JSON.stringify(responseData, null, 2));
        console.log("========================================\n");

        res.json(responseData);
    } catch (err) {
        console.error("💥 LOGIN ERROR:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

// ================= GET CURRENT USER =================
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: decrypt(user.email),
            phone: decrypt(user.phone),
            role: user.role,
            wallet_balance: user.wallet_balance,
            rfid_uid: user.rfid_uid
        });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

module.exports = router;
