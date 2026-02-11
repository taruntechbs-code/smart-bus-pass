import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing token on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem("token");

        console.log("🔍 Checking auth...");
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            console.log("📡 Fetching user from token...");
            const { data } = await authAPI.getMe();
            console.log("✅ User loaded:", data);
            setUser(data);
        } catch (error) {
            console.error("❌ Auth check failed:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        } finally {
            setLoading(false);
        }
    };

    const signup = async (formData) => {
        const { data } = await authAPI.signup(formData);
        return data;
    };

    const login = async (email, password) => {
        const { data } = await authAPI.login({ email, password });

        // Store token and user
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);

        return data.user;
    };

    const logout = () => {
        console.log("🚪 Logging out...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
