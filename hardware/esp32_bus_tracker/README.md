# CBTS - ESP32 GPS Tracking Firmware Guide

This directory contains the prepared firmware sketch for the **College Bus Tracking System (CBTS)** physical bus tracking prototype.

---

## 1. Hardware Architecture

```
+----------------+          +-------------------+          +-------------------+
|  NEO-6M GPS    |  UART2   |  ESP32 DevKit V1  |  UART1   |  SIM7600 4G LTE   |
|  (Satellites)  | -------> |  (ESP-WROOM-32)   | -------> |  (Mobile Data)    |
+----------------+          +-------------------+          +-------------------+
                                                                     |
                                                                     v 4G LTE
                                                            +-------------------+
                                                            |   CBTS Backend    |
                                                            | POST /api/bus/... |
                                                            +-------------------+
                                                                     |
                                                                     v
                                                            +-------------------+
                                                            |  MongoDB Database |
                                                            +-------------------+
                                                                     |
                                                                     v
                                                            +-------------------+
                                                            |  Live Web UI Map  |
                                                            +-------------------+
```

---

## 2. Directory Structure

```
hardware/
└── esp32_bus_tracker/
    ├── esp32_bus_tracker.ino   # Main Arduino sketch
    └── README.md              # Hardware guide & testing procedures
```

---

## 3. Configurable Values in `esp32_bus_tracker.ino`

All key configuration constants are located at the top of [`esp32_bus_tracker.ino`](./esp32_bus_tracker.ino):

| Constant | Description | Default / Placeholder | Status / Action Needed |
| :--- | :--- | :--- | :--- |
| `CURRENT_TEST_MODE` | Active test mode stage (1-5) | `1` | Start at `1`, increment after physical checks |
| `GPS_RX_PIN` | ESP32 GPIO connected to NEO-6M TX | `16` | Verify against physical ESP32 pinout |
| `GPS_TX_PIN` | ESP32 GPIO connected to NEO-6M RX | `17` | Verify against physical ESP32 pinout |
| `MODEM_RX_PIN` | ESP32 GPIO connected to SIM7600 TX | `26` | Verify against physical ESP32 pinout |
| `MODEM_TX_PIN` | ESP32 GPIO connected to SIM7600 RX | `27` | Verify against physical ESP32 pinout |
| `MODEM_PWR_PIN` | SIM7600 power key pulse pin | `4` (`-1` if unused) | Verify if your SIM7600 breakout has a PWRKEY pin |
| `BUS_ID` | Target bus MongoDB ObjectId | `""` | Leave empty `""` or set to 24-character ObjectId |
| `DEVICE_KEY` | Hardware device key | `"ESP32-CBTS-BUS-01"` | Matches `bus.tracking.deviceKey` in DB |
| `SERVER_URL` | CBTS backend GPS endpoint | `"http://YOUR_SERVER/api/bus/tracking/gps"` | Set to backend LAN IP or public host |
| `APN` | Cellular carrier APN | `"YOUR_APN"` | Must match your 4G SIM provider |
| `TELEMETRY_INTERVAL_MS` | GPS update frequency | `5000` (5 seconds) | Configurable |

---

## 4. Backend API Ingestion Contract

The firmware communicates directly with the existing CBTS endpoint:
- **Method**: `POST`
- **Path**: `/api/bus/tracking/gps`
- **Header**: `Content-Type: application/json`

### Payload Format:
```json
{
  "busId": "65f0...",
  "deviceKey": "ESP32-CBTS-BUS-01",
  "latitude": 13.082700,
  "longitude": 80.270700,
  "speed": 32.5,
  "heading": 145.2,
  "accuracy": 1.2,
  "satellites": 8,
  "timestamp": "2026-09-15T16:55:00.000Z"
}
```

### Backend Resolution Order:
1. If `busId` is provided and valid, backend finds the bus by `_id`.
2. Else if `deviceKey` is provided, backend finds the bus matching `tracking.deviceKey`.
3. Development fallback: If neither is supplied or found, backend updates `busNumber: "3"` as default.
4. If the target bus has a configured `deviceKey`, any submitted `deviceKey` must match, or a `403 Unauthorized` is returned.

