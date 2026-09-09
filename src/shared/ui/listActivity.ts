import { useEffect, useState } from "react";

// One clock per page, shared by all rows rather than a timer per list.
export function useActivityClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function listActivityLabel(updatedAt: string, updatedBy: string | null, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(updatedAt)) / 60_000));
  const relative =
    minutes < 1
      ? "Gerade"
      : minutes < 60
        ? `Vor ${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`
        : minutes < 1440
          ? `Vor ${Math.floor(minutes / 60)} ${minutes < 120 ? "Stunde" : "Stunden"}`
          : `Vor ${Math.floor(minutes / 1440)} ${minutes < 2880 ? "Tag" : "Tagen"}`;
  return `${relative} aktualisiert${updatedBy ? " von " + updatedBy : ""}`;
}
