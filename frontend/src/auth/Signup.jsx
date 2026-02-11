import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";
import GlassLayout from "../components/GlassLayout";
import GlassCard from "../components/GlassCard";

export default function Signup() {
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "passenger",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signup(form);
            alert("Account created successfully! Please login.");
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.error || "Signup failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassLayout>
            <GlassCard
                title="Create Account"
                subtitle="Join Smart Bus Pass Today"
            >
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        placeholder="Full Name"
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                        required
                    />

                    <input
                        type="tel"
                        placeholder="Phone Number"
                        value={form.phone}
                        onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                        }
                        required
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                        required
                    />

                    <select
                        className="role-select"
                        value={form.role}
                        onChange={(e) =>
                            setForm({ ...form, role: e.target.value })
                        }
                    >
                        <option value="passenger">Passenger</option>
                        <option value="conductor">Conductor</option>
                    </select>

                    <button className="login-btn" disabled={loading}>
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <p className="signup-link">
                    Already have an account? <Link to="/">Login</Link>
                </p>
            </GlassCard>
        </GlassLayout>
    );
}
