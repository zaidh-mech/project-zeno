// Aura phone-first firmware for ESP32-C3 SuperMini.
// Phone: microphone, AI request, BLE control. C3: face, touch, Wi-Fi, speaker.
#include <Arduino.h>
#include <ArduinoJson.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLESecurity.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <TFT_eSPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <driver/i2s.h>
#include <math.h>
#include <time.h>

#if __has_include("firmware_config.h")
#include "firmware_config.h"
#endif
#ifndef AURA_BACKEND_CA_CERT
#define AURA_BACKEND_CA_CERT ""
#endif

namespace {
constexpr int PIN_TOUCH = 20;     // TTP223 OUT; avoid C3 boot-strapping GPIOs.
constexpr int PIN_I2S_BCLK = 0;  // MAX98357A BCLK.
constexpr int PIN_I2S_LRC = 1;   // MAX98357A LRC.
constexpr int PIN_I2S_DIN = 10;  // MAX98357A DIN; SD/EN tied high.
constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint32_t DRAW_MS = 90;
constexpr size_t MAX_COMMAND = 512;
constexpr int OUTPUT_VOLUME_PERCENT = 45;

constexpr char SERVICE_UUID[] = "2c7f0001-2530-4d35-8fbc-a99878fe0001";
constexpr char COMMAND_UUID[] = "2c7f0002-2530-4d35-8fbc-a99878fe0001";
constexpr char STATUS_UUID[] = "2c7f0003-2530-4d35-8fbc-a99878fe0001";

enum class Face { Idle, Happy, Listening, Thinking, Speaking, Sad, Left, Right, Blink };
struct BleChunk { uint8_t size; char bytes[20]; };

TFT_eSPI display;
Preferences prefs;
BLECharacteristic *statusCharacteristic = nullptr;
QueueHandle_t bleQueue = nullptr;
String commandBuffer;
String wifiSsid;
String wifiPassword;
String backendUrl;
String deviceToken;
String pendingJob;
Face face = Face::Idle;
uint32_t faceSince = 0;
uint32_t lastDraw = 0;
uint32_t lastWifiTry = 0;
uint32_t lastTouch = 0;
bool speakerReady = false;
bool isPlaying = false;
bool bleConnected = false;
bool wasWifiConnected = false;
uint32_t touchDownSince = 0;
bool touchHandled = false;
uint32_t provisionUntil = 0;
uint32_t pairingPin = 0;

bool provisioningOpen() { return static_cast<int32_t>(provisionUntil - millis()) > 0; }

void notifyStatus(const char *message) {
  if (!statusCharacteristic) return;
  statusCharacteristic->setValue(message);
  if (bleConnected) statusCharacteristic->notify();
  Serial.println(message);
}

void setFace(Face next) {
  face = next;
  faceSince = millis();
  lastDraw = 0;
}

void drawFace() {
  uint32_t now = millis();
  if (lastDraw && now - lastDraw < DRAW_MS) return;
  lastDraw = now;
  display.fillScreen(TFT_BLACK);
  if (provisioningOpen()) {
    display.drawString("Pair code", 78, 33, 2);
    display.drawString(String(pairingPin), 88, 56, 2);
  }
  int shift = face == Face::Left ? -14 : face == Face::Right ? 14 : 0;
  int eyeY = 107 + ((face == Face::Idle) ? static_cast<int>(3 * sinf(now / 700.0f)) : 0);
  bool closed = face == Face::Blink || face == Face::Happy || (face == Face::Idle && now % 4300 < 130);
  uint16_t color = face == Face::Listening ? TFT_CYAN :
                   face == Face::Sad ? TFT_BLUE :
                   face == Face::Happy ? TFT_PINK : TFT_WHITE;
  if (closed) {
    display.drawLine(57 + shift, eyeY, 96 + shift, eyeY, color);
    display.drawLine(144 + shift, eyeY, 183 + shift, eyeY, color);
  } else {
    int radius = face == Face::Speaking ? 13 + (now / 140) % 7 : 16;
    display.fillEllipse(76 + shift, eyeY, radius, 23, color);
    display.fillEllipse(164 + shift, eyeY, radius, 23, color);
  }
  if (face == Face::Speaking) display.fillEllipse(120, 165, 13, 5 + (now / 120) % 10, TFT_PINK);
  if (face == Face::Thinking) display.drawString("...", 106, 158, 2);
  if (face == Face::Listening) display.fillCircle(120, 165, 5, TFT_CYAN);
  if (face == Face::Sad) display.drawArc(120, 174, 24, 17, 200, 340, color, TFT_BLACK);
  if (face == Face::Happy) display.drawArc(120, 151, 24, 21, 20, 160, color, TFT_BLACK);
  if (WiFi.status() != WL_CONNECTED) display.fillCircle(120, 220, 3, TFT_RED);
}

Face parseFace(const char *name) {
  if (!strcmp(name, "happy")) return Face::Happy;
  if (!strcmp(name, "listening")) return Face::Listening;
  if (!strcmp(name, "thinking")) return Face::Thinking;
  if (!strcmp(name, "speaking")) return Face::Speaking;
  if (!strcmp(name, "sad")) return Face::Sad;
  if (!strcmp(name, "look_left")) return Face::Left;
  if (!strcmp(name, "look_right")) return Face::Right;
  if (!strcmp(name, "blink")) return Face::Blink;
  return Face::Idle;
}

bool validJobId(const String &id) {
  if (id.length() != 32) return false;
  for (char c : id) if (!isxdigit(static_cast<unsigned char>(c))) return false;
  return true;
}

void processCommand(const String &line) {
  StaticJsonDocument<640> doc;
  if (deserializeJson(doc, line) != DeserializationError::Ok) {
    notifyStatus("error:bad_json");
    return;
  }
  const char *type = doc["type"] | "";
  if (!strcmp(type, "expression")) {
    const char *name = doc["name"] | "idle";
    setFace(parseFace(name));
    notifyStatus("face:ok");
  } else if (!strcmp(type, "wifi")) {
    if (!provisioningOpen()) { notifyStatus("error:touch_to_setup"); return; }
    String ssid = doc["ssid"] | "";
    String password = doc["password"] | "";
    if (!ssid.length() || ssid.length() > 32 || password.length() > 63) {
      notifyStatus("error:wifi_input");
      return;
    }
    wifiSsid = ssid;
    wifiPassword = password;
    prefs.putString("ssid", wifiSsid);
    prefs.putString("password", wifiPassword);
    WiFi.disconnect();
    lastWifiTry = 0;
    notifyStatus("wifi:connecting");
  } else if (!strcmp(type, "config")) {
    if (!provisioningOpen()) { notifyStatus("error:touch_to_setup"); return; }
    String url = doc["backend_url"] | "";
    String token = doc["device_token"] | "";
    url.trim();
    if (!(url.startsWith("http://") || url.startsWith("https://")) ||
        url.length() > 240 || token.length() > 128) {
      notifyStatus("error:config_input");
      return;
    }
    while (url.endsWith("/")) url.remove(url.length() - 1);
    backendUrl = url;
    deviceToken = token;
    prefs.putString("backend", backendUrl);
    prefs.putString("token", deviceToken);
    notifyStatus("config:saved");
  } else if (!strcmp(type, "play")) {
    String id = doc["job_id"] | "";
    if (!validJobId(id)) {
      notifyStatus("error:job_id");
      return;
    }
    if (isPlaying || pendingJob.length()) {
      notifyStatus("error:busy");
      return;
    }
    pendingJob = id;
    setFace(Face::Thinking);
    notifyStatus("play:queued");
  } else if (!strcmp(type, "status")) {
    if (WiFi.status() == WL_CONNECTED) notifyStatus("wifi:connected");
    else notifyStatus("wifi:disconnected");
  } else {
    notifyStatus("error:command");
  }
}

class CommandCallbacks final : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    std::string value = characteristic->getValue();
    if (!bleQueue || value.empty()) return;
    for (size_t offset = 0; offset < value.size(); offset += 20) {
      BleChunk chunk{};
      chunk.size = min(static_cast<size_t>(20), value.size() - offset);
      memcpy(chunk.bytes, value.data() + offset, chunk.size);
      if (xQueueSend(bleQueue, &chunk, 0) != pdTRUE) notifyStatus("error:queue_full");
    }
  }
};

