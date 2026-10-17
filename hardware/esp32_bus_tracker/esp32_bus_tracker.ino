/**
 * ============================================================================
 * CBTS - COLLEGE BUS TRACKING SYSTEM (HARDWARE FIRMWARE)
 * ESP32 + NEO-6M GPS + SIM7600 4G LTE TELEMETRY FIRMWARE
 * ============================================================================
 * 
 * Target Hardware:
 *   1. ESP32 DevKit V1 (ESP-WROOM-32)
 *   2. NEO-6M GPS Module
 *   3. SIM7600 4G LTE Module
 *   4. LM2596 Step-Down Buck Converter (External regulated power)
 * 
 * Final Telemetry Flow:
 *   NEO-6M GPS -> ESP32 -> SIM7600 4G -> Internet -> CBTS Backend
 *   Endpoint: POST /api/bus/tracking/gps -> MongoDB -> CBTS Live Map
 * 
 * Required Arduino Libraries:
 *   - TinyGPSPlus (Install via Arduino Library Manager: "TinyGPSPlus by Mikal Hart")
 *   - HardwareSerial (Built into Arduino ESP32 Core)
 * 
 * IMPORTANT SAFETY NOTICE:
 *   Do NOT connect vehicle/bus battery directly to ESP32 or SIM7600.
 *   Verify LM2596 output voltage with a multimeter BEFORE connecting to any board.
 * ============================================================================
 */

#include <Arduino.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>

// ============================================================================
// 1. TEST MODE CONFIGURATION
// ============================================================================
// Change this value to test hardware incrementally step-by-step:
//   1 = ESP32 ONLY: Validates board boot, Serial Monitor, LED, memory
//   2 = ESP32 + NEO-6M: Validates GPS serial port, raw NMEA feed, satellite fix
//   3 = ESP32 + SIM7600: Validates AT commands, SIM card, signal strength, 4G
//   4 = ESP32 + GPS + SIM7600: Validates both UART ports simultaneously
//   5 = FULL TELEMETRY: End-to-end GPS fix -> HTTP POST -> CBTS Backend
#define CURRENT_TEST_MODE 1

// ============================================================================
// 2. HARDWARE PIN DEFINITIONS (ADJUST AFTER PHYSICAL BOARD INSPECTION)
// ============================================================================
// Note: Do NOT assume final pins until board revision & pinouts are confirmed.
// ESP32 default available hardware UART GPIOs:
// GPS UART (Serial2)
#define GPS_RX_PIN         16    // ESP32 RX2 connected to NEO-6M TX
#define GPS_TX_PIN         17    // ESP32 TX2 connected to NEO-6M RX
#define GPS_BAUD_RATE      9600  // Standard default baud for NEO-6M

// SIM7600 4G Modem UART (Serial1)
#define MODEM_RX_PIN       26    // ESP32 RX1 connected to SIM7600 TX
#define MODEM_TX_PIN       27    // ESP32 TX1 connected to SIM7600 RX
#define MODEM_BAUD_RATE    115200 // Standard default baud for SIM7600

// Optional Hardware Control Pins (-1 if not connected)
#define MODEM_PWR_PIN      4     // Pin to toggle SIM7600 power key (optional)
#define MODEM_RST_PIN      -1    // Pin to reset SIM7600 (optional)
#define STATUS_LED_PIN     2     // Onboard blue LED on most ESP32 DevKits

// ============================================================================
// 3. CBTS BACKEND & CELLULAR NETWORK CONFIGURATION
// ============================================================================
// Target Bus ID: Leave empty "" if relying on DEVICE_KEY or backend dev fallback (Bus 3)
// When ready, replace with the 24-character MongoDB ObjectId of the target bus
const char* BUS_ID = "";

// Device authentication key matching backend bus.tracking.deviceKey
const char* DEVICE_KEY = "ESP32-CBTS-BUS-01";

// Server ingestion endpoint matching POST /api/bus/tracking/gps
// Replace YOUR_SERVER_IP_OR_DOMAIN with your server's host or LAN IP (e.g., http://192.168.1.50:5000/api/bus/tracking/gps)
const char* SERVER_URL = "http://YOUR_SERVER/api/bus/tracking/gps";

