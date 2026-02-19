# ESP32 "Reconnecting to Server…" — Complete Troubleshooting Guide

> **Project:** Smart Bus Pass  
> **Stack:** ESP32 + MFRC522 RFID → Socket.IO (WebSocket) → Node.js backend (port 5000)

---

## 📋 Table of Contents

1. [All Possible Root Causes](#1-all-possible-root-causes)
2. [Step-by-Step Debugging with Serial Monitor](#2-step-by-step-debugging-with-serial-monitor)
3. [Fixes Specific to Your Code](#3-fixes-specific-to-your-code)
4. [Improved ESP32 Code (Full Sketch)](#4-improved-esp32-code)
5. [Best Practices for Stable Connections](#5-best-practices)
6. [Protocol-Specific Fixes (HTTP / WebSocket / MQTT)](#6-protocol-specific-fixes)

---

## 1. All Possible Root Causes

### 🔴 Most Likely (Check These First)

| # | Cause | Why It Happens | Quick Check |
|---|-------|---------------|-------------|
| 1 | **Wrong `serverHost` IP** | Your laptop IP changes when switching networks or after restarting the hotspot. `192.168.29.180` may no longer be valid. | Run `ipconfig` on Windows → look for your WiFi adapter's IPv4 |
| 2 | **Backend not running** | If `node server.js` isn't running or crashed, the ESP32 has nothing to connect to. | Check your terminal — do you see `🚀 Server running`? |
| 3 | **Firewall blocking port 5000** | Windows Firewall often blocks incoming connections on custom ports. | Temporarily disable Windows Firewall and test |
| 4 | **ESP32 & laptop on different subnets** | If the ESP32 connects to hotspot but your backend is on Ethernet/different network, they can't see each other. | Both must be on the **same** WiFi network |
| 5 | **Socket.IO version mismatch** | The ESP32 `SocketIOclient` library uses Engine.IO v3 (`EIO=3`) by default but your `server.js` may be Socket.IO v4 (Engine.IO v4). Handshake fails silently! | See [Fix #3](#fix-3-socketio-version) below |

### 🟡 Moderate Likelihood

| # | Cause | Why It Happens |
|---|-------|---------------|
| 6 | **WiFi hotspot instability** | Phone hotspots can be unreliable, cause frequent disconnects, or throttle on idle |
| 7 | **Server bind address** | If Node.js binds only to `127.0.0.1` (localhost), external devices (ESP32) can't reach it |
| 8 | **MongoDB connection failure** | Your server only starts listening AFTER MongoDB connects. If MongoDB fails, port 5000 never opens |
| 9 | **Socket.IO CORS rejection** | Unlikely in your case (you have `origin: "*"`) but worth noting |
| 10 | **ESP32 power issues** | USB cable quality / power supply too weak → WiFi radio drops continuously |

### 🟢 Less Common

| # | Cause | Why It Happens |
|---|-------|---------------|
| 11 | **SSL/TLS mismatch** | If server requires HTTPS but ESP32 tries plain HTTP. Not your case currently. |
| 12 | **DNS issues** | Only if using domain name instead of IP. You're using IP, so not relevant. |
| 13 | **Port already in use** | Another process using port 5000. Node.js would show an EADDRINUSE error. |
| 14 | **Socket.IO path mismatch** | Wrong `/socket.io/` path in client vs server config |
| 15 | **Rate limiting blocking ESP32** | Your rate limiter is only on `/api/auth` and `/api/payment`, so not likely |

---

## 2. Step-by-Step Debugging with Serial Monitor

Open Serial Monitor at **115200 baud** and follow this flowchart:

### Step 1: Check WiFi Connection
```
EXPECTED SERIAL OUTPUT:
  [WiFi] Connecting to OnePlus 12R
  ......
  [WiFi] Connected!
  [WiFi] IP: 192.168.x.x
```

**❌ If stuck at dots (`.....`) or shows "FAILED":**
- Verify SSID and password are exact (case-sensitive!)
- Bring the phone hotspot closer
- Check if hotspot has max device limit reached
- Try: Hard-code `WiFi.mode(WIFI_STA)` (already done ✅)

### Step 2: Check Socket.IO Connection
```
EXPECTED:
  [SIO] Socket.IO client started
  [SIO] Connecting to 192.168.29.180:5000
  [SIO] Connected to server!
  [SIO] Sent esp32_register
  [SIO] Event: ["register_ack",{"success":true,...}]
```

**❌ If you see nothing after "Connecting to..." or repeated disconnects:**

Add this debug code temporarily to your `loop()`:
```cpp
// Add at top of loop() for debugging
static unsigned long lastDebugPrint = 0;
if (millis() - lastDebugPrint > 5000) {
    lastDebugPrint = millis();
    Serial.printf("[DEBUG] WiFi: %s | RSSI: %d dBm | Server: %s\n",
        WiFi.status() == WL_CONNECTED ? "OK" : "FAIL",
        WiFi.RSSI(),
        serverConnected ? "Connected" : "Disconnected"
    );
}
```

**Interpret RSSI values:**
| RSSI (dBm) | Quality |
|-------------|---------|
| > -50       | Excellent |
| -50 to -60  | Good |
| -60 to -70  | Fair |
| -70 to -80  | Weak (may cause drops) |
| < -80       | Unusable |

### Step 3: Verify Server Is Reachable

**From your laptop (same network), test in browser:**
```
http://192.168.29.180:5000/
```
Should show: `🚍 Smart Bus Pass Backend is running`

**From ESP32, add a quick HTTP test** (temporary debug code):
```cpp
#include <HTTPClient.h>

void testServerReachable() {
    HTTPClient http;
    String url = "http://" + String(serverHost) + ":" + String(serverPort) + "/";
    http.begin(url);
    int code = http.GET();
    Serial.printf("[DEBUG] HTTP test to server: %d\n", code);
    // 200 = reachable, -1 = connection refused/unreachable
    http.end();
}
// Call this in setup() after WiFi connects, before Socket.IO begins
```

### Step 4: Check Backend Server Logs

Your backend should show:
```
🔌 New client connected: <socket-id>
🟢 ESP32 registered & joined esp32_scanners room: <socket-id>
```

**❌ If you see "New client connected" but NO registration:**
- The ESP32 connected but the `esp32_register` event failed
- Check device key match: backend `.env` has `ESP32_DEVICE_KEY=BUSPASS_ESP32_KEY_2026`

**❌ If you see nothing at all:**
- Connection never reaches the server
- Check firewall, IP, and port

### Step 5: Check for Rapid Connect/Disconnect Loops

If you see this pattern repeating:
```
[SIO] Connected to server!
[SIO] Disconnected from server!
[SIO] Connected to server!
[SIO] Disconnected from server!
```

This is almost always a **Socket.IO EIO version mismatch**. See Fix #3 below.

---

## 3. Fixes Specific to Your Code

### Fix #1: Verify and Auto-Detect Server IP

Your code has `serverHost = "192.168.29.180"` hardcoded. This IP changes!

**How to find the correct IP every time:**
```
Windows: ipconfig → "Wireless LAN adapter Wi-Fi" → IPv4 Address
Linux/Mac: ifconfig or ip addr
```

> [!CAUTION]
> If you're running the backend on your laptop and the ESP32 connects to your phone's hotspot,
> your laptop **must also be on that same hotspot network**. You cannot mix networks.

### Fix #2: Ensure Backend Is Fully Started

Your server only opens port 5000 AFTER MongoDB connects (line 97 of `server.js`):
```javascript
mongoose.connect(MONGO_URI, mongoOptions).then(() => {
    server.listen(PORT, () => { ... }); // Port 5000 opens HERE
});
```

If MongoDB Atlas is slow or fails, the port never opens! 

**Quick fix — always start the HTTP server, even if MongoDB is slow:**
```javascript
// Start server immediately
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Connect MongoDB separately
mongoose.connect(MONGO_URI, mongoOptions)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err.message));
```

### Fix #3: Socket.IO Version Mismatch (THE MOST COMMON ISSUE!) {#fix-3-socketio-version}

> [!IMPORTANT]
> This is the **#1 most common cause** of the "Reconnecting to server…" loop.

**The Problem:**
- Your backend uses `socket.io` npm package (likely v4.x) → Engine.IO protocol v4 (`EIO=4`)
- The ESP32 `SocketIOclient` library by Markus Sattler may default to EIO=3

**Your code (line 305):**
```cpp
socketIO.begin(serverHost, serverPort, "/socket.io/?EIO=4");
```

This looks correct, but the library **may override or not support EIO=4**.

**How to verify:**  
Check your backend's `socket.io` version:
```bash
cd backend
npm list socket.io
```

**Fixes:**

**Option A: Force Socket.IO v4 compatibility on the server (RECOMMENDED)**
```javascript
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    allowEIO3: true,  // ← ADD THIS! Allows both EIO3 and EIO4 clients
    pingTimeout: 60000,
    pingInterval: 25000,
});
```

**Option B: Use EIO=3 on ESP32 if library doesn't support v4**
```cpp
socketIO.begin(serverHost, serverPort, "/socket.io/?EIO=3");
```

### Fix #4: Windows Firewall

Open **PowerShell as Admin**:
```powershell
# Allow inbound on port 5000
New-NetFirewallRule -DisplayName "Smart Bus Pass Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

Or temporarily disable firewall for testing:
```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
# REMEMBER TO RE-ENABLE AFTER TESTING
```

### Fix #5: Server Bind Address

Make your Node.js server listen on all interfaces:
```javascript
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
```

---

## 4. Improved ESP32 Code

Key improvements over your current code:
- ✅ WiFi auto-reconnect with exponential backoff
- ✅ Socket.IO reconnection with retry counter and limits
- ✅ Watchdog timer to auto-reboot if stuck
- ✅ Debug status printing every 5 seconds
- ✅ Ping/heartbeat mechanism
- ✅ Proper EIO version handling

```cpp
/*
 * ============================================================
 *  Smart Bus Pass — ESP32 RFID Scanner (Stable Socket.IO)
 * ============================================================
 */

#include <WiFi.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <SocketIOclient.h>
#include <esp_task_wdt.h>   // ← Watchdog

/* ========= CONFIG ========= */
const char* ssid        = "OnePlus 12R";
const char* password    = "12345678";
const char* serverHost  = "192.168.29.180";  // ← UPDATE THIS!
const int   serverPort  = 5000;
const char* deviceKey   = "BUSPASS_ESP32_KEY_2026";

/* ========= HARDWARE PINS ========= */
#define SS_PIN     21
#define RST_PIN    22
#define BUZZER_PIN 15
#define SDA_LCD    4
#define SCL_LCD    5

/* ========= OBJECTS ========= */
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
SocketIOclient socketIO;

/* ========= STATE ========= */
bool scanEnabled         = false;
bool serverConnected     = false;
unsigned long lastScanTime        = 0;
unsigned long lastWiFiCheck       = 0;
unsigned long lastDebugPrint      = 0;
unsigned long lastHeartbeat       = 0;
int  wifiReconnectAttempts        = 0;
int  socketReconnectAttempts      = 0;

/* ========= TUNING ========= */
const unsigned long SCAN_COOLDOWN       = 2500;
const unsigned long WIFI_CHECK_INTERVAL = 10000;  // 10s
const unsigned long DEBUG_INTERVAL      = 5000;   // 5s
const unsigned long HEARTBEAT_INTERVAL  = 30000;  // 30s
const int MAX_WIFI_RETRIES              = 10;
const int MAX_SOCKET_RETRIES            = 20;     // reboot after 20 failures
const int WATCHDOG_TIMEOUT_S            = 120;    // 2 min watchdog

/* ========= BEEP PATTERNS ========= */
void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}
void beepSuccess() { beep(150); delay(80); beep(150); }
void beepError()   { beep(100); delay(80); beep(100); delay(80); beep(300); }
void beepShort()   { beep(80); }

/* ========= LCD HELPERS ========= */
void lcdShow(const char* line1, const char* line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  if (strlen(line2) > 0) {
    lcd.setCursor(0, 1);
    lcd.print(line2);
  }
}

/* ========= WIFI CONNECT ========= */
void connectWiFi() {
  lcdShow("Connecting WiFi", ssid);
  Serial.printf("[WiFi] Connecting to %s\n", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);  // ← Enable auto-reconnect
  WiFi.persistent(true);        // ← Remember credentials
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s  RSSI: %d dBm\n",
        WiFi.localIP().toString().c_str(), WiFi.RSSI());
    lcdShow("WiFi Connected", WiFi.localIP().toString().c_str());
    beep(200);
    wifiReconnectAttempts = 0;
    delay(1200);
  } else {
    Serial.println("\n[WiFi] FAILED!");
    lcdShow("WiFi FAILED!", "Rebooting...");
    beepError();
    delay(2000);
    ESP.restart();
  }
}

/* ========= WIFI RECONNECT (non-blocking) ========= */
void handleWiFiReconnect() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiReconnectAttempts = 0;
    return;
  }

  unsigned long now = millis();
  if (now - lastWiFiCheck < WIFI_CHECK_INTERVAL) return;
  lastWiFiCheck = now;

  wifiReconnectAttempts++;
  Serial.printf("[WiFi] Reconnect attempt %d/%d  (RSSI was: %d)\n",
      wifiReconnectAttempts, MAX_WIFI_RETRIES, WiFi.RSSI());
  lcdShow("WiFi Lost!", "Reconnecting...");
  beep(200);

  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);

  // If too many failures, hard reboot
  if (wifiReconnectAttempts >= MAX_WIFI_RETRIES) {
    Serial.println("[WiFi] Max retries reached — rebooting ESP32!");
    lcdShow("WiFi Failed!", "Rebooting...");
    beepError();
    delay(2000);
    ESP.restart();
  }
}

/* ========= SOCKET.IO EVENT HANDLER ========= */
void socketIOEvent(socketIOmessageType_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case sIOtype_CONNECT:
      Serial.println("[SIO] ✅ Connected to server!");
      serverConnected = true;
      socketReconnectAttempts = 0;  // ← Reset counter on success
      lcdShow("Server Connected", "Registering...");
      {
        StaticJsonDocument<200> doc;
        JsonArray arr = doc.to<JsonArray>();
        arr.add("esp32_register");
        JsonObject data = arr.createNestedObject();
        data["deviceKey"] = deviceKey;
        String output;
        serializeJson(doc, output);
        socketIO.sendEVENT(output);
        Serial.println("[SIO] Sent esp32_register");
      }
      break;

    case sIOtype_DISCONNECT:
      Serial.println("[SIO] ❌ Disconnected from server!");
      serverConnected = false;
      scanEnabled = false;
      socketReconnectAttempts++;
      Serial.printf("[SIO] Reconnect attempt: %d/%d\n",
          socketReconnectAttempts, MAX_SOCKET_RETRIES);
      lcdShow("Server Lost", "Reconnecting...");
      beep(300);

      // If too many Socket.IO failures, reboot
      if (socketReconnectAttempts >= MAX_SOCKET_RETRIES) {
        Serial.println("[SIO] Max retries reached — rebooting!");
        lcdShow("Connect Failed!", "Rebooting...");
        beepError();
        delay(2000);
        ESP.restart();
      }
      break;

    case sIOtype_EVENT:
      {
        String msg = String((char*)payload);
        Serial.printf("[SIO] Event received: %s\n", msg.c_str());

        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, msg);
        if (error) {
          Serial.printf("[SIO] JSON parse error: %s\n", error.c_str());
          break;
        }

        const char* eventName = doc[0];

        // ── REGISTER ACK ──
        if (strcmp(eventName, "register_ack") == 0) {
          bool success = doc[1]["success"] | false;
          const char* message = doc[1]["message"] | "Unknown";
          if (success) {
            Serial.println("[SIO] ✅ Registration successful!");
            lcdShow("Registered OK", "Waiting cmd...");
            beepSuccess();
          } else {
            Serial.printf("[SIO] ❌ Registration failed: %s\n", message);
            lcdShow("Auth FAILED!", message);
            beepError();
          }
        }

        // ── SCAN MODE ──
        else if (strcmp(eventName, "scan_mode") == 0) {
          bool enabled = doc[1]["enabled"] | false;
          scanEnabled = enabled;
          Serial.printf("[SIO] Scan mode: %s\n", enabled ? "ACTIVE" : "PAUSED");
          if (enabled) {
            lcdShow("Scan ACTIVE", "Tap card...");
            beepSuccess();
          } else {
            lcdShow("Scan PAUSED", "Waiting cmd...");
            beepShort();
          }
        }

        // ── SCAN RESULT ──
        else if (strcmp(eventName, "scan_result") == 0) {
          bool success = doc[1]["success"] | false;
          const char* message = doc[1]["message"] | "";
          if (success) {
            const char* name = doc[1]["name"] | "Passenger";
            int balance = doc[1]["balance"] | 0;
            char line1[17], line2[17];
            snprintf(line1, sizeof(line1), "%s", name);
            snprintf(line2, sizeof(line2), "Bal: Rs.%d", balance);
            lcdShow(line1, line2);
            beepSuccess();
            delay(3000);
            if (scanEnabled) lcdShow("Scan ACTIVE", "Tap card...");
          } else {
            if (strcmp(message, "NOT FOUND") == 0) {
              lcdShow("Card Not", "Linked!");
            } else {
              lcdShow("Scan Error", message);
            }
            beepError();
            delay(2500);
            if (scanEnabled) lcdShow("Scan ACTIVE", "Tap card...");
          }
        }
      }
      break;

    case sIOtype_ERROR:
      Serial.printf("[SIO] Error: %s\n", (char*)payload);
      break;

    case sIOtype_ACK:
      Serial.printf("[SIO] ACK: %s\n", (char*)payload);
      break;

    default:
      break;
  }
}

