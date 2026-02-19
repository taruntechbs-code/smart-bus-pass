import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PremiumCursor from "../components/PremiumCursor";
import Particles from "../components/Particles";
import DashboardSection from "../components/DashboardSection";
import StatCard from "../components/StatCard";
import {
    FaQrcode, FaUsers, FaMoneyBillWave, FaCheckCircle,
    FaWifi, FaStop, FaPlay, FaRupeeSign, FaHistory,
    FaUserCheck, FaTimesCircle, FaPlug, FaExclamationTriangle
} from "react-icons/fa";
import { useAuth } from "../context/Authcontext";
import { conductorAPI } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

// ── Socket.IO server URL (LAN IP for ESP32 compatibility) ──
const SOCKET_URL = "http://192.168.29.180:5000";

// ============================================================
//  TOAST NOTIFICATION SYSTEM
// ============================================================
function ToastContainer({ toasts, onDismiss }) {
    return (
        <div style={{
            position: "fixed", top: "24px", right: "24px",
            zIndex: 10000, display: "flex", flexDirection: "column", gap: "10px",
            pointerEvents: "none", maxWidth: "380px"
        }}>
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 80, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 80, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        onClick={() => onDismiss(toast.id)}
                        style={{
                            pointerEvents: "auto",
                            background: toast.type === "success"
                                ? "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(6,95,70,0.95))"
                                : toast.type === "error"
                                    ? "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(153,27,27,0.95))"
                                    : "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(29,78,216,0.95))",
                            color: "#fff",
                            padding: "14px 20px",
                            borderRadius: "14px",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            lineHeight: 1.4
                        }}
                    >
                        {toast.type === "success" ? <FaCheckCircle size={18} /> :
                            toast.type === "error" ? <FaTimesCircle size={18} /> :
                                <FaWifi size={18} />}
                        <span>{toast.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================================
//  CONDUCTOR DASHBOARD
// ============================================================
export default function Conductor() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    // Toasts
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);

    const addToast = useCallback((message, type = "info") => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Dashboard stats
    const [stats, setStats] = useState({ scans_today: 0, total_collected: 0, active_passengers: 0 });
    const [dashboardLoading, setDashboardLoading] = useState(true);

    // Scanning state machine
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState("idle"); // idle | scanning | found | error
    const [scannedUID, setScannedUID] = useState(null);
    const [passenger, setPassenger] = useState(null);
    const [scanError, setScanError] = useState("");
    const [scanControlLoading, setScanControlLoading] = useState(false);

    // ESP32 connection status
    const [esp32Connected, setEsp32Connected] = useState(false);

    // Fare modal
    const [showFareModal, setShowFareModal] = useState(false);
    const [fareAmount, setFareAmount] = useState("");
    const [deducting, setDeducting] = useState(false);
    const [deductResult, setDeductResult] = useState(null);

    // Scan history (live, last 5)
    const [scanHistory, setScanHistory] = useState([]);

    // 🔒 Route Protection
    useEffect(() => {
        if (!authLoading && !user) navigate("/login");
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    // 🔌 Socket.IO setup (persistent connection)
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("🟢 Conductor connected to Socket.IO:", socket.id);
            // Register as conductor dashboard
            socket.emit("dashboard_register");
            addToast("Connected to server", "success");
        });

        socket.on("disconnect", (reason) => {
            console.log("🔴 Socket disconnected:", reason);
            setEsp32Connected(false);
            addToast("Server connection lost. Reconnecting...", "error");
        });

        socket.on("reconnect", () => {
            console.log("🟢 Socket reconnected");
            socket.emit("dashboard_register");
            addToast("Reconnected to server", "success");
        });

        // ── ESP32 online/offline status ──
        socket.on("esp32_status", (data) => {
            setEsp32Connected(data.connected);
            if (data.connected) {
                console.log("🟢 ESP32 is online");
            } else {
                console.log("🔴 ESP32 is offline");
                addToast("ESP32 scanner disconnected", "error");
            }
        });

        // ── NEW SCAN from ESP32 (relayed by server with passenger data) ──
        socket.on("new_scan", (data) => {
            console.log("📡 New scan received:", data);
            setScannedUID(data.uid);
            setPassenger(data.passenger);
            setScanStatus("found");
            setScanError("");
            setShowFareModal(true);
            addToast(`Card scanned: ${data.passenger.name}`, "info");
        });

        // ── SCAN ERROR (card not linked, etc.) ──
        socket.on("scan_error", (data) => {
            console.log("❌ Scan error:", data);
            setScanError(data.error || "Unknown scan error");
            setScanStatus("error");
            setPassenger(null);
            addToast(data.error || "Scan error", "error");

            // Auto-reset error status after 4 seconds
            setTimeout(() => {
                setScanStatus(prev => prev === "error" ? "scanning" : prev);
                setScanError("");
            }, 4000);
        });

        // ── FARE DEDUCTED (live stats update) ──
        socket.on("fare_deducted", (data) => {
            console.log("💰 Fare deducted event:", data);
            // Refresh stats from server for accuracy
            fetchDashboardData();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            setDashboardLoading(true);
            const statsRes = await conductorAPI.getStats();
            setStats(statsRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setDashboardLoading(false);
        }
    };

    // ── START SCANNING (API call to backend → Socket.io → ESP32) ──
    const handleStartScanning = async () => {
        setScanControlLoading(true);
        try {
            const res = await conductorAPI.scanControl("start");
            setIsScanning(true);
            setScanStatus("scanning");
            setPassenger(null);
            setScannedUID(null);
            setScanError("");
            setDeductResult(null);
            setFareAmount("");

            if (!res.data.esp32_connected) {
                addToast("Scanning started but ESP32 is not connected", "error");
            } else {
                addToast("Scanning activated — waiting for card tap", "success");
            }
        } catch (err) {
            console.error("Failed to start scanning:", err);
            addToast("Failed to start scanning", "error");
        } finally {
            setScanControlLoading(false);
        }
    };

    // ── STOP SCANNING ──
    const handleStopScanning = async () => {
        setScanControlLoading(true);
        try {
            await conductorAPI.scanControl("stop");
            setIsScanning(false);
            setScanStatus("idle");
            setShowFareModal(false);
            setPassenger(null);
            setScannedUID(null);
            setScanError("");
            setDeductResult(null);
            setFareAmount("");
            addToast("Scanning stopped", "info");
        } catch (err) {
            console.error("Failed to stop scanning:", err);
            addToast("Failed to stop scanning", "error");
        } finally {
            setScanControlLoading(false);
        }
    };

    // ── DEDUCT FARE ──
    const handleDeductFare = async () => {
        if (!fareAmount || isNaN(fareAmount) || Number(fareAmount) <= 0) {
            setDeductResult({ success: false, message: "Please enter a valid fare amount." });
            return;
        }

        setDeducting(true);
        setDeductResult(null);

        try {
            const res = await conductorAPI.deductFare(scannedUID, Number(fareAmount));
            const { passenger_name, fare_deducted, new_balance } = res.data;

            setDeductResult({ success: true, message: `₹${fare_deducted} deducted successfully!`, new_balance });

            // Update history
            const historyEntry = {
                id: Date.now(),
                name: passenger_name,
                fare: fare_deducted,
                balance: new_balance,
                timestamp: new Date()
            };
            setScanHistory(prev => [historyEntry, ...prev].slice(0, 5));

            // Update stats locally (will also refresh from socket event)
            setStats(prev => ({
                ...prev,
                scans_today: prev.scans_today + 1,
                total_collected: prev.total_collected + fare_deducted
            }));

            addToast(`₹${fare_deducted} deducted from ${passenger_name}`, "success");

            // Auto-close modal and reset after 2s
            setTimeout(() => {
                setShowFareModal(false);
                setFareAmount("");
                setDeductResult(null);
                setPassenger(null);
                setScannedUID(null);
                setScanStatus("scanning");
            }, 2000);

        } catch (err) {
            const msg = err.response?.data?.error || "Failed to deduct fare.";
            setDeductResult({ success: false, message: msg });
            addToast(msg, "error");
        } finally {
            setDeducting(false);
        }
    };

    const handleCloseFareModal = () => {
        setShowFareModal(false);
        setFareAmount("");
        setDeductResult(null);
        setPassenger(null);
        setScannedUID(null);
        if (isScanning) setScanStatus("scanning");
    };

    if (authLoading) return null;

    return (
        <div className="dashboard-page">
            <PremiumCursor />
            <Particles />
            <Navbar />

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            <div className="dashboard-container">
                {dashboardLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ textAlign: "center", marginTop: "100px" }}
                    >
                        <h2 style={{ color: "white" }}>Loading Dashboard...</h2>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Welcome + ESP32 Status */}
                        <DashboardSection>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                                <div>
                                    <h1 className="dashboard-title">Welcome, {user?.name}!</h1>
                                    <p className="dashboard-subtitle">Conductor Fare Collection Terminal</p>
                                </div>
                                {/* ESP32 Connection Badge */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "8px",
                                        background: esp32Connected
                                            ? "rgba(16,185,129,0.15)"
                                            : "rgba(239,68,68,0.15)",
                                        border: `1px solid ${esp32Connected ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                                        borderRadius: "30px",
                                        padding: "8px 18px",
                                        fontSize: "0.85rem",
                                        color: esp32Connected ? "#10b981" : "#ef4444",
                                        fontWeight: 600
                                    }}
                                >
                                    <FaPlug size={14} />
                                    ESP32 {esp32Connected ? "Online" : "Offline"}
                                    <span style={{
                                        width: "8px", height: "8px", borderRadius: "50%",
                                        background: esp32Connected ? "#10b981" : "#ef4444",
                                        animation: esp32Connected ? "pulse 2s infinite" : "none"
                                    }} />
                                </motion.div>
                            </div>
                        </DashboardSection>

                        {/* ── SCANNING INTERFACE ── */}
                        <DashboardSection title="Fare Collection" glass>
                            <div className="conductor-scan-area">

                                {/* Start / Stop Button */}
                                <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                                    {!isScanning ? (
                                        <motion.button
                                            className="scan-start-btn"
                                            onClick={handleStartScanning}
                                            disabled={scanControlLoading}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{ opacity: scanControlLoading ? 0.7 : 1 }}
                                        >
                                            <FaPlay style={{ marginRight: "10px" }} />
                                            {scanControlLoading ? "Starting..." : "Start Scanning"}
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            className="scan-stop-btn"
                                            onClick={handleStopScanning}
                                            disabled={scanControlLoading}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{ opacity: scanControlLoading ? 0.7 : 1 }}
                                        >
                                            <FaStop style={{ marginRight: "10px" }} />
                                            {scanControlLoading ? "Stopping..." : "Stop Scanning"}
                                        </motion.button>
                                    )}
                                </div>

                                {/* Status Badge */}
                                <AnimatePresence mode="wait">
                                    {scanStatus === "scanning" && (
                                        <motion.div
                                            key="scanning"
                                            className="scan-status-badge scanning"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <span className="scan-pulse-dot" />
                                            {esp32Connected
                                                ? "Waiting for passenger card scan..."
                                                : "Scanning active — ESP32 not connected"}
                                        </motion.div>
                                    )}

                                    {scanStatus === "error" && (
                                        <motion.div
                                            key="error"
                                            className="scan-status-badge error"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <FaTimesCircle style={{ marginRight: "8px" }} />
                                            {scanError}
                                        </motion.div>
                                    )}

                                    {scanStatus === "idle" && (
                                        <motion.div
                                            key="idle"
                                            className="scan-status-badge idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <FaQrcode style={{ marginRight: "8px", opacity: 0.6 }} />
                                            Press "Start Scanning" to begin fare collection
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Passenger Card (shown after scan, before modal) */}
                                <AnimatePresence>
                                    {passenger && !showFareModal && (
                                        <motion.div
                                            className="passenger-card"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <div className="passenger-card-icon">
                                                <FaUserCheck size={32} color="#10b981" />
                                            </div>
                                            <h3 className="passenger-card-name">{passenger.name}</h3>
                                            <div className="passenger-card-details">
                                                <div className="passenger-detail-row">
                                                    <span className="detail-label">RFID Status</span>
                                                    <span className="detail-value rfid-ok">✅ Linked</span>
                                                </div>
                                                <div className="passenger-detail-row">
                                                    <span className="detail-label">Wallet Balance</span>
                                                    <span className="detail-value balance">₹{passenger.wallet_balance}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </DashboardSection>

                        {/* ── STATS ── */}
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

                        {/* ── RECENT SCAN HISTORY ── */}
                        <DashboardSection title="Recent Passenger Scans" glass>
                            <div className="scan-history-list">
                                {scanHistory.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="scan-history-empty"
                                    >
                                        <FaHistory size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
                                        <p>No scans yet. Start scanning to see history.</p>
                                    </motion.div>
                                ) : (
                                    <AnimatePresence>
                                        {scanHistory.map((entry, idx) => (
                                            <motion.div
                                                key={entry.id}
                                                className="scan-history-item"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <div className="shi-name">
                                                    <FaUserCheck color="#10b981" style={{ marginRight: "8px" }} />
                                                    {entry.name}
                                                </div>
                                                <div className="shi-fare">-₹{entry.fare}</div>
                                                <div className="shi-balance">₹{entry.balance} left</div>
                                                <div className="shi-time">
                                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </DashboardSection>
                    </motion.div>
                )}
            </div>

            {/* ── FARE DEDUCTION MODAL ── */}
            <AnimatePresence>
                {showFareModal && passenger && (
                    <motion.div
                        className="fare-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="fare-modal-box"
                            initial={{ scale: 0.85, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 40 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                            {/* Passenger summary inside modal */}
                            <div className="fare-modal-passenger">
                                <div className="fare-modal-avatar">
                                    {passenger.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="fare-modal-pname">{passenger.name}</p>
                                    <p className="fare-modal-balance">Balance: ₹{passenger.wallet_balance}</p>
                                </div>
                            </div>

                            <h2 className="fare-modal-title">Enter Fare Amount (₹)</h2>

                            <div className="fare-input-wrapper">
                                <span className="fare-rupee-symbol">₹</span>
                                <input
                                    type="number"
                                    className="fare-input"
                                    placeholder="0"
                                    value={fareAmount}
                                    onChange={(e) => setFareAmount(e.target.value)}
                                    min="1"
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && !deducting && handleDeductFare()}
                                />
                            </div>

                            {/* Balance warning */}
                            {fareAmount && Number(fareAmount) > passenger.wallet_balance && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        color: "#ef4444", fontSize: "0.85rem", marginTop: "8px",
                                        display: "flex", alignItems: "center", gap: "6px"
                                    }}
                                >
                                    <FaExclamationTriangle size={14} />
                                    Fare exceeds available balance (₹{passenger.wallet_balance})
                                </motion.div>
                            )}

                            {/* Result message */}
                            <AnimatePresence>
                                {deductResult && (
                                    <motion.div
                                        className={`fare-result ${deductResult.success ? "success" : "error"}`}
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {deductResult.success ? "✅" : "❌"} {deductResult.message}
                                        {deductResult.success && (
                                            <span style={{ display: "block", fontSize: "0.85rem", marginTop: "4px", opacity: 0.8 }}>
                                                New Balance: ₹{deductResult.new_balance}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="fare-modal-actions">
                                <motion.button
                                    className="fare-btn deduct"
                                    onClick={handleDeductFare}
                                    disabled={deducting || !!deductResult?.success}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    {deducting ? "Deducting..." : "Deduct from Wallet"}
                                </motion.button>
                                <motion.button
                                    className="fare-btn cancel"
                                    onClick={handleCloseFareModal}
                                    disabled={deducting}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Cancel
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
