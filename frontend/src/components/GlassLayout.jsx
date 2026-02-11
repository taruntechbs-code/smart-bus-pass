import PremiumCursor from "./PremiumCursor";
import Particles from "./Particles";

export default function GlassLayout({ children }) {
    return (
        <div className="auth-page">
            <PremiumCursor />
            <Particles />
            {children}
        </div>
    );
}