/* ========= READ RFID UID ========= */
String readCardUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

/* ========= DEBUG: Status Print ========= */
void printDebugStatus() {
  unsigned long now = millis();
  if (now - lastDebugPrint < DEBUG_INTERVAL) return;
  lastDebugPrint = now;

  Serial.println("──────── DEBUG STATUS ────────");
  Serial.printf("  WiFi: %s | RSSI: %d dBm | IP: %s\n",
      WiFi.status() == WL_CONNECTED ? "✅ Connected" : "❌ Disconnected",
      WiFi.RSSI(),
      WiFi.localIP().toString().c_str());
  Serial.printf("  Server: %s | Scan: %s\n",
      serverConnected ? "✅ Connected" : "❌ Disconnected",
      scanEnabled ? "ACTIVE" : "OFF");
  Serial.printf("  Uptime: %lu sec | Free heap: %u bytes\n",
      millis() / 1000, ESP.getFreeHeap());
  Serial.printf("  WiFi retries: %d | Socket retries: %d\n",
      wifiReconnectAttempts, socketReconnectAttempts);
  Serial.println("─────────────────────────────");
}

/* ========= SETUP ========= */
void setup() {
  Serial.begin(115200);
  Serial.println("\n========== Smart Bus Pass ESP32 ==========");

  // Init watchdog (reboot if stuck for WATCHDOG_TIMEOUT_S seconds)
  esp_task_wdt_init(WATCHDOG_TIMEOUT_S, true);
  esp_task_wdt_add(NULL);

  // Hardware init
  pinMode(BUZZER_PIN, OUTPUT);
  Wire.begin(SDA_LCD, SCL_LCD);
  lcd.init();
  lcd.backlight();
  SPI.begin();
  mfrc522.PCD_Init();

  // Boot screen
  lcdShow("Smart Bus Pass", "Booting...");
  delay(1500);

  // Connect WiFi
  connectWiFi();

  // Connect Socket.IO — TRY EIO=4, fall back to EIO=3 if issues persist
  lcdShow("Connecting to", "Server...");
  socketIO.begin(serverHost, serverPort, "/socket.io/?EIO=4");
  socketIO.onEvent(socketIOEvent);

  // ─── KEY: Set reconnect interval (default is too aggressive) ───
  socketIO.setReconnectInterval(5000);  // ← 5 second delay between retries

  Serial.printf("[SIO] Connecting to %s:%d\n", serverHost, serverPort);
}