// Cellular APN (Access Point Name) - DO NOT GUESS! Confirm with your 4G SIM provider.
// Common examples in India:
//   Airtel:   "airtelgprs.com"
//   Jio:      "jionet"
//   Vi (Vodafone/Idea): "viinternet" or "www"
//   BSNL:     "bsnlnet"
const char* APN = "YOUR_APN";

// Telemetry transmit interval (in milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 5000; // Send GPS update every 5 seconds

// ============================================================================
// 4. HARDWARE SERIAL INSTANCES & OBJECTS
// ============================================================================
HardwareSerial SerialGPS(2);    // ESP32 UART2 for NEO-6M GPS
HardwareSerial SerialModem(1);  // ESP32 UART1 for SIM7600 4G Modem
TinyGPSPlus gps;

// Global state tracking
unsigned long lastTelemetryTime = 0;
unsigned long lastHeartbeatTime = 0;
bool modemInitialized = false;
bool networkConnected = false;

// ============================================================================
// 5. HELPER FUNCTIONS - SERIAL LOGGING & LED
// ============================================================================
void blinkLed(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(delayMs);
  }
}

void printDivider() {
  Serial.println("==================================================");
}

// ============================================================================
// 6. SIM7600 AT COMMAND COMMUNICATION HELPERS
// ============================================================================
String sendATCommand(const String& cmd, const String& expectedResponse, unsigned long timeoutMs) {
  String response = "";
  // Flush any lingering RX bytes
  while (SerialModem.available()) {
    SerialModem.read();
  }

  Serial.print("[MODEM TX] ");
  Serial.println(cmd);
  SerialModem.println(cmd);

  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    while (SerialModem.available()) {
      char c = SerialModem.read();
      response += c;
    }
    if (expectedResponse.length() > 0 && response.indexOf(expectedResponse) != -1) {
      break;
    }
  }

  response.trim();
  Serial.print("[MODEM RX] ");
  Serial.println(response);
  return response;
}

