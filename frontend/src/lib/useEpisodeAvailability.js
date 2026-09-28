import { useEffect, useState } from "react";
import { apiFetch } from "./apiClient.js";
const UNKNOWN = Object.freeze({});

// Unknown is deliberately different from false: an offline API must not label
// an entire season as missing. Refresh while browsing so later uploads appear.
export default function useEpisodeAvailability(mediaId, season, enabled = true) {
  const [result, setResult] = useState(null);
  const key = `${mediaId}:${season}`;
  useEffect(() => {
    if (!enabled || !mediaId || !season) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await apiFetch(`/api/catalog/v1/media/${encodeURIComponent(mediaId)}/availability/?season=${season}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Availability unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ key, episodes: data.episodes || {} });
      } catch {
        if (!controller.signal.aborted) setResult(null);
      } finally { busy = false; }
    }
    refresh();
    const timer = setInterval(refresh, 65000);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [mediaId, season, enabled, key]);
  return enabled && result?.key === key ? result.episodes : UNKNOWN;
}