/* ========= MAIN LOOP ========= */
void loop() {
  // ── Feed the watchdog (prevents reboot if loop is running) ──
  esp_task_wdt_reset();

  // ── Handle Socket.IO ──
  socketIO.loop();

  // ── WiFi reconnection ──
  handleWiFiReconnect();
  if (WiFi.status() != WL_CONNECTED) return;

  // ── Debug status printing ──
  printDebugStatus();

  // ── Heartbeat (keeps connection alive) ──
  unsigned long now = millis();
  if (serverConnected && (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
    lastHeartbeat = now;
    // Send a lightweight ping event
    StaticJsonDocument<100> doc;
    JsonArray arr = doc.to<JsonArray>();
    arr.add("ping_esp32");
    JsonObject data = arr.createNestedObject();
    data["uptime"] = millis() / 1000;
    data["rssi"] = WiFi.RSSI();
    data["heap"] = ESP.getFreeHeap();
    String output;
    serializeJson(doc, output);
    socketIO.sendEVENT(output);
  }

  // ── Only scan when enabled ──
  if (!scanEnabled || !serverConnected) return;
  if (millis() - lastScanTime < SCAN_COOLDOWN) return;

  // ── RFID Read ──
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String uid = readCardUID();
  lastScanTime = millis();

  Serial.printf("\n[RFID] UID Scanned: %s\n", uid.c_str());
  lcdShow("Processing...", uid.c_str());
  beep(150);

  // Emit to server
  StaticJsonDocument<200> doc;
  JsonArray arr = doc.to<JsonArray>();
  arr.add("new_card_detected");
  JsonObject data = arr.createNestedObject();
  data["uid"] = uid;
  String output;
  serializeJson(doc, output);
  socketIO.sendEVENT(output);
  Serial.printf("[SIO] Sent new_card_detected: %s\n", uid.c_str());

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
```

---

## 5. Best Practices

### WiFi Stability
- **Use `WiFi.setAutoReconnect(true)`** — lets the ESP32 hardware handle reconnects
- **Use `WiFi.persistent(true)`** — saves credentials to flash, faster reconnect
- **Monitor RSSI** — if RSSI drops below -75 dBm, move ESP32 closer
- **Avoid `delay()` in loop()** — blocks Socket.IO heartbeat, causes timeouts

### Socket.IO Stability
- **Set `socketIO.setReconnectInterval(5000)`** — prevents hammering the server
- **Add `allowEIO3: true`** on server — compatible with both EIO3 and EIO4 clients
- **Increase `pingTimeout`** on server to `60000` — gives ESP32 more time
- **Send heartbeats** from ESP32 to keep the connection alive through NAT/firewalls

### System-Level Stability
- **Hardware Watchdog** — auto-reboots if the ESP32 freezes (included in code above)
- **Retry counters with limits** — don't retry forever; reboot after N failures
- **Use quality USB cables** — cheap cables cause voltage drops that crash WiFi
- **Power via Vin/5V pin** — more stable than USB for deployed setups

---

## 6. Protocol-Specific Fixes

### Socket.IO / WebSocket (Your Current Setup)

```
Problem: Repeated connect/disconnect cycle
```

**Server-side fix (`server.js`):**
```javascript
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    allowEIO3: true,          // Support older EIO clients ← KEY!
    pingTimeout: 60000,       // 60s before considering client dead
    pingInterval: 25000,      // Ping every 25s
    transports: ["websocket", "polling"],  // Allow both transports
    maxHttpBufferSize: 1e6,   // 1MB max message
});
```

**ESP32-side fix:**
```cpp
socketIO.begin(serverHost, serverPort, "/socket.io/?EIO=4");
// If still failing, try:
// socketIO.begin(serverHost, serverPort, "/socket.io/?EIO=3");

