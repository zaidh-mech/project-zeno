// Aura birthday desk buddy: ESP32-S3-DevKitC-1-N8R8 / Arduino core 2.x.
// Audio API: POST /v1/voice, PCM16LE mono 16 kHz body and response.
#include <Arduino.h>
#include <HTTPClient.h>
#include <TFT_eSPI.h>
#include <WiFi.h>
#include <driver/i2s.h>
#include <esp_heap_caps.h>
#include <math.h>

#if __has_include("firmware_config.h")
#include "firmware_config.h"
#endif
#ifndef AURA_WIFI_SSID
#define AURA_WIFI_SSID ""
#endif
#ifndef AURA_WIFI_PASSWORD
#define AURA_WIFI_PASSWORD ""
#endif
#ifndef AURA_BACKEND_URL
#define AURA_BACKEND_URL ""
#endif
#ifndef AURA_DEVICE_TOKEN
#define AURA_DEVICE_TOKEN ""
#endif

namespace {
constexpr int PIN_BL = 7;
constexpr int PIN_TOUCH = 21;
constexpr int PIN_MIC_BCLK = 4;
constexpr int PIN_MIC_WS = 5;
constexpr int PIN_MIC_SD = 6;
constexpr int PIN_SPK_BCLK = 15;
constexpr int PIN_SPK_LRC = 16;
constexpr int PIN_SPK_DIN = 17;
constexpr int PIN_SPK_SD = 18;
constexpr uint32_t SAMPLE_RATE = 16000;
constexpr size_t MAX_SAMPLES = SAMPLE_RATE * 8;
constexpr uint32_t PET_MS = 750;
constexpr uint32_t MIN_LISTEN_MS = 550;
constexpr uint32_t SILENCE_MS = 900;
constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint32_t TOUCH_DEBOUNCE_MS = 300;
constexpr uint32_t SLEEP_AFTER_MS = 30000;
constexpr int VOICE_THRESHOLD = 1000;  // Tune to measured INMP441 noise floor.
constexpr int OUTPUT_VOLUME_PERCENT = 45;  // Limit speaker draw on a LiPo cell.

enum class State { Idle, Listening, Processing, Speaking, Petting };
TFT_eSPI display;
State state = State::Idle;
volatile bool touchPending = false;
uint32_t lastTouchMs = 0;
uint32_t stateSinceMs = 0;
uint32_t lastVoiceMs = 0;
uint32_t lastWifiTryMs = 0;
uint32_t lastDrawMs = 0;
uint32_t lastInteractionMs = 0;
int16_t *recording = nullptr;
size_t sampleCount = 0;
bool heardVoice = false;
bool micReady = false;
bool speakerReady = false;

void IRAM_ATTR onTouch() { touchPending = true; }

void enter(State next) {
  state = next;
  stateSinceMs = millis();
  lastDrawMs = 0;
  Serial.printf("State: %d\n", static_cast<int>(next));
}

void drawFace() {
  const uint32_t now = millis();
  if (lastDrawMs && now - lastDrawMs < 90) return;
  lastDrawMs = now;
  display.fillScreen(TFT_BLACK);
  const bool blink = state == State::Idle && (now % 4300 < 120);
  const bool sleeping = state == State::Idle && now - lastInteractionMs >= SLEEP_AFTER_MS;
  const bool listening = state == State::Listening;
  const bool speaking = state == State::Speaking;
  const bool happy = state == State::Petting;
  const uint16_t color = listening ? TFT_CYAN : (happy ? TFT_PINK : TFT_WHITE);
  const int eyeY = 106 + ((state == State::Idle && !blink) ? static_cast<int>(3 * sinf(now / 700.0f)) : 0);
  if (sleeping) {
    display.drawArc(76, eyeY + 4, 23, 20, 35, 145, TFT_WHITE, TFT_BLACK);
    display.drawArc(164, eyeY + 4, 23, 20, 35, 145, TFT_WHITE, TFT_BLACK);
    display.drawString("z", 185, 59, 2);
  } else if (blink || happy) {
    display.drawLine(55, eyeY, 95, eyeY, color);
    display.drawLine(145, eyeY, 185, eyeY, color);
  } else {
    const int radius = listening ? 21 : (speaking ? 13 + (now / 140) % 7 : 16);
    display.fillEllipse(76, eyeY, radius, 23, color);
    display.fillEllipse(164, eyeY, radius, 23, color);
  }
  if (speaking) {
    display.fillEllipse(120, 166, 13, 5 + (now / 120) % 10, TFT_PINK);
  } else if (happy) {
    display.drawArc(120, 150, 24, 21, 20, 160, TFT_PINK, TFT_BLACK);
  } else if (state == State::Processing) {
    display.drawString("...", 108, 158, 2);
  } else if (listening) {
    display.fillCircle(120, 164, 5, TFT_CYAN);
  }
  if (WiFi.status() != WL_CONNECTED) display.fillCircle(120, 222, 3, TFT_RED);
}

bool initAudio() {
  i2s_config_t rx{};
  rx.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_RX);
  rx.sample_rate = SAMPLE_RATE;
  rx.bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT;
  rx.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  rx.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  rx.intr_alloc_flags = 0;
  rx.dma_buf_count = 4;
  rx.dma_buf_len = 256;
  rx.use_apll = false;
  if (i2s_driver_install(I2S_NUM_0, &rx, 0, nullptr) != ESP_OK) return false;
  i2s_pin_config_t rxPins{};
  rxPins.mck_io_num = I2S_PIN_NO_CHANGE;
  rxPins.bck_io_num = PIN_MIC_BCLK;
  rxPins.ws_io_num = PIN_MIC_WS;
  rxPins.data_out_num = I2S_PIN_NO_CHANGE;
  rxPins.data_in_num = PIN_MIC_SD;
  if (i2s_set_pin(I2S_NUM_0, &rxPins) != ESP_OK) return false;
  micReady = true;

