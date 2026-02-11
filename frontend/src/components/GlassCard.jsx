import { motion } from "framer-motion";

export default function GlassCard({ title, subtitle, children }) {
    return (
        <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8 }}
        >
            <h1 className="logo-title">{title}</h1>
            {subtitle && <p className="tagline">{subtitle}</p>}

            {children}
        </motion.div>
    );
}
