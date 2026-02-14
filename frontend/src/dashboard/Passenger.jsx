import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PremiumCursor from "../components/PremiumCursor";
import Particles from "../components/Particles";
import DashboardSection from "../components/DashboardSection";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";
import { FaWallet, FaBus, FaRoute, FaPlus, FaHistory } from "react-icons/fa";
import { useAuth } from "../context/Authcontext";
import { passengerAPI, paymentAPI } from "../api/api";
import { motion } from "framer-motion";
import { loadRazorpayScript } from "../utils/razorpay";
import { io } from "socket.io-client";

export default function Passenger() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [wallet, setWallet] = useState({ balance: 0 });
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    // Recharge Modal States
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState("");
    const [waitingForScan, setWaitingForScan] = useState(false);

    useEffect(() => {
        const socket = io("http://localhost:5000");

        socket.on("rfid_scanned", async (data) => {
            if (!waitingForScan) return;

            try {
                // Auto link scanned UID
                const res = await passengerAPI.linkRFIDByScan(data.uid);
                alert("✅ RFID Linked Automatically!");
                setWaitingForScan(false);
                window.location.reload();
            } catch (err) {
                alert("❌ Linking Failed: " + (err.response?.data?.error || err.message));
                setWaitingForScan(false);
            }
        });

        return () => socket.disconnect();
    }, [waitingForScan]);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
            return;
        }

        if (user) fetchDashboardData();
    }, [user, authLoading, navigate]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const [walletRes, tripsRes] = await Promise.all([
                passengerAPI.getWallet(),
                passengerAPI.getTrips(),
            ]);

            setWallet(walletRes.data);
            setTrips(tripsRes.data.trips || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Handle RFID Linking (Auto-Scan Mode)
    const handleRFIDLink = () => {
        alert("📡 Please scan your RFID card now... (Waiting for scan)");
        setWaitingForScan(true);
    };

    // ✅ Recharge Flow
    const startRecharge = async () => {
        if (!rechargeAmount || isNaN(rechargeAmount) || rechargeAmount <= 0) {
            alert("Please enter a valid amount greater than 0.");
            return;
        }

        try {
            // 1. Load Razorpay Script
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                alert("Razorpay SDK failed to load.");
                return;
            }

            // 2. Create Order
            const orderRes = await paymentAPI.createOrder(Number(rechargeAmount));
            const { order, key_id } = orderRes.data;

            if (!order || !key_id) {
                alert("Order creation failed.");
                return;
            }

            // 3. Razorpay Options
            const options = {
                key: key_id,
                amount: order.amount,
                currency: "INR",
                name: "Smart Bus Pass",
                description: "Wallet Recharge",
                order_id: order.id,

                handler: async function (response) {
                    try {
                        const verifyRes = await paymentAPI.verifyPayment(response);

                        if (verifyRes.data.success) {
                            alert(
                                `✅ Recharge Successful! New Balance: ₹${verifyRes.data.new_balance}`
                            );
                            fetchDashboardData();
                        } else {
                            alert("❌ Payment Verification Failed.");
                        }
                    } catch (err) {
                        console.error("Verification Error:", err);
                        alert("❌ Error verifying payment.");
                    }
                },

                // ✅ Fix name format issue
                prefill: {
                    name: (user?.name || "Passenger").replace(/[^a-zA-Z ]/g, ""),
                    email: user?.email || "",
                    contact: user?.phone || "",
                },

                theme: {
                    color: "#6C63FF",
                },
            };

            // 4. Open Razorpay Popup
            const rzp1 = new window.Razorpay(options);

            rzp1.on("payment.failed", function (response) {
                alert("❌ Payment Failed: " + response.error.description);
            });

            rzp1.open();

            // Close Modal
            setShowRechargeModal(false);
            setRechargeAmount("");
        } catch (error) {
            console.error("Recharge Error:", error);
            alert("❌ Failed to initiate recharge.");
        }
    };

    if (authLoading) return null;

    return (
        <div className="dashboard-page">
            <PremiumCursor />
            <Particles />
            <Navbar />

            <div className="dashboard-container">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ textAlign: "center", marginTop: "100px" }}
                    >
                        <h2>Loading Dashboard...</h2>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Welcome */}
                        <DashboardSection>
                            <h1 className="dashboard-title">Welcome, {user?.name}!</h1>
                            <p className="dashboard-subtitle">
                                Here's your travel overview
                            </p>
                        </DashboardSection>

                        {/* Stats */}
                        <DashboardSection title="Your Stats">
                            <div className="stats-grid">
                                <StatCard
                                    icon={FaWallet}
                                    title="Wallet Balance"
                                    value={`₹${wallet.balance || 0}`}
                                    subtitle="Available funds"
                                    variant="blue"
                                />

                                <StatCard
                                    icon={FaBus}
                                    title="Trips Today"
                                    value={
                                        trips.filter(
                                            (t) =>
                                                new Date(t.date).toDateString() ===
                                                new Date().toDateString()
                                        ).length
                                    }
                                    subtitle="Journeys completed"
                                    variant="cyan"
                                />

                                <StatCard
                                    icon={FaRoute}
                                    title="Total Trips"
                                    value={trips.length}
                                    subtitle="All time"
                                    variant="purple"
                                />
                            </div>
                        </DashboardSection>

                        {/* Quick Actions */}
                        <DashboardSection title="Quick Actions">
                            <div className="quick-actions-grid">
                                <button className="quick-btn recharge" onClick={() => setShowRechargeModal(true)}>
                                    ➕ Recharge Wallet
                                </button>

                                <button className="quick-btn history">
                                    📜 View History
                                </button>
                            </div>
                        </DashboardSection>

                        {/* ✅ RFID Card Status */}
                        <DashboardSection title="RFID Card Status">
                            <div className="rfid-status-box">
                                {user?.rfid_uid_hash ? (
                                    <p className="rfid-linked">✅ RFID Already Linked</p>
                                ) : (
                                    <>
                                        <p className="rfid-not-linked">❌ No RFID Linked Yet</p>
                                        <button className="rfid-link-btn" onClick={handleRFIDLink}>
                                            {waitingForScan ? "📡 Scanning..." : "Link RFID Card Now"}
                                        </button>

                                        {waitingForScan && (
                                            <p style={{ color: "#facc15", marginTop: "10px", fontSize: "14px", fontWeight: "600" }}>
                                                Waiting for card scan...
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </DashboardSection>

                        {/* ✅ Premium Recharge Modal */}
                        {showRechargeModal && (
                            <div className="recharge-modal-overlay">
                                <div className="recharge-modal-box">
                                    <h2 className="recharge-title">Recharge Wallet</h2>

                                    <input
                                        type="number"
                                        placeholder="Enter amount ₹"
                                        value={rechargeAmount}
                                        onChange={(e) => setRechargeAmount(e.target.value)}
                                        className="recharge-input"
                                    />

                                    <div className="recharge-actions">
                                        <button
                                            className="recharge-btn proceed"
                                            onClick={startRecharge}
                                        >
                                            Proceed
                                        </button>

                                        <button
                                            className="recharge-btn cancel"
                                            onClick={() => setShowRechargeModal(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Trips */}
                        <DashboardSection title="Recent Trips" glass>
                            <div className="recent-trips">
                                {trips.length === 0 ? (
                                    <p style={{ textAlign: "center" }}>No trips yet</p>
                                ) : (
                                    trips.slice(0, 5).map((trip, idx) => (
                                        <div className="trip-item" key={idx}>
                                            <p>{trip.route}</p>
                                            <p>₹{trip.fare}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DashboardSection>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
