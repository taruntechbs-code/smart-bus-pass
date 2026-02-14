import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PremiumCursor from "../components/PremiumCursor";
import Particles from "../components/Particles";
import DashboardSection from "../components/DashboardSection";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";
import { FaQrcode, FaUsers, FaMoneyBillWave, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import { useAuth } from "../context/Authcontext";
import { conductorAPI } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

// Initialize Socket.IO connection
const socket = io("http://localhost:5000"); // Adjust URL if deployed

export default function Conductor() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [lastScan, setLastScan] = useState(null);
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

    // 🔌 Socket.IO Listener
    useEffect(() => {
        socket.on("connect", () => {
            console.log("🟢 Connected to Socket.IO Server");
        });

        socket.on("rfidScan", (data) => {
            console.log("📡 RFID Scan Received:", data);
            setLastScan(data);

            // Update local stats immediately
            if (data.status === "SUCCESS") {
                setStats(prev => ({
                    ...prev,
                    scans_today: prev.scans_today + 1,
                    total_collected: prev.total_collected + data.fare
                }));
                // Add to recent scans list
                setScans(prev => [{
                    id: Date.now(),
                    passenger_uid: data.uid, // Or name if available?
                    passenger_name: data.name,
                    time: new Date().toLocaleTimeString(),
                    amount: data.fare
                }, ...prev]);
            }
        });

        return () => {
            socket.off("connect");
            socket.off("rfidScan");
        };
    }, []);

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
                                <p className="dashboard-subtitle">Live RFID Scanner Terminal</p>
                            </div>
                        </DashboardSection>

                        {/* 📡 Live Scan Interface */}
                        <DashboardSection title="Live Scan Feed" glass>
                            <div className="scan-interface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <AnimatePresence mode="wait">
                                    {lastScan ? (
                                        <motion.div
                                            key={lastScan.timestamp} // Key changes on new scan
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="scan-result-card"
                                            style={{
                                                background: lastScan.status === "SUCCESS" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                border: `1px solid ${lastScan.status === "SUCCESS" ? "#10b981" : "#ef4444"}`,
                                                padding: '2rem',
                                                borderRadius: '20px',
                                                width: '100%',
                                                maxWidth: '500px',
                                                textAlign: 'center',
                                                boxShadow: `0 0 30px ${lastScan.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                                            }}
                                        >
                                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                                                {lastScan.status === "SUCCESS" ? <FaCheckCircle color="#10b981" /> :
                                                    lastScan.status === "LOW_BALANCE" ? <FaExclamationTriangle color="#f59e0b" /> :
                                                        <FaTimesCircle color="#ef4444" />}
                                            </div>

                                            <h2 style={{ color: 'white', marginBottom: '5px' }}>
                                                {lastScan.status === "SUCCESS" ? "Scan Successful" :
                                                    lastScan.status === "LOW_BALANCE" ? "Low Balance" : "Scan Failed"}
                                            </h2>

                                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', margin: '10px 0' }}>
                                                UID: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{lastScan.uid}</span>
                                            </p>

                                            {lastScan.name && (
                                                <p style={{ color: '#60a5fa', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                    {lastScan.name}
                                                </p>
                                            )}

                                            {lastScan.status === "SUCCESS" && (
                                                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                                                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>Fare Deducted: <span style={{ color: '#f87171' }}>-₹{lastScan.fare}</span></p>
                                                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>New Balance: <span style={{ color: '#10b981' }}>₹{lastScan.balance}</span></p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                                            <FaQrcode size={50} style={{ marginBottom: '15px', opacity: 0.5 }} />
                                            <p>Waiting for RFID Scan...</p>
                                        </div>
                                    )}
                                </AnimatePresence>
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
                                            key={scan.id || index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <div className="scan-info">
                                                <p className="scan-passenger">{scan.passenger_name || `UID: ${scan.passenger_uid}`}</p>
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
