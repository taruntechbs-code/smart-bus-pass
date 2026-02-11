import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import PremiumCursor from "../components/PremiumCursor";
import Particles from "../components/Particles";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        console.log("🔐 Frontend Login Attempt");
        console.log("Email:", email);
        console.log("Password length:", password.length);

        try {
            const user = await login(email, password);

            console.log("✅ Login successful!");
            console.log("User:", user);
            console.log("Role:", user.role);

            // Redirect based on role
            if (user.role === "passenger") {
                console.log("→ Redirecting to /passenger");
                navigate("/passenger");
            } else if (user.role === "conductor") {
                console.log("→ Redirecting to /conductor");
                navigate("/conductor");
            } else {
                console.log("⚠️ Unknown role:", user.role);
            }
        } catch (err) {
            console.error("❌ Login failed:", err);
            console.error("Error response:", err.response?.data);
            setError(err.response?.data?.error || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <PremiumCursor />
            <Particles />

            <motion.div
                className="glass-card"
                initial={{ opacity: 0, y: 60, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <h1 className="logo-title">Smart Bus Pass</h1>
                <p className="tagline">Cashless • Fast • Secure</p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="login-btn"
                        disabled={loading}
                        type="submit"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </motion.button>
                </form>

                <p className="signup-link">
                    Don't have an account? <Link to="/signup">Sign up</Link>
                </p>
            </motion.div>
        </div>
    );
}
