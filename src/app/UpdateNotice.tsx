import { useEffect, useRef, useState } from "react";
import { Button } from "../shared/ui/Button/Button";
import "./updateNotice.css";

const checkIntervalMs = 10 * 60_000;

export function UpdateNotice() {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const dismissedVersion = useRef<string | null>(null);

  useEffect(() => {
    const currentVersion = document
      .querySelector('meta[name="phoget-build-id"]')
      ?.getAttribute("content");
    if (!currentVersion) return;
    const controller = new AbortController();
    let checking = false;
    const check = async () => {
      if (checking || !navigator.onLine || document.visibilityState !== "visible") return;
      checking = true;
      try {
        // HTML is fetched from the server, never from a service worker or HTTP cache.
        const response = await fetch("/index.html", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok || new URL(response.url).origin !== location.origin) return;
        const html = new DOMParser().parseFromString(await response.text(), "text/html");
        const version = html.querySelector('meta[name="phoget-build-id"]')?.getAttribute("content");
        if (
          !controller.signal.aborted &&
          version &&
          version !== currentVersion &&
          version !== dismissedVersion.current
        ) {
          setAvailableVersion(version);
        }
      } catch {
        // Temporary network errors and Cloudflare Access redirects are not updates.
      } finally {
        checking = false;
      }
    };
    const onConnectionChange = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void check();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    const interval = setInterval(() => void check(), checkIntervalMs);
    addEventListener("online", onConnectionChange);
    addEventListener("offline", onConnectionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      controller.abort();
      clearInterval(interval);
      removeEventListener("online", onConnectionChange);
      removeEventListener("offline", onConnectionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (!availableVersion) return null;
  return (
    <div className="update-notice" role="status">
      <span>
        Eine neue Version ist verfügbar. Schließe deine Änderungen vor dem Aktualisieren ab.
      </span>
      <div className="update-notice-actions">
        <Button size="compact" disabled={!online} onClick={() => location.reload()}>
          App aktualisieren
        </Button>
        <Button
          size="compact"
          variant="ghost"
          onClick={() => {
            // Dismiss until a newer build arrives, not just until the next poll.
            dismissedVersion.current = availableVersion;
            setAvailableVersion(null);
          }}
        >
          Später
        </Button>
      </div>
    </div>
  );
}
