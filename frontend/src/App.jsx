import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Login from "./auth/Login";
import Signup from "./auth/Signup";
import Passenger from "./dashboard/Passenger";
import Conductor from "./dashboard/Conductor";

import Navbar from "./components/Navbar";
import PageTransition from "./components/PageTransition";

import { useAuth } from "./context/Authcontext";

// Protected Route Component
function ProtectedRoute({ children, allowedRole }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="auth-page">
                <div className="glass-card">
                    <h2 style={{ color: "white" }}>Loading...</h2>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (allowedRole && user.role !== allowedRole) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    return children;
}

export default function App() {
    const { user } = useAuth();

    return (
        <BrowserRouter>
            {user && <Navbar />}

            <AnimatePresence mode="wait">
                <Routes>
                    {/* Auth Pages */}
                    <Route
                        path="/"
                        element={
                            user ? (
                                <Navigate to={`/${user.role}`} replace />
                            ) : (
                                <PageTransition>
                                    <Login />
                                </PageTransition>
                            )
                        }
                    />

                    <Route
                        path="/signup"
                        element={
                            user ? (
                                <Navigate to={`/${user.role}`} replace />
                            ) : (
                                <PageTransition>
                                    <Signup />
                                </PageTransition>
                            )
                        }
                    />

                    {/* Passenger Dashboard */}
                    <Route
                        path="/passenger"
                        element={
                            <ProtectedRoute allowedRole="passenger">
                                <PageTransition>
                                    <Passenger />
                                </PageTransition>
                            </ProtectedRoute>
                        }
                    />

                    {/* Conductor Dashboard */}
                    <Route
                        path="/conductor"
                        element={
                            <ProtectedRoute allowedRole="conductor">
                                <PageTransition>
                                    <Conductor />
                                </PageTransition>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AnimatePresence>
        </BrowserRouter>
    );
}
