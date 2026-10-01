"use client";

import { useEffect, useState } from "react";

// Hidden until a fresh published setting explicitly enables it. Never cache a reveal.
export function useCompanionEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/site-settings.json`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        const settings = response.ok ? await response.json() : null;
        if (active) setEnabled(settings?.companionEnabled === true);
      } catch { if (active) setEnabled(false); }
      finally { pending = false; }
    };
    const visible = () => { if (!document.hidden) void refresh(); };
    void refresh();
    const timer = setInterval(visible, 30000);
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return enabled;
}
