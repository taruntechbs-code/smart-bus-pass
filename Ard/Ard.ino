#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

/* ========= WIFI DETAILS ========= */
const char* ssid     = "OnePlus 12R";        // your hotspot / wifi
const char* password = "12345678";

/* ========= BACKEND API ========= */
const char* serverUrl = "http://10.141.228.102:5000/api/rfid/scan";

/* ========= PINS ========= */
#define SS_PIN     21
#define RST_PIN    22
#define BUZZER_PIN 15

#define SDA_LCD 4
#define SCL_LCD 5

/* ========= OBJECTS ========= */
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* ========= UTILS ========= */
void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

/* ========= WIFI ========= */
void connectWiFi() {
  lcd.clear();
  lcd.print("Connecting WiFi");

  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  lcd.clear();
  lcd.print("WiFi Connected");
  beep(200);
  delay(1000);
}

/* ========= SETUP ========= */
void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);

  Wire.begin(SDA_LCD, SCL_LCD);
  lcd.init();
  lcd.backlight();

  SPI.begin();
  mfrc522.PCD_Init();

  lcd.setCursor(0, 0);
  lcd.print("Smart Bus Pass");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");
  delay(1500);

  connectWiFi();

  lcd.clear();
  lcd.print("Scan Card...");
}

/* ========= LOOP ========= */
void loop() {

  // Wait for card
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Read UID
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.println("UID: " + uid);

  lcd.clear();
  lcd.print("Processing...");
  beep(150);

  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"uid\":\"" + uid + "\"}";
    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      String response = http.getString();
      Serial.println(response);

      if (response.indexOf("SUCCESS") >= 0) {
        lcd.clear();
        lcd.print("Payment OK");
        beep(300);
      }
      else if (response.indexOf("LOW_BALANCE") >= 0) {
        lcd.clear();
        lcd.print("Low Balance");
        beep(100); delay(100); beep(100);
      }
      else if (response.indexOf("USER_NOT_FOUND") >= 0) {
        lcd.clear();
        lcd.print("Invalid Card");
        beep(500);
      }
      else {
        lcd.clear();
        lcd.print("Denied");
        beep(400);
      }

    } else {
      lcd.clear();
      lcd.print("Server Error");
      beep(600);
    }

    http.end();
  }
  else {
    lcd.clear();
    lcd.print("WiFi Lost");
    beep(600);
  }

  delay(3000);
  lcd.clear();
  lcd.print("Scan Card...");
  mfrc522.PICC_HaltA();
}
