import { motion } from "framer-motion";

export default function ActionButton({
    children,
    icon: Icon,
    onClick,
    variant = "primary",
    fullWidth = false,
    loading = false
}) {
    const variants = {
        primary: {
            background: "linear-gradient(90deg, #2563eb, #3b82f6)",
            hoverShadow: "0 0 25px rgba(59, 130, 246, 0.7)",
        },
        secondary: {
            background: "rgba(255, 255, 255, 0.12)",
            hoverShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
        },
        success: {
            background: "linear-gradient(90deg, #059669, #10b981)",
            hoverShadow: "0 0 25px rgba(16, 185, 129, 0.7)",
        },
        danger: {
            background: "linear-gradient(90deg, #dc2626, #ef4444)",
            hoverShadow: "0 0 25px rgba(239, 68, 68, 0.7)",
        },
    };

    return (
        <motion.button
            className={`action-btn ${fullWidth ? "full-width" : ""}`}
            style={{ background: variants[variant].background }}
            onClick={onClick}
            disabled={loading}
            whileHover={{
                boxShadow: variants[variant].hoverShadow,
                scale: 1.02
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            {Icon && <Icon className="btn-icon" />}
            {loading ? "Loading..." : children}
        </motion.button>
    );
}
