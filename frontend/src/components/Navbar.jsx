import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";

export default function Navbar({ role }) {
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className="navbar">
            {/* Left */}
            <div className="nav-left">
                <h2>🚌 Smart Bus Pass</h2>
            </div>

            {/* Right */}
            <div className="nav-right">
                <Link to="/">Home</Link>

                {role === "passenger" && <Link to="/passenger">Passenger</Link>}
                {role === "conductor" && <Link to="/conductor">Conductor</Link>}

                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>
        </nav>
    );
}