class ServerCallbacks final : public BLEServerCallbacks {
  void onConnect(BLEServer *) override { bleConnected = true; }
  void onDisconnect(BLEServer *server) override {
    bleConnected = false;
    server->startAdvertising();
  }
};

class SecurityCallbacks final : public BLESecurityCallbacks {
  uint32_t onPassKeyRequest() override { return pairingPin; }
  void onPassKeyNotify(uint32_t) override {}
  bool onSecurityRequest() override { return provisioningOpen(); }
  void onAuthenticationComplete(esp_ble_auth_cmpl_t result) override {
    notifyStatus(result.success ? "pair:ok" : "error:pairing");
  }
  bool onConfirmPIN(uint32_t pin) override { return provisioningOpen() && pin == pairingPin; }
};

void pollBle() {
  BleChunk chunk;
  while (xQueueReceive(bleQueue, &chunk, 0) == pdTRUE) {
    for (uint8_t i = 0; i < chunk.size; ++i) {
      char c = chunk.bytes[i];
      if (c == '\n') {
        processCommand(commandBuffer);
        commandBuffer = "";
      } else if (commandBuffer.length() < MAX_COMMAND) {
        commandBuffer += c;
      } else {
        commandBuffer = "";
        notifyStatus("error:too_long");
      }
    }
  }
}