---

## 5. Modular Test Stages (`CURRENT_TEST_MODE`)

Do **NOT** connect all hardware at once. Test incrementally using `CURRENT_TEST_MODE`:

### TEST 1: ESP32 Only
- **Hardware needed**: ESP32 connected to PC via USB only.
- **Set**: `#define CURRENT_TEST_MODE 1`
- **Expected result**: Serial Monitor at 115200 baud displays chip model, CPU frequency, free heap, and onboard LED blinks at 1 Hz.

### TEST 2: ESP32 + NEO-6M GPS
- **Hardware needed**: ESP32 + NEO-6M connected to GPS pins.
- **Set**: `#define CURRENT_TEST_MODE 2`
- **Expected result**: Serial Monitor displays character counts from NMEA sentences. When outdoors or near a window, fix changes from `"Waiting for GPS fix..."` to `"VALID GPS FIX ACQUIRED!"` with valid latitude and longitude.

### TEST 3: ESP32 + SIM7600
- **Hardware needed**: ESP32 + SIM7600 (powered via regulated source) + 4G SIM card.
- **Set**: `#define CURRENT_TEST_MODE 3`
- **Expected result**: Firmware verifies `AT`, checks `+CPIN: READY`, measures signal strength (`AT+CSQ`), checks cellular registration (`AT+CEREG?`), and opens an interactive AT passthrough console.

### TEST 4: ESP32 + GPS + SIM7600
- **Hardware needed**: Both peripherals connected to ESP32.
- **Set**: `#define CURRENT_TEST_MODE 4`
- **Expected result**: Validates that both HardwareSerial ports operate simultaneously without pin conflict, baud rate mismatch, or data corruption.

### TEST 5: Complete Telemetry Flow
- **Hardware needed**: All modules connected, 4G SIM active with data plan, backend server running.
- **Set**: `#define CURRENT_TEST_MODE 5`
- **Expected result**:
  1. ESP32 initializes modem and connects to 4G APN.
  2. Waits for valid GPS fix (never transmits invalid coordinates).
  3. Formats telemetry JSON.
  4. Dispatches `HTTP POST` to `SERVER_URL`.
  5. Prints server response code `200` and response body.
  6. Live map in CBTS web interface updates in real time.

---

## 6. Power & Voltage Safety Checklist

> [!CAUTION]
> **DO NOT CONNECT BUS BATTERY DIRECTLY TO ESP32 OR SIM7600!**
> Vehicle/bus battery systems fluctuate between 12V and 28V, which will instantly destroy 3.3V/5V microcontrollers.

Before wiring any power connections:
1. **LM2596 Buck Converter Verification**:
   - Connect input to battery or DC supply.
   - Use a digital multimeter on the LM2596 output screw terminals.
   - Adjust the brass potentiometer screw until the multimeter reads exactly **5.0V** (or **4.0V** if powering SIM7600 VBAT pin directly).
   - Only connect the output to the circuit *after* confirming the voltage is steady.
2. **SIM7600 Current Spikes**:
   - The SIM7600 module draws short current spikes up to **2 Amps** during 4G transmissions.
   - Do not power SIM7600 from the ESP32's 3.3V or 5V pin, as this causes brownout resets. Power SIM7600 from an independent 5V/2A or 4V/2A regulated output.
   - Ensure a common ground (**GND**) is shared between ESP32, SIM7600, and GPS.

---

## 7. Required Arduino IDE Setup

1. **Board Package**:
   - In Arduino IDE, open **Preferences** -> **Additional Board Manager URLs**.
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - In **Tools** -> **Board** -> **Boards Manager**, install `esp32 by Espressif Systems`.
   - Select Board: `ESP32 Dev Module`.
2. **Libraries**:
   - In **Tools** -> **Manage Libraries**, search and install:
     - `TinyGPSPlus` by Mikal Hart.
