#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

/* ========= WIFI DETAILS ========= */
const char* ssid     = "OnePlus 12R";
const char* password = "12345678";

/* ========= BACKEND API ========= */
/* ✅ Updated with your Laptop IPv4 Address */
const char* serverUrl = "http://192.168.29.180:5000/api/rfid/scan";

/* ========= DEVICE KEY ========= */
const char* deviceKey = "BUSPASS_ESP32_KEY_2026";

/* ========= PINS ========= */
#define SS_PIN     21
#define RST_PIN    22
#define BUZZER_PIN 15

#define SDA_LCD 4
#define SCL_LCD 5

/* ========= OBJECTS ========= */
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* ========= BEEP FUNCTION ========= */
void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

/* ========= WIFI CONNECT ========= */
void connectWiFi() {
  lcd.clear();
  lcd.print("Connecting WiFi");

  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi Connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.print("WiFi Connected");
  beep(200);
  delay(1200);
}

/* ========= SETUP ========= */
void setup() {
  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);

  // LCD Init
  Wire.begin(SDA_LCD, SCL_LCD);
  lcd.init();
  lcd.backlight();

  // RFID Init
  SPI.begin();
  mfrc522.PCD_Init();

  lcd.clear();
  lcd.print("Smart Bus Pass");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");
  delay(1500);

  connectWiFi();

  lcd.clear();
  lcd.print("Scan Card...");
}

/* ========= MAIN LOOP ========= */
void loop() {

  // Wait for RFID Card
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Read UID Properly (with leading zeros)
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.println("\n=======================");
  Serial.println("📌 Scanned UID: " + uid);

  lcd.clear();
  lcd.print("Processing...");
  beep(150);

  // Check WiFi
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;
    http.begin(serverUrl);

    // Headers
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", deviceKey);

    // Payload
    String payload = "{\"uid\":\"" + uid + "\"}";

    // POST Request
    int httpCode = http.POST(payload);

    Serial.print("HTTP Code: ");
    Serial.println(httpCode);

    if (httpCode > 0) {

      String response = http.getString();
      Serial.println("Response: " + response);

      // Display Response
      if (response.indexOf("SUCCESS") >= 0) {
        lcd.clear();
        lcd.print("Payment OK");
        beep(300);
      }
      else if (response.indexOf("LOW_BALANCE") >= 0) {
        lcd.clear();
        lcd.print("Low Balance");
        beep(100); delay(120); beep(100);
      }
      else if (response.indexOf("USER_NOT_FOUND") >= 0) {
        lcd.clear();
        lcd.print("User Not Found");
        beep(500);
      }
      else if (response.indexOf("DEVICE_UNAUTHORIZED") >= 0) {
        lcd.clear();
        lcd.print("Device Blocked");
        beep(700);
      }
      else {
        lcd.clear();
        lcd.print("Denied");
        beep(400);
      }

    } else {

      // Network / Server unreachable
      Serial.println("❌ Server Error / Connection Failed");

      lcd.clear();
      lcd.print("Server Error");
      beep(700);
    }

    http.end();

  } else {

    Serial.println("❌ WiFi Lost");

    lcd.clear();
    lcd.print("WiFi Lost");
    beep(700);
  }

  // Reset for next scan
  delay(3000);
  lcd.clear();
  lcd.print("Scan Card...");

  mfrc522.PICC_HaltA();
}