void initBle() {
  bleQueue = xQueueCreate(40, sizeof(BleChunk));
  pairingPin = 100000 + esp_random() % 900000;
  BLEDevice::init("Aura Desk Buddy");
  BLEDevice::setMTU(247);
  BLEDevice::setSecurityCallbacks(new SecurityCallbacks());
  BLESecurity *security = new BLESecurity();
  security->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_MITM_BOND);
  security->setCapability(ESP_IO_CAP_OUT);
  security->setStaticPIN(pairingPin);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *command = service->createCharacteristic(
      COMMAND_UUID, BLECharacteristic::PROPERTY_WRITE);
  command->setAccessPermissions(static_cast<esp_gatt_perm_t>(ESP_GATT_PERM_WRITE_ENCRYPTED | ESP_GATT_PERM_WRITE_ENC_MITM));
  command->setCallbacks(new CommandCallbacks());
  statusCharacteristic = service->createCharacteristic(
      STATUS_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  statusCharacteristic->addDescriptor(new BLE2902());
  statusCharacteristic->setValue("ready");
  service->start();
  BLEAdvertising *advertising = server->getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wasWifiConnected) {
      configTime(0, 0, "pool.ntp.org");
      notifyStatus("wifi:connected");
    }
    wasWifiConnected = true;
    return;
  }
  if (wasWifiConnected) notifyStatus("wifi:disconnected");
  wasWifiConnected = false;
  if (!wifiSsid.length()) return;
  if (lastWifiTry && millis() - lastWifiTry < WIFI_RETRY_MS) return;
  lastWifiTry = millis();
  WiFi.disconnect();
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  notifyStatus("wifi:connecting");
}

bool initSpeaker() {
  i2s_config_t cfg{};
  cfg.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX);
  cfg.sample_rate = 16000;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  cfg.dma_buf_count = 8;
  cfg.dma_buf_len = 256;
  if (i2s_driver_install(I2S_NUM_0, &cfg, 0, nullptr) != ESP_OK) return false;
  i2s_pin_config_t pins{};
  pins.bck_io_num = PIN_I2S_BCLK;
  pins.ws_io_num = PIN_I2S_LRC;
  pins.data_out_num = PIN_I2S_DIN;
  pins.data_in_num = I2S_PIN_NO_CHANGE;
  if (i2s_set_pin(I2S_NUM_0, &pins) != ESP_OK) return false;
  i2s_zero_dma_buffer(I2S_NUM_0);
  return true;
}

class PcmSpeakerStream final : public Stream {
 public:
  size_t write(uint8_t byte) override { return write(&byte, 1); }
  size_t write(const uint8_t *data, size_t length) override {
    uint8_t aligned[512];
    size_t used = 0;
    for (size_t i = 0; i < length; ++i) {
      if (!pending_) {
        low_ = data[i];
        pending_ = true;
        continue;
      }
      int16_t sample = static_cast<int16_t>(static_cast<uint16_t>(low_) | (static_cast<uint16_t>(data[i]) << 8));
      sample = static_cast<int16_t>((static_cast<int32_t>(sample) * OUTPUT_VOLUME_PERCENT) / 100);
      aligned[used++] = static_cast<uint8_t>(sample & 0xff);
      aligned[used++] = static_cast<uint8_t>((static_cast<uint16_t>(sample) >> 8) & 0xff);
      pending_ = false;
      if (used == sizeof(aligned)) {
        size_t written = 0;
        if (i2s_write(I2S_NUM_0, aligned, used, &written, portMAX_DELAY) != ESP_OK || written != used) return 0;
        used = 0;
        drawFace();
      }
    }
    if (used) {
      size_t written = 0;
      if (i2s_write(I2S_NUM_0, aligned, used, &written, portMAX_DELAY) != ESP_OK || written != used) return 0;
    }
    return length;
  }
  int available() override { return 0; }
  int read() override { return -1; }
  int peek() override { return -1; }
  void flush() override {}
  bool aligned() const { return !pending_; }
 private:
  bool pending_ = false;
  uint8_t low_ = 0;
};

