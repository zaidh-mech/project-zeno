"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./CompanionPet.module.css";

const SERVICE_UUID = "2c7f0001-2530-4d35-8fbc-a99878fe0001";
const WRITE_UUID = "2c7f0002-2530-4d35-8fbc-a99878fe0001";

type Writer = { writeValueWithResponse(value: BufferSource): Promise<void> };
type Device = {
  name?: string;
  gatt?: { connected: boolean; connect(): Promise<{ getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<Writer> }> }> };
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
type BluetoothNavigator = Navigator & { bluetooth?: { requestDevice(options: object): Promise<Device> } };

export default function CompanionPet() {
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Tap Aura to connect with your desk companion.");
  const device = useRef<Device | null>(null);
  const writer = useRef<Writer | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setSupported(Boolean((navigator as BluetoothNavigator).bluetooth && window.isSecureContext));
    return () => {
      if (device.current) device.current.removeEventListener("gattserverdisconnected", disconnected);
    };
  }, []);

  function disconnected() {
    writer.current = null;
    device.current = null;
    setConnected(false);
    setStatus("Aura disconnected. Tap to connect again.");
  }

  async function sendHappy() {
    if (!writer.current) throw new Error("Aura is not connected.");
    const bytes = new TextEncoder().encode('{"type":"expression","name":"happy"}\n');
    const send = async () => {
      for (let start = 0; start < bytes.length; start += 20) await writer.current!.writeValueWithResponse(bytes.slice(start, start + 20));
    };
    const next = queue.current.then(send, send);
    queue.current = next.catch(() => {});
    await next;
  }

  async function interact() {
    if (busy) return;
    setBusy(true);
    try {
      if (connected && device.current?.gatt?.connected) {
        await sendHappy();
        setStatus("Aura smiled back at you. Tap again whenever you like.");
      } else {
        const bluetooth = (navigator as BluetoothNavigator).bluetooth;
        if (!bluetooth || !window.isSecureContext) throw new Error("Use Chrome on Android over HTTPS to connect to Aura.");
        setStatus("Choose your Aura in the Bluetooth prompt.");
        const selected = await bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
        const server = await selected.gatt?.connect();
        if (!server) throw new Error("Aura did not accept the connection.");
        const service = await server.getPrimaryService(SERVICE_UUID);
        writer.current = await service.getCharacteristic(WRITE_UUID);
        device.current = selected;
        selected.addEventListener("gattserverdisconnected", disconnected);
        setConnected(true);
        await sendHappy();
        setStatus(`${selected.name || "Aura"} is connected and smiling with you.`);
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === "NotFoundError" ? "Connection cancelled. Tap Aura when you’re ready." : `Couldn’t connect: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setBusy(false); }
  }

  return <div className={styles.petArea}>
    <button className={`${styles.pet} ${connected ? styles.connected : ""}`} type="button" onClick={interact} disabled={busy} aria-label={connected ? "Tap Aura to make your companion smile" : "Connect to your Aura companion"}>
      <span className={styles.body} aria-hidden="true"><span className={styles.eyes}><i /><i /></span><span className={styles.blush} /><span className={styles.mouth} /></span>
      <span className={styles.petText}>{busy ? "Connecting…" : connected ? "Tap for a smile" : "Tap me to connect"}</span>
    </button>
    <p className={styles.status} role="status">{supported ? status : "Bluetooth pairing needs Chrome on Android over HTTPS."}</p>
    <Link className={styles.controlLink} href="/control">Set up voice and Wi-Fi for Aura</Link>
  </div>;
}
