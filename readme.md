🚌 Smart Bus Pass System (RFID + Wallet + Razorpay)
A full-stack Smart Bus Pass Application that enables passengers to travel cashless using RFID cards, a digital wallet, and a secure backend infrastructure.
The system brings together IoT hardware, web dashboards, and FinTech integration to build a next-generation urban transport experience.

🚀 Key Features
👤 Passenger Dashboard
View and monitor wallet balance in real time.

Recharge wallet securely through Razorpay Checkout.

View complete trip and transaction history.

Automatically link RFID cards by simply scanning them (no manual input).

👮 Conductor Dashboard
Live RFID scan monitoring for each bus route.

Instant passenger verification and fare deduction.

Alerts for low-balance or unauthorized cards.

Real-time passenger list and trip insights.

🔐 Security and Data Protection
AES‑256 encryption for storing RFID UIDs and sensitive data.

SHA‑256 hashing for searchable RFID lookups (non-reversible).

JWT authentication with middleware verification.

Role‑based access control (admins, passengers, conductors).

Helmet, rate limiting, and x-device-key for device-level API security.

🏗️ Tech Stack
Frontend
⚛️ React.js + Vite

🎨 Framer Motion for smooth UI animations

🔌 Socket.IO client for live communication

💳 Razorpay Checkout integration

Backend
🟢 Node.js + Express.js framework

🍃 MongoDB Atlas + Mongoose ODM

📡 Socket.IO server for live updates

🛠️ Razorpay SDK and payment API

Hardware
🔲 ESP32 Microcontroller

📶 MFRC522 RFID Reader Module

🖥️ I2C LCD Display + Buzzer system

⚙️ System Architecture
text
RFID Card Scan → ESP32 → Backend (/api/rfid/scan)
          ↓
     Socket.IO emits UID event
          ↓
Passenger Dashboard auto-links card
          ↓
  Fare Deduction + Wallet Update
          ↓
Conductor Dashboard updates live
This architecture ensures ultra‑fast communication between hardware and the frontend through WebSockets, offering a real‑time transit experience.

🔑 Environment Variables
Create a .env file inside the backend/ folder:

text
PORT=5000
MONGO_URI=your_mongodb_connection

JWT_SECRET=your_jwt_secret_key
AES_SECRET=your_32_byte_aes_key

RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

ESP32_DEVICE_KEY=BUSPASS_ESP32_KEY_2026
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

Test Card Details (for development):
Card: 4111 1111 1111 1111
Expiry: 12/30 | CVV: 123 | OTP: 123456

🧪 Manual Verification Checklist
✅ Passenger and Conductor account creation.
✅ RFID linking via physical scan.
✅ Wallet recharge successful through Razorpay.
✅ RFID card scan triggers automatic fare deduction.
✅ Conductor dashboard updates instantly.
✅ No data decryption or encoding errors.

🛡️ Database Reset (Development Mode)
If encryption keys or hashing algorithms are modified, old users may not decrypt properly.
Use these MongoDB commands to reset development data:

js
db.users.deleteMany({})
db.wallets.deleteMany({})
db.transactions.deleteMany({})
📌 Future Improvements
Admin panel for RFID unlink/reset and role management.

Dynamic fare calculation based on routes and distance.

Real-time wallet balance syncing without UI refresh.

Transaction receipts with analytics and export options.

Hardware GPS integration for trip history accuracy.

👨‍💻 Author
Tarun A
IIT Madras BS (Data Science & Programming)
Smart Transport | FinTech | IoT Enthusiast

Connect on LinkedIn or follow on GitHub ✨

⭐ Support
If you found this project insightful or used it in your institution, please give it a ⭐ on GitHub.
It motivates continued development of open transport innovations.

🧭 License
This project is MIT Licensed — feel free to explore, modify, and extend with credit.

💡 Suggestion
To make your GitHub page ultra-premium (“GitHub Pro Max” 🌟), consider adding:

📸 Project screenshots and UI previews

🎥 Demo video or YouTube walkthrough

⚙️ Detailed API endpoint documentation

🔋 Circuit diagram for hardware setup

🏷️ GitHub badges (Node.js, React, MongoDB, IoT)

Would you like me to add those “Pro Max” sections (screenshots, badges, and demo layout) next?

give copy paste like readme file
Sure — here’s your ready-to-copy README.md exactly formatted for GitHub.
Just copy from below and paste into your project root directory ✅

text
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
Backend runs at 👉 http://localhost:5000

3️⃣ Frontend Setup
bash
cd frontend
npm install
npm run dev
Frontend runs at 👉 http://localhost:5173

📡 RFID + ESP32 Setup
Open your Arduino code for the ESP32.

Update backend API URL:

cpp
const char* serverUrl = "http://192.168.xx.xx:5000/api/rfid/scan";
Connect MFRC522 RFID Reader to ESP32 pins.

Flash the code using Arduino IDE.

Scan RFID cards to trigger backend API and socket events.

🔗 RFID Card Auto-Linking
Passenger Workflow

Log in to Passenger Dashboard.

Click “Link RFID Card Now”.

Scan RFID card.

UID auto-links instantly to the logged-in account.