void playJob(const String &jobId) {
  if (!speakerReady || WiFi.status() != WL_CONNECTED || !backendUrl.length()) {
    notifyStatus("error:not_ready");
    setFace(Face::Sad);
    return;
  }
  isPlaying = true;
  String url = backendUrl + "/v1/audio-jobs/" + jobId + "/audio";
  HTTPClient http;
  WiFiClient plainClient;
  WiFiClientSecure secureClient;
  if (url.startsWith("https://")) {
    if (!strlen(AURA_BACKEND_CA_CERT)) {
      notifyStatus("error:tls_ca");
      isPlaying = false;
      setFace(Face::Sad);
      return;
    }
    // mbedTLS checks certificate dates; a fresh C3 has no battery-backed clock.
    uint32_t clockStart = millis();
    while (time(nullptr) < 1577836800 && millis() - clockStart < 10000) delay(100);
    if (time(nullptr) < 1577836800) {
      notifyStatus("error:clock");
      isPlaying = false;
      setFace(Face::Sad);
      return;
    }
    secureClient.setCACert(AURA_BACKEND_CA_CERT);
  }
  http.setConnectTimeout(8000);
  http.setTimeout(45000);
  bool begun = url.startsWith("https://") ? http.begin(secureClient, url) : http.begin(plainClient, url);
  if (!begun) {
    notifyStatus("error:bad_url");
  } else {
    http.addHeader("Accept", "audio/pcm");
    if (deviceToken.length()) http.addHeader("X-Device-Token", deviceToken);
    int code = http.GET();
    if (code == HTTP_CODE_OK) {
      setFace(Face::Speaking);
      notifyStatus("play:started");
      PcmSpeakerStream output;
      int bytes = http.writeToStream(&output);
      if (bytes < 0 || !output.aligned()) notifyStatus("error:audio_stream");
      delay(180);
      i2s_zero_dma_buffer(I2S_NUM_0);
      notifyStatus("play:done");
    } else {
      notifyStatus("error:audio_http");
    }
    http.end();
  }
  isPlaying = false;
  setFace(Face::Idle);
}
}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TOUCH, INPUT);
  display.init();
  display.setRotation(0);
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.setTextDatum(TL_DATUM);
  prefs.begin("aura", false);
  wifiSsid = prefs.getString("ssid", "");
  wifiPassword = prefs.getString("password", "");
  backendUrl = prefs.getString("backend", "");
  deviceToken = prefs.getString("token", "");
  speakerReady = initSpeaker();
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  initBle();
  setFace(Face::Idle);
  if (!speakerReady) notifyStatus("error:speaker");
}

void loop() {
  pollBle();
  ensureWifi();
  uint32_t now = millis();
  bool touching = digitalRead(PIN_TOUCH) == HIGH;
  if (touching && !touchDownSince) touchDownSince = now;
  if (touching && !touchHandled && now - touchDownSince >= 3000) {
    touchHandled = true;
    provisionUntil = now + 120000;
    notifyStatus("provision:open");
    lastDraw = 0;
  }
  if (!touching && touchDownSince) {
    if (!touchHandled && now - touchDownSince < 3000 && now - lastTouch > 350) {
      lastTouch = now;
      setFace(Face::Happy);
      notifyStatus("touch");
    }
    touchDownSince = 0;
    touchHandled = false;
  }
  if (face != Face::Idle && face != Face::Speaking && face != Face::Listening &&
      face != Face::Thinking && now - faceSince > 1000) setFace(Face::Idle);
  if (pendingJob.length()) {
    String id = pendingJob;
    pendingJob = "";
    playJob(id);
  }
  drawFace();
  delay(5);
}