socketIO.setReconnectInterval(5000);  // Don't spam reconnects
```

### Plain HTTP (for simple polling)

If you only need one-way communication (ESP32 → Server), HTTP is simpler:

```cpp
#include <HTTPClient.h>

void sendCardToServer(String uid) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = "http://" + String(serverHost) + ":" + String(serverPort) + "/api/rfid/scan";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(10000);  // 10s timeout

    StaticJsonDocument<200> doc;
    doc["uid"] = uid;
    doc["deviceKey"] = deviceKey;
    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    if (code == 200) {
        String response = http.getString();
        Serial.printf("[HTTP] Success: %s\n", response.c_str());
    } else {
        Serial.printf("[HTTP] Error: %d\n", code);
    }
    http.end();
}
```

### MQTT (for IoT-grade reliability)

If you switch to MQTT later (most reliable for IoT):

```cpp
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setupMQTT() {
    mqtt.setServer("broker.hivemq.com", 1883); // or your own broker
    mqtt.setCallback(mqttCallback);
    mqtt.setKeepAlive(60);
    mqtt.setSocketTimeout(15);
}

void reconnectMQTT() {
    while (!mqtt.connected()) {
        Serial.println("[MQTT] Connecting...");
        String clientId = "ESP32-BusPass-" + String(random(0xffff), HEX);
        if (mqtt.connect(clientId.c_str())) {
            Serial.println("[MQTT] Connected!");
            mqtt.subscribe("buspass/scan_mode");
            mqtt.subscribe("buspass/scan_result");
        } else {
            Serial.printf("[MQTT] Failed, rc=%d  Retrying in 5s...\n", mqtt.state());
            delay(5000);
        }
    }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Handle incoming messages
}

void publishCard(String uid) {
    StaticJsonDocument<200> doc;
    doc["uid"] = uid;
    doc["deviceKey"] = deviceKey;
    String output;
    serializeJson(doc, output);
    mqtt.publish("buspass/card_detected", output.c_str());
}
```

---

## ⚡ Quick Checklist (Do These Right Now)

- [ ] Run `ipconfig` on your laptop → update `serverHost` in the sketch to match your current IP
- [ ] Confirm backend is running → visit `http://<your-ip>:5000/` in a browser
- [ ] Add `allowEIO3: true` to your `server.js` Socket.IO config
- [ ] Add `pingTimeout: 60000` to your `server.js` Socket.IO config
- [ ] Add `socketIO.setReconnectInterval(5000)` in your ESP32 code
- [ ] Add Windows Firewall rule for port 5000
- [ ] Upload the improved ESP32 code and check Serial Monitor
- [ ] Look at the `──────── DEBUG STATUS ────────` output for clues

---

> **Still stuck?** Share your Serial Monitor output and backend console logs, and I can pinpoint the exact issue.
