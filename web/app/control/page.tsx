"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const SERVICE_UUID = "2c7f0001-2530-4d35-8fbc-a99878fe0001";
const WRITE_UUID = "2c7f0002-2530-4d35-8fbc-a99878fe0001";
const STATUS_UUID = "2c7f0003-2530-4d35-8fbc-a99878fe0001";
const MAX_RECORD_SECONDS = 20;

type Expression = "idle" | "happy" | "listening" | "thinking" | "speaking" | "sad" | "look_left" | "look_right" | "blink";
type GattCharacteristic = {
  writeValueWithResponse(value: BufferSource): Promise<void>;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<GattCharacteristic>;
  addEventListener(type: string, listener: (event: Event) => void): void;
};
type BluetoothDevice = {
  name?: string;
  gatt?: { connect(): Promise<{ getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<GattCharacteristic> }> }> };
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
type BluetoothNavigator = Navigator & { bluetooth?: { requestDevice(options: object): Promise<BluetoothDevice> } };
type VoiceResponse = { job_id: string; transcript: string; reply: string };

function toPcm16(chunks: Float32Array[], sourceRate: number): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const source = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) { source.set(chunk, offset); offset += chunk.length; }
  const sampleCount = Math.floor(length * 16000 / sourceRate);
  const result = new Uint8Array(sampleCount * 2);
  const view = new DataView(result.buffer);
  for (let i = 0; i < sampleCount; i++) {
    const position = i * sourceRate / 16000;
    const index = Math.floor(position);
    const fraction = position - index;
    const value = source[index] * (1 - fraction) + source[Math.min(index + 1, length - 1)] * fraction;
    const clamped = Math.max(-1, Math.min(1, value));
    view.setInt16(i * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true);
  }
  return result;
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function expressionFromSpeech(transcript: string): Expression | null {
  const speech = transcript.toLowerCase();
  if (/\blook (?:to (?:the |your )?)?left\b/.test(speech)) return "look_left";
  if (/\blook (?:to (?:the |your )?)?right\b/.test(speech)) return "look_right";
  if (/\bblink\b/.test(speech)) return "blink";
  if (/\b(?:smile|be happy|look happy)\b/.test(speech)) return "happy";
  if (/\b(?:be sad|look sad)\b/.test(speech)) return "sad";
  return null;
}

