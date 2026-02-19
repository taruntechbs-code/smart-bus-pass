/*
 * ============================================================
 *  Smart Bus Pass — ESP32 RFID Scanner (Socket.IO Version)
 * ============================================================
 *  Hardware: ESP32 + MFRC522 RFID + 16x2 I2C LCD + Buzzer
 *
 *  Libraries needed (install via Arduino Library Manager):
 *    - MFRC522              (miguelbalboa)
 *    - LiquidCrystal_I2C    (Frank de Brabander)
 *    - ArduinoJson          (Benoit Blanchon) v6+
 *    - WebSockets           (Markus Sattler)  — includes SocketIOclient
 *
 *  Flow:
 *    1. Connects to WiFi → connects to backend Socket.IO server.
 *    2. Sends "esp32_register" with device key.
 *    3. Waits for "scan_mode {enabled: true}" from conductor.
 *    4. When enabled, reads RFID cards and emits "new_card_detected {uid}".
 *    5. Listens for "scan_result" from server for LCD feedback.
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

/* ========= WIFI CONFIG ========= */
const char* ssid     = "OnePlus 12R";
const char* password = "12345678";

/* ========= SERVER CONFIG ========= */
const char* serverHost = "192.168.29.180";
const int   serverPort = 5000;

/* ========= DEVICE KEY ========= */
const char* deviceKey = "BUSPASS_ESP32_KEY_2026";

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
bool scanEnabled    = false;   // Controlled by conductor dashboard
bool serverConnected = false;  // Socket.IO connection status
unsigned long lastReconnectAttempt = 0;
unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN = 2500; // ms between scans

/* ========= BEEP PATTERNS ========= */
void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void beepSuccess() {
  beep(150);
  delay(80);
  beep(150);
}

void beepError() {
  beep(100);
  delay(80);
  beep(100);
  delay(80);
  beep(300);
}

void beepShort() {
  beep(80);
}

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
  lcdShow("Connecting WiFi", "Please wait...");
  Serial.print("[WiFi] Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    lcdShow("WiFi Connected", WiFi.localIP().toString().c_str());
    beep(200);
    delay(1200);
  } else {
    Serial.println("\n[WiFi] FAILED! Restarting...");
    lcdShow("WiFi FAILED!", "Rebooting...");
    beepError();
    delay(2000);
    ESP.restart();
  }
}