  i2s_config_t tx{};
  tx.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX);
  tx.sample_rate = SAMPLE_RATE;
  tx.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  tx.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  tx.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  tx.intr_alloc_flags = 0;
  tx.dma_buf_count = 8;
  tx.dma_buf_len = 256;
  tx.use_apll = false;
  if (i2s_driver_install(I2S_NUM_1, &tx, 0, nullptr) != ESP_OK) return false;
  i2s_pin_config_t txPins{};
  txPins.mck_io_num = I2S_PIN_NO_CHANGE;
  txPins.bck_io_num = PIN_SPK_BCLK;
  txPins.ws_io_num = PIN_SPK_LRC;
  txPins.data_out_num = PIN_SPK_DIN;
  txPins.data_in_num = I2S_PIN_NO_CHANGE;
  if (i2s_set_pin(I2S_NUM_1, &txPins) != ESP_OK) return false;
  i2s_zero_dma_buffer(I2S_NUM_1);
  speakerReady = true;
  return true;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED || strlen(AURA_WIFI_SSID) == 0) return;
  if (lastWifiTryMs && millis() - lastWifiTryMs < WIFI_RETRY_MS) return;
  lastWifiTryMs = millis();
  WiFi.disconnect();
  WiFi.begin(AURA_WIFI_SSID, AURA_WIFI_PASSWORD);
  Serial.println("Connecting Wi-Fi...");
}

class PcmSpeakerStream final : public Stream {
 public:
  size_t write(uint8_t value) override { return write(&value, 1); }
  size_t write(const uint8_t *data, size_t length) override {
    // HTTP chunk boundaries need not align to 16-bit sample boundaries.
    size_t accepted = 0;
    uint8_t aligned[512];
    size_t used = 0;
    for (size_t i = 0; i < length; ++i) {
      if (pending_) {
        int16_t sample = static_cast<int16_t>(static_cast<uint16_t>(lowByte_) |
                                               (static_cast<uint16_t>(data[i]) << 8));
        sample = static_cast<int16_t>((static_cast<int32_t>(sample) * OUTPUT_VOLUME_PERCENT) / 100);
        aligned[used++] = static_cast<uint8_t>(sample & 0xff);
        aligned[used++] = static_cast<uint8_t>((static_cast<uint16_t>(sample) >> 8) & 0xff);
        pending_ = false;
      } else {
        lowByte_ = data[i];
        pending_ = true;
      }
      ++accepted;
      if (used >= sizeof(aligned) - 1) {
        size_t written = 0;
        if (i2s_write(I2S_NUM_1, aligned, used, &written, portMAX_DELAY) != ESP_OK || written != used) return 0;
        used = 0;
        drawFace();
      }
    }
    if (used) {
      size_t written = 0;
      if (i2s_write(I2S_NUM_1, aligned, used, &written, portMAX_DELAY) != ESP_OK || written != used) return 0;
    }
    return accepted;
  }
  int available() override { return 0; }
  int read() override { return -1; }
  int peek() override { return -1; }
  void flush() override {}
  bool aligned() const { return !pending_; }

 private:
  bool pending_ = false;
  uint8_t lowByte_ = 0;
};

