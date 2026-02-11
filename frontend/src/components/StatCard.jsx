import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, title, value, subtitle, variant = "blue" }) {
    const variants = {
        blue: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))",
        cyan: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.1))",
        purple: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.1))",
        green: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))",
        red: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))",
    };

    const iconColors = {
        blue: "#3b82f6",
        cyan: "#06b6d4",
        purple: "#a855f7",
        green: "#10b981",
        red: "#ef4444",
    };

    return (
        <motion.div
            className="stat-card"
            style={{ background: variants[variant] }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4, scale: 1.02 }}
        >
            {Icon && (
                <div className="stat-icon" style={{ color: iconColors[variant] }}>
                    <Icon />
                </div>
            )}
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <p className="stat-value">{value}</p>
                {subtitle && <p className="stat-subtitle">{subtitle}</p>}
            </div>
        </motion.div>
    );
}
