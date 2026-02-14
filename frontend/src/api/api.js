import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor - attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("🔑 Token attached to request:", token.substring(0, 20) + "...");
        }
        console.log("📡 API Request:", config.method.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        console.error("❌ Request interceptor error:", error);
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => {
        console.log("✅ API Response:", response.config.url, response.status);
        return response;
    },
    (error) => {
        console.error("❌ API Error:", error.response?.status, error.response?.data);

        if (error.response?.status === 401) {
            console.log("🚪 401 Unauthorized - clearing auth and redirecting");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/";
        }
        return Promise.reject(error);
    }
);

// Auth API helpers
export const authAPI = {
    signup: (data) => {
        console.log("📝 API: Signup request", data);
        return api.post("/auth/signup", data);
    },
    login: (data) => {
        console.log("🔐 API: Login request", { email: data.email, passwordLength: data.password?.length });
        return api.post("/auth/login", data);
    },
    getMe: () => {
        console.log("👤 API: Get current user");
        return api.get("/auth/me");
    },
};

// Passenger API helpers
export const passengerAPI = {
    getProfile: () => api.get("/passenger/profile"),
    getWallet: () => api.get("/passenger/wallet"),
    getTrips: () => api.get("/passenger/trips"),
    recharge: (amount) => api.post("/passenger/recharge", { amount }),
    linkRFID: (uid) => api.post("/rfid/link", { uid }),
    linkRFIDByScan: (uid) => api.post("/rfid/link-scan", { uid }),
};

// Conductor API helpers
export const conductorAPI = {
    getProfile: () => api.get("/conductor/profile"),
    getScans: () => api.get("/conductor/scans"),
    getStats: () => api.get("/conductor/stats"),
    scanPassenger: (rfid_uid, fare) => api.post("/conductor/scan", { rfid_uid, fare }),
};


// Payment API helpers (Razorpay)
export const paymentAPI = {
    createOrder: (amount) => api.post("/payment/create-order", { amount }),
    verifyPayment: (data) => api.post("/payment/verify-payment", data),
};

export default api;