void exchangeVoice() {
  if (!speakerReady || WiFi.status() != WL_CONNECTED || strlen(AURA_BACKEND_URL) == 0) {
    Serial.println("Voice skipped: audio, Wi-Fi, or backend URL unavailable");
    enter(State::Idle);
    return;
  }
  HTTPClient http;
  WiFiClient client;
  http.setConnectTimeout(8000);
  http.setTimeout(45000);
  if (!http.begin(client, AURA_BACKEND_URL)) {
    Serial.println("Invalid backend URL");
    enter(State::Idle);
    return;
  }
  http.addHeader("Content-Type", "audio/pcm;rate=16000;channels=1;format=s16le");
  http.addHeader("Accept", "audio/pcm");
  if (strlen(AURA_DEVICE_TOKEN)) http.addHeader("X-Device-Token", AURA_DEVICE_TOKEN);
  const int code = http.POST(reinterpret_cast<uint8_t *>(recording), sampleCount * sizeof(int16_t));
  if (code == HTTP_CODE_OK) {
    enter(State::Speaking);
    digitalWrite(PIN_SPK_SD, HIGH);
    PcmSpeakerStream output;
    const int bytes = http.writeToStream(&output);  // Decodes chunked HTTP transfer.
    if (bytes < 0 || !output.aligned()) Serial.printf("TTS stream error: %d\n", bytes);
    // Let at most eight 256-sample DMA buffers drain before muting (~128 ms).
    delay(180);
    i2s_zero_dma_buffer(I2S_NUM_1);
    digitalWrite(PIN_SPK_SD, LOW);
  } else {
    Serial.printf("Voice backend HTTP %d\n", code);
  }
  http.end();
  enter(State::Idle);
}

void captureAudio() {
  if (!micReady || !recording) {
    enter(State::Idle);
    return;
  }
  int32_t raw[256];
  size_t bytesRead = 0;
  if (i2s_read(I2S_NUM_0, raw, sizeof(raw), &bytesRead, pdMS_TO_TICKS(80)) != ESP_OK) return;
  const size_t frames = bytesRead / sizeof(int32_t);
  uint64_t energy = 0;
  for (size_t i = 0; i < frames && sampleCount < MAX_SAMPLES; ++i) {
    // INMP441 sends 24 useful bits in a 32-bit slot; high 16 are PCM16.
    const int16_t sample = static_cast<int16_t>(raw[i] >> 16);
    recording[sampleCount++] = sample;
    energy += abs(static_cast<int>(sample));
  }
  const uint32_t now = millis();
  if (frames && energy / frames > VOICE_THRESHOLD) {
    lastVoiceMs = now;
    heardVoice = true;
  }
  if (sampleCount >= MAX_SAMPLES ||
      (now - stateSinceMs >= MIN_LISTEN_MS && now - lastVoiceMs >= SILENCE_MS)) {
    if (!heardVoice || sampleCount < SAMPLE_RATE / 4) enter(State::Idle);
    else enter(State::Processing);
  }
}
}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BL, OUTPUT);
  digitalWrite(PIN_BL, HIGH);
  pinMode(PIN_SPK_SD, OUTPUT);
  digitalWrite(PIN_SPK_SD, LOW);
  pinMode(PIN_TOUCH, INPUT);
  attachInterrupt(digitalPinToInterrupt(PIN_TOUCH), onTouch, RISING);
  display.init();
  display.setRotation(0);
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.setTextDatum(TL_DATUM);
  recording = static_cast<int16_t *>(heap_caps_malloc(MAX_SAMPLES * sizeof(int16_t), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT));
  if (!recording) Serial.println("PSRAM allocation failed: voice disabled");
  if (!initAudio()) Serial.println("I2S initialization failed");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  ensureWifi();
  enter(State::Idle);
}

void loop() {
  ensureWifi();
  const uint32_t now = millis();
  if (touchPending) {
    noInterrupts();
    touchPending = false;
    interrupts();
    if (now - lastTouchMs >= TOUCH_DEBOUNCE_MS) {
      lastTouchMs = now;
      lastInteractionMs = now;
      if (state == State::Idle) enter(State::Petting);
      else if (state == State::Listening) enter(State::Processing);
    }
  }
  if (state == State::Petting && now - stateSinceMs >= PET_MS) {
    sampleCount = 0;
    heardVoice = false;
    lastVoiceMs = millis();
    enter(State::Listening);
  }
  if (state == State::Listening) captureAudio();
  if (state == State::Processing) exchangeVoice();
  drawFace();
  delay(5);
}
