import { motion } from "framer-motion";

export default function DashboardSection({ title, description, children, glass = false }) {
    return (
        <motion.section
            className={`dashboard-section ${glass ? "glass-bg" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            {title && (
                <div className="section-header">
                    <h2 className="section-title">{title}</h2>
                    {description && <p className="section-description">{description}</p>}
                </div>
            )}
            <div className="section-content">
                {children}
            </div>
        </motion.section>
    );
}