bool waitForResponse(const String& expected, unsigned long timeoutMs) {
  String resp = "";
  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    while (SerialModem.available()) {
      char c = SerialModem.read();
      resp += c;
      if (resp.indexOf(expected) != -1) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// 7. MODEM INITIALIZATION & NETWORK SETUP
// ============================================================================
bool initModem() {
  Serial.println("[MODEM] Initializing SIM7600...");

  // If power pin is configured, pulse it low for 1.5s to turn on modem if off
  if (MODEM_PWR_PIN >= 0) {
    pinMode(MODEM_PWR_PIN, OUTPUT);
    digitalWrite(MODEM_PWR_PIN, LOW);
    delay(100);
    digitalWrite(MODEM_PWR_PIN, HIGH);
    delay(1500);
    digitalWrite(MODEM_PWR_PIN, LOW);
    delay(3000); // Allow modem internal boot
  }

  // Test AT handshake (retry up to 5 times)
  bool atOk = false;
  for (int i = 0; i < 5; i++) {
    String resp = sendATCommand("AT", "OK", 1000);
    if (resp.indexOf("OK") != -1) {
      atOk = true;
      break;
    }
    delay(1000);
  }

  if (!atOk) {
    Serial.println("[MODEM ERROR] No response to AT command. Check TX/RX wiring and power!");
    return false;
  }

  sendATCommand("ATE0", "OK", 1000);      // Turn off command echo
  sendATCommand("AT+CMEE=2", "OK", 1000);  // Enable verbose error descriptions

  // Check SIM card readiness
  String simCheck = sendATCommand("AT+CPIN?", "+CPIN: READY", 3000);
  if (simCheck.indexOf("READY") == -1) {
    Serial.println("[MODEM ERROR] SIM card not ready or PIN locked!");
    return false;
  }
  Serial.println("[MODEM] SIM Card Detected & Ready.");

  return true;
}

bool checkNetworkAndSignal() {
  Serial.println("[MODEM] Checking Signal Quality & Network Registration...");

  // Signal Strength (CSQ)
  // Value 0-31 (10-31 acceptable, 99 = unknown/no signal)
  String csqResp = sendATCommand("AT+CSQ", "OK", 2000);
  int csqVal = -1;
  int csqIdx = csqResp.indexOf("+CSQ: ");
  if (csqIdx != -1) {
    csqVal = csqResp.substring(csqIdx + 6, csqResp.indexOf(",", csqIdx)).toInt();
    Serial.print("[MODEM] Signal CSQ Value: ");
    Serial.print(csqVal);
    if (csqVal >= 15) Serial.println(" (Excellent / Good)");
    else if (csqVal >= 10) Serial.println(" (Fair)");
    else Serial.println(" (Weak or Searching)");
  }

  // Network registration (CREG / CGREG / CEREG)
  sendATCommand("AT+CREG?", "OK", 2000);
  sendATCommand("AT+CGREG?", "OK", 2000);
  String ceregResp = sendATCommand("AT+CEREG?", "OK", 2000);

  bool registered = (ceregResp.indexOf(",1") != -1 || ceregResp.indexOf(",5") != -1);
  if (registered) {
    Serial.println("[MODEM] Cellular Network Registered (LTE/4G).");
  } else {
    Serial.println("[MODEM WARNING] Network not yet registered or searching.");
  }
  return registered;
}

bool setupGprsDataConnection() {
  Serial.println("[MODEM] Setting up 4G Mobile Data Connection...");

  // Set PDP context with APN
  String setApnCmd = "AT+CGDCONT=1,\"IP\",\"" + String(APN) + "\"";
  sendATCommand(setApnCmd, "OK", 3000);

  // Close previous network context if open
  sendATCommand("AT+NETCLOSE", "", 2000);
  delay(1000);

  // Open network stack on SIM7600
  String netOpen = sendATCommand("AT+NETOPEN", "+NETOPEN: 0", 10000);
  if (netOpen.indexOf("+NETOPEN: 0") != -1 || netOpen.indexOf("already opened") != -1) {
    Serial.println("[MODEM] 4G Data Network Opened successfully.");
    sendATCommand("AT+IPADDR", "OK", 3000); // Print assigned local IP
    return true;
  } else {
    Serial.println("[MODEM ERROR] Failed to open 4G data network with APN.");
    return false;
  }
}

// ============================================================================
// 8. TELEMETRY JSON GENERATION (MATCHING CBTS BACKEND API)
// ============================================================================
String buildTelemetryJson(double lat, double lng, double speedKmh, double headingDeg, double hdop, int sats) {
  // Format ISO 8601 UTC timestamp from GPS if available, or omit for server clock fallback
  char timestampStr[32] = "";
  if (gps.date.isValid() && gps.time.isValid()) {
    snprintf(timestampStr, sizeof(timestampStr), "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
             gps.date.year(), gps.date.month(), gps.date.day(),
             gps.time.hour(), gps.time.minute(), gps.time.second(),
             gps.time.centisecond() * 10);
  }

  // Construct JSON strictly matching POST /api/bus/tracking/gps expected schema
  String json = "{";
  
  if (strlen(BUS_ID) > 0) {
    json += "\"busId\":\"" + String(BUS_ID) + "\",";
  }
  
  if (strlen(DEVICE_KEY) > 0) {
    json += "\"deviceKey\":\"" + String(DEVICE_KEY) + "\",";
  }

  json += "\"latitude\":" + String(lat, 6) + ",";
  json += "\"longitude\":" + String(lng, 6) + ",";
  json += "\"speed\":" + String(speedKmh, 1) + ",";
  json += "\"heading\":" + String(headingDeg, 1) + ",";
  json += "\"accuracy\":" + String(hdop, 2) + ",";
  json += "\"satellites\":" + String(sats);

  if (strlen(timestampStr) > 0) {
    json += ",\"timestamp\":\"" + String(timestampStr) + "\"";
  }

  json += "}";
  return json;
}

// ============================================================================
// 9. HTTP POST TELEMETRY TO CBTS BACKEND
// ============================================================================
bool sendTelemetryPost(const String& jsonPayload) {
  Serial.println("[HTTP] Preparing to send telemetry via SIM7600 HTTP stack...");
  Serial.print("[HTTP] Target URL: ");
  Serial.println(SERVER_URL);
  Serial.print("[HTTP] Payload: ");
  Serial.println(jsonPayload);

  // 1. Terminate any active HTTP session
  sendATCommand("AT+HTTPTERM", "", 1000);
  delay(200);

  // 2. Initialize HTTP service
  String initResp = sendATCommand("AT+HTTPINIT", "OK", 3000);
  if (initResp.indexOf("OK") == -1) {
    Serial.println("[HTTP ERROR] Failed to initialize HTTP service.");
    return false;
  }

  // 3. Set HTTP Parameters: URL and Content-Type
  String urlCmd = "AT+HTTPPARA=\"URL\",\"" + String(SERVER_URL) + "\"";
  sendATCommand(urlCmd, "OK", 3000);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 2000);

  // 4. Send POST body length and download window
  int dataLen = jsonPayload.length();
  String dataCmd = "AT+HTTPDATA=" + String(dataLen) + ",10000";
  SerialModem.println(dataCmd);
  
  // Wait for modem prompt "DOWNLOAD"
  if (!waitForResponse("DOWNLOAD", 5000)) {
    Serial.println("[HTTP ERROR] Modem did not return DOWNLOAD prompt.");
    sendATCommand("AT+HTTPTERM", "OK", 1000);
    return false;
  }

  // 5. Write JSON Payload
  SerialModem.print(jsonPayload);
  delay(100);
  waitForResponse("OK", 5000);

  // 6. Execute HTTP POST action (1 = POST)
  Serial.println("[HTTP] Transmitting POST request to CBTS backend...");
  String actionResp = sendATCommand("AT+HTTPACTION=1", "+HTTPACTION:", 15000);
  
  // Wait for +HTTPACTION: 1,<status_code>,<data_len>
  if (actionResp.indexOf("+HTTPACTION:") == -1) {
    actionResp = sendATCommand("", "+HTTPACTION:", 10000);
  }

  int statusCode = -1;
  int actionIdx = actionResp.indexOf("+HTTPACTION: 1,");
  if (actionIdx != -1) {
    statusCode = actionResp.substring(actionIdx + 15, actionIdx + 18).toInt();
    Serial.print("[HTTP] Server Response Status Code: ");
    Serial.println(statusCode);
  }

  // 7. Read response body if available
  if (statusCode > 0) {
    String readResp = sendATCommand("AT+HTTPREAD", "+HTTPREAD:", 5000);
    Serial.print("[HTTP] Server Response Body: ");
    Serial.println(readResp);
  }

  // 8. Terminate HTTP session cleanly
  sendATCommand("AT+HTTPTERM", "OK", 2000);

  if (statusCode == 200) {
    Serial.println("[HTTP SUCCESS] Telemetry ingested by CBTS backend!");
    blinkLed(2, 100);
    return true;
  } else {
    Serial.print("[HTTP WARNING] Server returned non-200 status: ");
    Serial.println(statusCode);
    return false;
  }
}

// ============================================================================
// 10. MODULAR TEST STAGES
// ============================================================================

// TEST 1: ESP32 Only (No external hardware required)
void runTestMode1() {
  printDivider();
  Serial.println("CBTS - TEST MODE 1: ESP32 ONLY SANITY CHECK");
  printDivider();
  Serial.print("ESP32 Chip Model: ");
  Serial.println(ESP.getChipModel());
  Serial.print("CPU Frequency:   ");
  Serial.print(ESP.getCpuFreqMHz());
  Serial.println(" MHz");
  Serial.print("Free Heap Memory: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.print("Configured GPS Pins:   RX=");
  Serial.print(GPS_RX_PIN);
  Serial.print(" TX=");
  Serial.println(GPS_TX_PIN);
  Serial.print("Configured MODEM Pins: RX=");
  Serial.print(MODEM_RX_PIN);
  Serial.print(" TX=");
  Serial.println(MODEM_TX_PIN);
  Serial.println("\n[OK] ESP32 is operational and running firmware.");
  Serial.println("Heartbeat LED blinking on GPIO 2...");
  printDivider();

  while (true) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(500);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(500);
    Serial.print(".");
  }
}

// TEST 2: ESP32 + NEO-6M GPS (GPS verification only)
void runTestMode2() {
  printDivider();
  Serial.println("CBTS - TEST MODE 2: ESP32 + NEO-6M GPS TEST");
  printDivider();
  Serial.println("Listening for NMEA sentences from NEO-6M on Serial2 (Baud: 9600)...");
  Serial.println("Place GPS antenna near an open window or outdoors for satellite lock.");
  printDivider();

  unsigned long lastPrint = 0;
  while (true) {
    while (SerialGPS.available() > 0) {
      char c = SerialGPS.read();
      gps.encode(c);
    }

    if (millis() - lastPrint > 2000) {
      lastPrint = millis();
      Serial.println("\n--- GPS DIAGNOSTICS ---");
      Serial.print("Characters processed: ");
      Serial.println(gps.charsProcessed());
      Serial.print("Failed checksums:     ");
      Serial.println(gps.failedChecksum());

      if (gps.charsProcessed() < 10) {
        Serial.println("[WARNING] No NMEA data received. Check GPS RX/TX wiring and 3.3V/5V power.");
      } else if (!gps.location.isValid()) {
        Serial.print("Status: Waiting for GPS fix... (Satellites in view: ");
        Serial.print(gps.satellites.value());
        Serial.println(")");
      } else {
        Serial.println("Status: VALID GPS FIX ACQUIRED!");
        Serial.print("Latitude:   ");
        Serial.println(gps.location.lat(), 6);
        Serial.print("Longitude:  ");
        Serial.println(gps.location.lng(), 6);
        Serial.print("Speed:      ");
        Serial.print(gps.speed.kmph());
        Serial.println(" km/h");
        Serial.print("Satellites: ");
        Serial.println(gps.satellites.value());
        Serial.print("HDOP:       ");
        Serial.println(gps.hdop.hdop());
        blinkLed(1, 100);
      }
    }
  }
}

// TEST 3: ESP32 + SIM7600 (Cellular modem verification only)
void runTestMode3() {
  printDivider();
  Serial.println("CBTS - TEST MODE 3: ESP32 + SIM7600 4G TEST");
  printDivider();
  Serial.println("Verifying AT communication, SIM card status, and 4G signal...");
  printDivider();

  if (!initModem()) {
    Serial.println("[TEST 3 FAILED] Modem initialization failed. Check power and UART pins.");
    while (true) { delay(1000); }
  }

  checkNetworkAndSignal();

  Serial.println("\n[TEST 3 PASSED] Modem communication verified.");
  Serial.println("Entering interactive AT passthrough mode.");
  Serial.println("Type AT commands in the Serial Monitor to send to SIM7600:");

  while (true) {
    if (Serial.available()) {
      SerialModem.write(Serial.read());
    }
    if (SerialModem.available()) {
      Serial.write(SerialModem.read());
    }
  }
}

// TEST 4: ESP32 + GPS + SIM7600 (Dual serial test without sending HTTP)
void runTestMode4() {
  printDivider();
  Serial.println("CBTS - TEST MODE 4: ESP32 + GPS + SIM7600 CONCURRENT TEST");
  printDivider();
  Serial.println("Checking both hardware serial channels simultaneously...");
  printDivider();

  bool modemReady = initModem();
  if (modemReady) {
    checkNetworkAndSignal();
  }

  unsigned long lastReport = 0;
  while (true) {
    // Feed GPS stream
    while (SerialGPS.available() > 0) {
      gps.encode(SerialGPS.read());
    }

    if (millis() - lastReport > 3000) {
      lastReport = millis();
      printDivider();
      Serial.println("[STATUS REPORT - DUAL UART]");
      
      // GPS Status
      Serial.print("GPS: ");
      if (gps.location.isValid()) {
        Serial.print("FIX OK | Lat: ");
        Serial.print(gps.location.lat(), 6);
        Serial.print(" Lng: ");
        Serial.print(gps.location.lng(), 6);
        Serial.print(" Sats: ");
        Serial.println(gps.satellites.value());
      } else {
        Serial.print("Waiting for GPS fix... (Sats: ");
        Serial.print(gps.satellites.value());
        Serial.print(" Chars: ");
        Serial.print(gps.charsProcessed());
        Serial.println(")");
      }

      // Modem Status
      Serial.print("Modem: ");
      if (modemReady) {
        String csq = sendATCommand("AT+CSQ", "OK", 1000);
        Serial.println(csq);
      } else {
        Serial.println("Modem not responding.");
      }
      printDivider();
    }
  }
}

// TEST 5: Full End-to-End Telemetry Mode
void runTestMode5() {
  printDivider();
  Serial.println("CBTS - TEST MODE 5: FULL PRODUCTION TELEMETRY");
  Serial.println("GPS Fix -> SIM7600 4G LTE -> POST /api/bus/tracking/gps");
  printDivider();

  if (!initModem()) {
    Serial.println("[FATAL] SIM7600 initialization failed. Telemetry halted.");
    while (true) { delay(1000); }
  }

  checkNetworkAndSignal();

  if (!setupGprsDataConnection()) {
    Serial.println("[WARNING] 4G Data setup failed. Will retry periodically in loop.");
  } else {
    networkConnected = true;
  }

  Serial.println("[READY] System initialized. Entering telemetry loop...");
}

// ============================================================================
// 11. ARDUINO SETUP & MAIN LOOP
// ============================================================================
void setup() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize USB Serial Monitor
  Serial.begin(115200);
  delay(1000);

  printDivider();
  Serial.println("CBTS Bus Tracker Starting...");
  Serial.print("Configured Test Mode: ");
  Serial.println(CURRENT_TEST_MODE);
  printDivider();

  // Initialize HardwareSerial for GPS (UART2)
  SerialGPS.begin(GPS_BAUD_RATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Initialize HardwareSerial for SIM7600 Modem (UART1)
  SerialModem.begin(MODEM_BAUD_RATE, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);

  // Branch into configured test mode
  switch (CURRENT_TEST_MODE) {
    case 1: runTestMode1(); break;
    case 2: runTestMode2(); break;
    case 3: runTestMode3(); break;
    case 4: runTestMode4(); break;
    case 5: runTestMode5(); break;
    default:
      Serial.println("[ERROR] Invalid CURRENT_TEST_MODE! Choose 1 through 5.");
      while (true) { delay(1000); }
  }
}

void loop() {
  // Loop is active only in TEST MODE 5 (Full Telemetry Mode)
  if (CURRENT_TEST_MODE != 5) {
    return;
  }

  // Continuously feed incoming GPS characters into TinyGPSPlus parser
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  // Check telemetry interval timer
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();

    printDivider();
    Serial.println("--- CBTS TELEMETRY CYCLE ---");

    // 1. Verify GPS Fix Quality
    if (!gps.location.isValid()) {
      Serial.println("GPS: Waiting for GPS fix...");
      Serial.print("Satellites in view: ");
      Serial.println(gps.satellites.value());
      Serial.println("Skipping transmission to avoid sending invalid coordinates.");
      printDivider();
      return;
    }

    // 2. Read GPS Parameters
    double latitude = gps.location.lat();
    double longitude = gps.location.lng();
    double speedKmh = gps.speed.isValid() ? gps.speed.kmph() : 0.0;
    double headingDeg = gps.course.isValid() ? gps.course.deg() : 0.0;
    double accuracyHdop = gps.hdop.isValid() ? gps.hdop.hdop() : 2.5;
    int satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;

    // Diagnostic log
    Serial.println("GPS Fix Valid:");
    Serial.print("  Latitude:   "); Serial.println(latitude, 6);
    Serial.print("  Longitude:  "); Serial.println(longitude, 6);
    Serial.print("  Speed:      "); Serial.print(speedKmh); Serial.println(" km/h");
    Serial.print("  Course:     "); Serial.print(headingDeg); Serial.println(" deg");
    Serial.print("  Accuracy:   "); Serial.print(accuracyHdop); Serial.println(" HDOP");
    Serial.print("  Satellites: "); Serial.println(satellites);

    // 3. Build telemetry JSON
    String telemetryPayload = buildTelemetryJson(latitude, longitude, speedKmh, headingDeg, accuracyHdop, satellites);

    // 4. Send HTTP POST to CBTS Backend
    bool postSuccess = sendTelemetryPost(telemetryPayload);
    if (!postSuccess) {
      Serial.println("[TELEMETRY] POST failed. Checking modem connection...");
      checkNetworkAndSignal();
    }
    printDivider();
  }
}