/* ========= SOCKET.IO EVENT HANDLER ========= */
void socketIOEvent(socketIOmessageType_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case sIOtype_CONNECT:
      Serial.println("[SIO] Connected to server!");
      serverConnected = true;
      lcdShow("Server Connected", "Registering...");

      // Send esp32_register event with device key
      {
        StaticJsonDocument<200> doc;
        JsonArray arr = doc.to<JsonArray>();
        arr.add("esp32_register");  // Event name

        JsonObject data = arr.createNestedObject();
        data["deviceKey"] = deviceKey;

        String output;
        serializeJson(doc, output);
        socketIO.sendEVENT(output);
        Serial.println("[SIO] Sent esp32_register");
      }
      break;

    case sIOtype_DISCONNECT:
      Serial.println("[SIO] Disconnected from server!");
      serverConnected = false;
      scanEnabled = false;
      lcdShow("Server Lost", "Reconnecting...");
      beep(500);
      break;

    case sIOtype_EVENT:
      {
        // Parse incoming event
        String msg = String((char*)payload);
        Serial.print("[SIO] Event: ");
        Serial.println(msg);

        // Parse JSON array: ["eventName", {data}]
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, msg);
        if (error) {
          Serial.print("[SIO] JSON parse error: ");
          Serial.println(error.c_str());
          break;
        }

        const char* eventName = doc[0];

        // ── REGISTER ACK ──
        if (strcmp(eventName, "register_ack") == 0) {
          bool success = doc[1]["success"] | false;
          const char* message = doc[1]["message"] | "Unknown";

          if (success) {
            Serial.println("[SIO] Registration successful!");
            lcdShow("Registered OK", "Waiting cmd...");
            beepSuccess();
          } else {
            Serial.print("[SIO] Registration failed: ");
            Serial.println(message);
            lcdShow("Auth FAILED!", message);
            beepError();
          }
        }

        // ── SCAN MODE (from conductor) ──
        else if (strcmp(eventName, "scan_mode") == 0) {
          bool enabled = doc[1]["enabled"] | false;
          scanEnabled = enabled;

          if (enabled) {
            Serial.println("[SIO] Scan mode: ACTIVE");
            lcdShow("Scan ACTIVE", "Tap card...");
            beepSuccess();
          } else {
            Serial.println("[SIO] Scan mode: PAUSED");
            lcdShow("Scan PAUSED", "Waiting cmd...");
            beepShort();
          }
        }

        // ── SCAN RESULT (passenger lookup feedback from server) ──
        else if (strcmp(eventName, "scan_result") == 0) {
          bool success = doc[1]["success"] | false;
          const char* message = doc[1]["message"] | "";

          if (success) {
            const char* name = doc[1]["name"] | "Passenger";
            int balance = doc[1]["balance"] | 0;

            Serial.printf("[SIO] Scan result: %s, Balance: %d\n", name, balance);

            // Show passenger name (truncated to 16 chars)
            char line1[17];
            snprintf(line1, sizeof(line1), "%s", name);

            char line2[17];
            snprintf(line2, sizeof(line2), "Bal: Rs.%d", balance);

            lcdShow(line1, line2);
            beepSuccess();

            // Keep display for 3 seconds, then back to scan mode
            delay(3000);
            if (scanEnabled) {
              lcdShow("Scan ACTIVE", "Tap card...");
            }
          } else {
            // Not found or error
            if (strcmp(message, "NOT FOUND") == 0) {
              lcdShow("Card Not", "Linked!");
              beepError();
            } else {
              lcdShow("Scan Error", message);
              beepError();
            }
            delay(2500);
            if (scanEnabled) {
              lcdShow("Scan ACTIVE", "Tap card...");
            }
          }
        }
      }
      break;

    case sIOtype_ERROR:
      Serial.print("[SIO] Error: ");
      Serial.println((char*)payload);
      break;

    case sIOtype_ACK:
      Serial.print("[SIO] ACK: ");
      Serial.println((char*)payload);
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

/* ========= SETUP ========= */
void setup() {
  Serial.begin(115200);
  Serial.println("\n========== Smart Bus Pass ESP32 ==========");

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

  // Connect Socket.IO
  lcdShow("Connecting to", "Server...");
  socketIO.begin(serverHost, serverPort, "/socket.io/?EIO=4");
  socketIO.onEvent(socketIOEvent);

  Serial.println("[SIO] Socket.IO client started");
  Serial.printf("[SIO] Connecting to %s:%d\n", serverHost, serverPort);
}

/* ========= MAIN LOOP ========= */
void loop() {
  // Handle Socket.IO communication
  socketIO.loop();

  // Check WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 10000) { // Try every 10s
      lastReconnectAttempt = now;
      Serial.println("[WiFi] Lost connection, reconnecting...");
      lcdShow("WiFi Lost!", "Reconnecting...");
      beep(300);
      WiFi.reconnect();
    }
    return; // Don't try scanning without WiFi
  }

  // Only scan when enabled by conductor
  if (!scanEnabled || !serverConnected) return;

  // Cooldown between scans
  if (millis() - lastScanTime < SCAN_COOLDOWN) return;

  // Check for RFID card
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Read UID
  String uid = readCardUID();
  lastScanTime = millis();

  Serial.println("\n=======================");
  Serial.print("[RFID] Scanned UID: ");
  Serial.println(uid);

  // Show processing on LCD
  lcdShow("Processing...", uid.c_str());
  beep(150);

  // Emit to server via Socket.IO
  StaticJsonDocument<200> doc;
  JsonArray arr = doc.to<JsonArray>();
  arr.add("new_card_detected");

  JsonObject data = arr.createNestedObject();
  data["uid"] = uid;

  String output;
  serializeJson(doc, output);
  socketIO.sendEVENT(output);

  Serial.println("[SIO] Sent new_card_detected: " + uid);

  // Halt card for next read
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
