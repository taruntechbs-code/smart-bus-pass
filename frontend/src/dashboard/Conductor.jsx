import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PremiumCursor from "../components/PremiumCursor";
import Particles from "../components/Particles";
import DashboardSection from "../components/DashboardSection";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";
import { FaQrcode, FaUsers, FaMoneyBillWave, FaCheckCircle } from "react-icons/fa";
import { useAuth } from "../context/Authcontext";
import { conductorAPI } from "../api/api";
import { motion } from "framer-motion";

export default function Conductor() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [lastScan, setLastScan] = useState("Not scanned yet");
    const [scanning, setScanning] = useState(false);
    const [stats, setStats] = useState({
        scans_today: 0,
        total_collected: 0,
        active_passengers: 0
    });
    const [scans, setScans] = useState([]);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    // 🔒 Route Protection
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            setDashboardLoading(true);

            // Fetch stats and scans data
            const [statsRes, scansRes] = await Promise.all([
                conductorAPI.getStats(),
                conductorAPI.getScans()
            ]);

            setStats(statsRes.data);
            setScans(scansRes.data.scans || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setDashboardLoading(false);
        }
    };

    const handleScan = () => {
        setScanning(true);
        setTimeout(() => {
            // Simulate RFID scan
            const mockUID = Math.random().toString(36).substring(2, 10).toUpperCase();
            setLastScan(mockUID);
            setScanning(false);

            // In real implementation, you would call:
            // conductorAPI.scanPassenger(rfid_uid, fare)
        }, 1500);
    };

    if (authLoading) return null; // Or a splash screen

    return (
        <div className="dashboard-page">
            <PremiumCursor />
            <Particles />
            <Navbar />

            <div className="dashboard-container">
                {dashboardLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="loading-state"
                        style={{ textAlign: 'center', marginTop: '100px' }}
                    >
                        <h2 style={{ color: 'white', fontSize: '1.5rem' }}>Loading Dashboard...</h2>
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
                                <p className="dashboard-subtitle">Scan passenger RFID and manage fares</p>
                            </div>
                        </DashboardSection>

                        {/* Scan Interface */}
                        <DashboardSection title="RFID Scan Interface" glass>
                            <div className="scan-interface">
                                <motion.div
                                    className="scan-status"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <motion.div
                                        animate={scanning ? { rotate: 360 } : { rotate: 0 }}
                                        transition={{ duration: 1, repeat: scanning ? Infinity : 0, ease: "linear" }}
                                    >
                                        <FaQrcode className="scan-icon" />
                                    </motion.div>
                                    <p className="scan-label">Last Scanned UID</p>
                                    <p className="scan-uid">{lastScan}</p>
                                </motion.div>

                                <ActionButton
                                    icon={FaCheckCircle}
                                    variant="primary"
                                    onClick={handleScan}
                                    style={{
                                        width: '100%',
                                        maxWidth: '400px',
                                        margin: '0 auto',
                                        padding: '16px 32px',
                                        fontSize: '1.1rem',
                                        background: scanning
                                            ? 'linear-gradient(90deg, #10b981, #059669)'
                                            : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                                        boxShadow: scanning
                                            ? '0 0 30px rgba(16, 185, 129, 0.5)'
                                            : '0 0 30px rgba(59, 130, 246, 0.5)',
                                    }}
                                >
                                    {scanning ? "Scanning..." : "Start Scan"}
                                </ActionButton>
                            </div>
                        </DashboardSection>

                        {/* Stats Grid */}
                        <DashboardSection title="Today's Statistics">
                            <div className="stats-grid">
                                <StatCard
                                    icon={FaCheckCircle}
                                    title="Scans Today"
                                    value={stats.scans_today}
                                    subtitle="Passengers verified"
                                    variant="green"
                                />
                                <StatCard
                                    icon={FaMoneyBillWave}
                                    title="Total Collected"
                                    value={`₹${stats.total_collected}`}
                                    subtitle="Fare collected"
                                    variant="blue"
                                />
                                <StatCard
                                    icon={FaUsers}
                                    title="Active Passengers"
                                    value={stats.active_passengers}
                                    subtitle="Currently on board"
                                    variant="purple"
                                />
                            </div>
                        </DashboardSection>

                        {/* Recent Scans */}
                        <DashboardSection title="Recent Scans" glass>
                            <div className="recent-scans">
                                {scans.length === 0 ? (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{
                                            color: "rgba(255,255,255,0.6)",
                                            textAlign: "center",
                                            padding: "40px 20px",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        No scans yet. Start scanning to see history.
                                    </motion.p>
                                ) : (
                                    scans.slice(0, 5).map((scan, index) => (
                                        <motion.div
                                            className="scan-item"
                                            key={scan.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <div className="scan-info">
                                                <p className="scan-passenger">UID: {scan.passenger_uid}</p>
                                                <p className="scan-time">{scan.time}</p>
                                            </div>
                                            <p className="scan-amount">₹{scan.amount}</p>
                                        </motion.div>
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
