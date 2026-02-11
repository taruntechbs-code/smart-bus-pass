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
import { passengerAPI } from "../api/api";
import { motion } from "framer-motion";

export default function Passenger() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [wallet, setWallet] = useState({ balance: 0 });
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
            return;
        }
        if (user) {
            fetchDashboardData();
        }
    }, [user, authLoading, navigate]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch wallet and trips data
            const [walletRes, tripsRes] = await Promise.all([
                passengerAPI.getWallet(),
                passengerAPI.getTrips()
            ]);

            setWallet(walletRes.data);
            setTrips(tripsRes.data.trips || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async () => {
        const amount = prompt("Enter recharge amount:");
        if (!amount || isNaN(amount) || amount <= 0) {
            alert("Invalid amount");
            return;
        }

        try {
            const response = await passengerAPI.recharge(Number(amount));
            alert(response.data.message);
            fetchDashboardData(); // Refresh data
        } catch (error) {
            alert(error.response?.data?.error || "Recharge failed");
        }
    };

    if (authLoading) return null;

    // New Dashboard Layout
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
                        className="loading-state"
                        style={{ textAlign: 'center', marginTop: '100px' }}
                    >
                        <h2>Loading Dashboard...</h2>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Welcome Section */}
                        <DashboardSection>
                            <div className="welcome-section">
                                <h1 className="dashboard-title">Welcome, {user?.name}!</h1>
                                <p className="dashboard-subtitle">Here's your travel overview</p>
                            </div>
                        </DashboardSection>

                        {/* Stats Grid */}
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
                                    value={trips.filter(t => {
                                        const today = new Date().toDateString();
                                        return new Date(t.date).toDateString() === today;
                                    }).length}
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
                            <div className="actions-grid">
                                <ActionButton icon={FaPlus} variant="success" onClick={handleRecharge}>
                                    Recharge Wallet
                                </ActionButton>
                                <ActionButton icon={FaHistory} variant="secondary">
                                    View History
                                </ActionButton>
                            </div>
                        </DashboardSection>

                        {/* Recent Trips */}
                        <DashboardSection title="Recent Trips" glass>
                            <div className="recent-trips">
                                {trips.length === 0 ? (
                                    <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "20px" }}>
                                        No trips yet
                                    </p>
                                ) : (
                                    trips.slice(0, 5).map((trip) => (
                                        <div className="trip-item" key={trip.id}>
                                            <div className="trip-info">
                                                <p className="trip-route">{trip.route}</p>
                                                <p className="trip-time">{trip.time}</p>
                                            </div>
                                            <p className="trip-fare">₹{trip.fare}</p>
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