export default function ControlPage() {
  const [supported, setSupported] = useState(true);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("Aura");
  const [status, setStatus] = useState("Pair your Aura to begin.");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [expression, setExpression] = useState<Expression>("idle");
  const [backendUrl, setBackendUrl] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [answer, setAnswer] = useState<VoiceResponse | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const writeRef = useRef<GattCharacteristic | null>(null);
  const statusRef = useRef<GattCharacteristic | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const recorderRef = useRef<{ context: AudioContext; stream: MediaStream; source: MediaStreamAudioSourceNode; worklet: AudioWorkletNode; mute: GainNode; chunks: Float32Array[]; timer: ReturnType<typeof setTimeout> } | null>(null);
  const stopRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    setSupported(Boolean((navigator as BluetoothNavigator).bluetooth && navigator.mediaDevices && window.isSecureContext));
    setBackendUrl(localStorage.getItem("aura-backend-url") ?? "");
    return () => {
      const recorder = recorderRef.current;
      if (recorder) {
        clearTimeout(recorder.timer);
        recorder.stream.getTracks().forEach((track) => track.stop());
        void recorder.context.close();
        recorderRef.current = null;
      }
    };
  }, []);

  function validateBackend() {
    const url = new URL(backendUrl.trim());
    if (url.username || url.password || url.search || url.hash) throw new Error("Use only the backend base URL, without credentials or a path query.");
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("Use an HTTPS backend URL when the phone website is hosted online.");
    }
    return url.href.replace(/\/$/, "");
  }

  async function sendCommand(command: object) {
    const characteristic = writeRef.current;
    if (!characteristic) throw new Error("Pair Aura first.");
    const encoded = new TextEncoder().encode(JSON.stringify(command) + "\n");
    if (encoded.length > 512) throw new Error("Command is too long for Aura (512 byte limit).");
    const send = async () => {
      for (let i = 0; i < encoded.length; i += 20) {
        await characteristic.writeValueWithResponse(encoded.slice(i, i + 20));
      }
    };
    const queued = writeQueue.current.then(send, send);
    writeQueue.current = queued.catch(() => {});
    return queued;
  }

  async function readDeviceStatus() {
    const characteristic = statusRef.current;
    if (!characteristic) return;
    const value = await characteristic.readValue();
    setStatus(new TextDecoder().decode(value));
  }

  async function pair() {
    try {
      setBusy(true);
      const bluetooth = (navigator as BluetoothNavigator).bluetooth;
      if (!bluetooth) throw new Error("Web Bluetooth is unavailable. Open this page in Chrome on Android over HTTPS.");
      const device = await bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Aura did not accept the connection.");
      const service = await server.getPrimaryService(SERVICE_UUID);
      const writer = await service.getCharacteristic(WRITE_UUID);
      const statusCharacteristic = await service.getCharacteristic(STATUS_UUID);
      deviceRef.current = device;
      writeRef.current = writer;
      statusRef.current = statusCharacteristic;
      setDeviceName(device.name || "Aura");
      device.addEventListener("gattserverdisconnected", disconnected);
      statusCharacteristic.addEventListener("characteristicvaluechanged", (event) => {
        const value = (event.target as unknown as { value: DataView }).value;
        setStatus(new TextDecoder().decode(value));
      });
      await statusCharacteristic.startNotifications();
      await readDeviceStatus();
      setConnected(true);
    } catch (error) { setStatus(`Pairing failed: ${readableError(error)}`); }
    finally { setBusy(false); }
  }

  function disconnected() {
    writeRef.current = null;
    statusRef.current = null;
    deviceRef.current = null;
    setConnected(false);
    setStatus("Aura disconnected. Pair again to continue.");
  }

  async function setEyes(name: Expression) {
    try {
      await sendCommand({ type: "expression", name });
      setExpression(name);
      setStatus(`Aura's eyes: ${name.replace("_", " ")}.`);
    } catch (error) { setStatus(`Eye command failed: ${readableError(error)}`); }
  }

  async function saveConnection() {
    try {
      setBusy(true);
      const url = validateBackend();
      if (!deviceToken.trim()) throw new Error("Enter the device token from your backend setup.");
      localStorage.setItem("aura-backend-url", url);
      await sendCommand({ type: "config", backend_url: url, device_token: deviceToken.trim() });
      await new Promise((resolve) => setTimeout(resolve, 150));
      await readDeviceStatus();
    } catch (error) { setStatus(`Audio setup failed: ${readableError(error)}`); }
    finally { setBusy(false); }
  }

  async function saveWifi() {
    try {
      setBusy(true);
      if (!ssid.trim()) throw new Error("Enter a Wi-Fi name.");
      await sendCommand({ type: "wifi", ssid: ssid.trim(), password: wifiPassword });
      setWifiPassword("");
      await new Promise((resolve) => setTimeout(resolve, 150));
      await readDeviceStatus();
    } catch (error) { setStatus(`Wi-Fi setup failed: ${readableError(error)}`); }
    finally { setBusy(false); }
  }

  async function startRecording() {
    try {
      if (!connected) throw new Error("Pair Aura first.");
      validateBackend();
      if (!deviceToken.trim()) throw new Error("Enter the device token first.");
      await sendCommand({ type: "expression", name: "listening" });
      setAnswer(null);
      setBusy(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      const context = new AudioContext();
      try {
        await context.audioWorklet.addModule("/pcm-capture-processor.js");
        const source = context.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(context, "pcm-capture-processor");
        const mute = context.createGain();
        mute.gain.value = 0;
        const chunks: Float32Array[] = [];
        worklet.port.onmessage = (event: MessageEvent<Float32Array>) => chunks.push(event.data);
        source.connect(worklet).connect(mute).connect(context.destination);
        await context.resume();
        const timer = setTimeout(() => { void stopRef.current(); }, MAX_RECORD_SECONDS * 1000);
        recorderRef.current = { context, stream, source, worklet, mute, chunks, timer };
        setRecording(true);
        setStatus("Listening through your phone. Tap Stop when you finish.");
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        await context.close();
        throw error;
      }
    } catch (error) { setStatus(`Microphone failed: ${readableError(error)}`); }
    finally { setBusy(false); }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    clearTimeout(recorder.timer);
    setRecording(false);
    setBusy(true);
    try {
      recorder.worklet.port.postMessage("flush");
      await new Promise((resolve) => setTimeout(resolve, 80));
      recorder.source.disconnect();
      recorder.worklet.disconnect();
      recorder.mute.disconnect();
      recorder.stream.getTracks().forEach((track) => track.stop());
      const pcm = toPcm16(recorder.chunks, recorder.context.sampleRate);
      await recorder.context.close();
      if (pcm.length < 3200) throw new Error("Please speak for at least a moment and try again.");
      await sendCommand({ type: "expression", name: "thinking" });
      setStatus("Aura is thinking...");
      const audioBody = new ArrayBuffer(pcm.byteLength);
      new Uint8Array(audioBody).set(pcm);
      const response = await fetch(`${validateBackend()}/v1/phone-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-Device-Token": deviceToken.trim() },
        body: audioBody,
      });
      if (!response.ok) throw new Error(`Audio service returned HTTP ${response.status}. Check its URL and token.`);
      const result = await response.json() as VoiceResponse;
      if (!/^[0-9a-f]{32}$/.test(result.job_id)) throw new Error("Audio service returned an invalid job ID.");
      setAnswer(result);
      const requestedExpression = expressionFromSpeech(result.transcript);
      if (requestedExpression) {
        await sendCommand({ type: "expression", name: requestedExpression });
        setExpression(requestedExpression);
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      await sendCommand({ type: "play", job_id: result.job_id });
      setStatus("Aura is answering through its speaker.");
    } catch (error) {
      setStatus(`Voice request failed: ${readableError(error)}`);
      try { await sendCommand({ type: "expression", name: "sad" }); } catch { /* BLE may be gone. */ }
    } finally { setBusy(false); }
  }
  stopRef.current = stopRecording;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}><Link href="/" className={styles.brand}>← Aura&apos;s birthday world</Link><span className={styles.tag}>phone companion</span></header>
        <div className={styles.intro}><span className={styles.eyebrow}>A tiny buddy, a big connection</span><h1>Give Aura a <em>voice.</em></h1><p>Your Android phone listens and does the AI work. Aura shows how it feels and speaks the answer from its own little speaker.</p></div>
        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="pair-heading">
            <span className={styles.step}>01 / PAIR</span><h2 id="pair-heading">Connect your buddy</h2>
            <p>Turn Aura on, then hold its touch pad for 3 seconds before first pairing. Keep it nearby and use Chrome on Android with Bluetooth enabled. If Android asks for a pairing code, read it from Aura&apos;s screen.</p>
            <button className={styles.primary} onClick={pair} disabled={!supported || busy || connected}>{connected ? `Connected to ${deviceName}` : "Pair Aura by Bluetooth"}</button>
            {!supported && <p className={styles.warning}>This needs Android Chrome over HTTPS (or localhost), Bluetooth, and microphone access.</p>}
          </section>
          <section className={styles.card} aria-labelledby="service-heading">
            <span className={styles.step}>02 / AUDIO</span><h2 id="service-heading">Set the audio service</h2>
            <p>Use the HTTPS address and device token supplied with your Aura service. Aura&apos;s firmware must include the service&apos;s TLS CA certificate. Hold its touch pad for 3 seconds before saving these settings.</p>
            <label>Service URL<input type="url" placeholder="https://your-aura-service.example" value={backendUrl} onChange={(event) => setBackendUrl(event.target.value)} autoComplete="url" /></label>
            <label>Device token<input type="password" placeholder="Paste device token" value={deviceToken} onChange={(event) => setDeviceToken(event.target.value)} autoComplete="off" /></label>
            <button className={styles.secondary} onClick={saveConnection} disabled={!connected || busy}>Save to Aura</button>
          </section>
          <section className={styles.card} aria-labelledby="wifi-heading">
            <span className={styles.step}>03 / NETWORK</span><h2 id="wifi-heading">Choose a Wi-Fi network</h2>
            <p>Hold Aura&apos;s touch pad for 3 seconds, then send a 2.4 GHz Wi-Fi network. A phone hotspot works too if it allows Aura to connect. Your phone&apos;s mobile data alone does not give Aura internet.</p>
            <label>Wi-Fi name<input value={ssid} onChange={(event) => setSsid(event.target.value)} autoComplete="off" /></label>
            <label>Wi-Fi password<input type="password" value={wifiPassword} onChange={(event) => setWifiPassword(event.target.value)} autoComplete="off" /></label>
            <button className={styles.secondary} onClick={saveWifi} disabled={!connected || busy}>Send network to Aura</button>
          </section>
          <section className={styles.card} aria-labelledby="face-heading">
            <span className={styles.step}>04 / EXPRESSIONS</span><h2 id="face-heading">Move those little eyes</h2>
            <p>Give Aura an expression from your phone.</p>
            <div className={styles.faces}>{(["happy", "blink", "look_left", "look_right", "sad", "idle"] as Expression[]).map((name) => <button key={name} className={expression === name ? styles.activeFace : styles.face} onClick={() => void setEyes(name)} disabled={!connected || busy}>{name.replace("_", " ")}</button>)}</div>
          </section>
        </div>
        <section className={styles.voice} aria-labelledby="voice-heading">
          <div><span className={styles.step}>05 / TALK</span><h2 id="voice-heading">Say something to Aura.</h2><p>Your phone is the microphone. Aura&apos;s speaker gives you the answer. Try “look left” or “blink” to move its eyes. You can record for up to 20 seconds.</p></div>
          <button className={recording ? styles.stop : styles.talk} onClick={() => void (recording ? stopRecording() : startRecording())} disabled={!connected || (busy && !recording)}>{recording ? "Stop and ask Aura" : "Talk to Aura"}</button>
        </section>
        <div className={styles.status} role="status" aria-live="polite"><span className={connected ? styles.liveDot : styles.offDot} />{status}</div>
        {answer && <section className={styles.answer} aria-label="Latest conversation"><p><strong>You said</strong> {answer.transcript}</p><p><strong>Aura replied</strong> {answer.reply}</p></section>}
        <p className={styles.footnote}>The phone needs this page open for voice requests. Aura needs Wi-Fi or a hotspot to download speech. Network details are saved on Aura; the device token is kept only in this page until it closes.</p>
      </div>
    </main>
  );
}
