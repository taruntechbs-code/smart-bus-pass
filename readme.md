# 🚌 Smart Bus Pass System (RFID + Wallet + Razorpay)

A full-stack **Smart Bus Pass Application** that enables passengers to travel cashless using RFID cards, a digital wallet, and a secure backend infrastructure.  
The system combines **IoT hardware**, **web dashboards**, and **FinTech integration** for a next-generation urban transport experience.

---

## 🚀 Key Features

### 👤 Passenger Dashboard
- View and monitor wallet balance in real time.
- Recharge wallet securely through Razorpay Checkout.
- View complete trip and transaction history.
- Automatically link RFID cards by simply scanning them (no manual entry).

### 👮 Conductor Dashboard
- Live RFID scan monitoring for each bus route.
- Instant passenger verification and fare deduction.
- Alerts for low-balance or unauthorized cards.
- Real-time passenger list and trip insights.

### 🔐 Security and Data Protection
- AES‑256 encryption for RFID UID and sensitive fields.
- SHA‑256 hashing for searchable UID lookups.
- JWT authentication with secure middleware.
- Role‑based access control (Admin, Passenger, Conductor).
- Helmet, rate limiting, and `x-device-key` for device-level security.

---

## 🏗️ Tech Stack

### Frontend
- ⚛️ React.js + Vite
- 🎨 Framer Motion Animations
- 🔌 Socket.IO Client
- 💳 Razorpay Checkout Integration

### Backend
- 🟢 Node.js + Express.js
- 🍃 MongoDB Atlas + Mongoose
- 📡 Socket.IO Server
- 🛠️ Razorpay Payment API

### Hardware
- 🔲 ESP32 Microcontroller
- 📶 MFRC522 RFID Reader
- 🖥️ I2C LCD Display + Buzzer

---

## ⚙️ System Architecture

RFID Card Scan → ESP32 → Backend (/api/rfid/scan)
↓
Socket.IO emits UID event
↓
Passenger Dashboard auto-links card
↓
Fare Deduction + Wallet Update
↓
Conductor Dashboard updates live

text

This architecture ensures low latency between RFID scans and real-time updates.

---

## 🔑 Environment Variables

Create a `.env` file inside `backend/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection

JWT_SECRET=your_jwt_secret_key
AES_SECRET=your_32_byte_aes_key

RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

ESP32_DEVICE_KEY=BUSPASS_ESP32_KEY_2026
```
🛠️ Installation & Setup
1️⃣ Clone Repository
bash
git clone https://github.com/yourusername/smart-bus-pass.git
cd smart-bus-pass
2️⃣ Backend Setup
bash
cd backend
npm install
npm start
Backend runs at
👉 http://localhost:5000

3️⃣ Frontend Setup
bash
cd frontend
npm install
npm run dev
Frontend runs at
👉 http://localhost:5173

📡 RFID + ESP32 Setup
Open your Arduino code for the ESP32.

Update the backend API endpoint:

cpp
const char* serverUrl = "http://192.168.xx.xx:5000/api/rfid/scan";
Connect MFRC522 RFID Reader module to the ESP32.

Flash the code using Arduino IDE.

On card scan, the ESP32 posts the RFID UID to the backend, triggering real-time updates in the web dashboards.

🔗 RFID Card Linking (Auto Mode)
Passenger Workflow:

Log in to Passenger Dashboard.

Click “Link RFID Card Now”.

Scan your card on ESP32 device.

UID connects automatically — no manual typing or database edits.

💳 Razorpay Wallet Recharge
Secure recharge using Razorpay Checkout.

Works in test or live mode depending on your API keys.

🧪 Manual Verification Checklist
✅ Passenger and Conductor account creation.
✅ RFID linking via physical scan.
✅ Wallet recharge successful through Razorpay.
✅ RFID card scan triggers automatic fare deduction.
✅ Conductor dashboard updates instantly.
✅ No data decryption or encoding errors.