const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getAuthContext = () => {
  const token = localStorage.getItem("authToken");
  const activeProfile = JSON.parse(localStorage.getItem("activeProfile") || "null");
  return { token, profileId: activeProfile?.id || null };
};

const authedFetch = async (path, options = {}, profileIdOverride = null) => {
  const { token, profileId } = getAuthContext();
  if (!token) return null;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Token ${token}`,
    "X-Profile-Id": String(profileIdOverride || profileId || ""),
  };

  if (!headers["X-Profile-Id"] || headers["X-Profile-Id"] === "null") return null;

  return fetch(`${API_BASE}${path}`, { ...options, headers });
};

const clearLocalWatchState = () => {
  const keys = Object.keys(localStorage).filter(
    (key) => key.startsWith("watchProgress-") || key === "lastWatched" || key === "lastWatchedMobile"
  );
  keys.forEach((key) => localStorage.removeItem(key));
};

const toStorageKey = ({ show_id, season, episode }) => {
  if (season == null || episode == null) return `watchProgress-${show_id}`;
  return `watchProgress-${show_id}-S${String(season).padStart(2, "0")}-E${String(episode).padStart(2, "0")}`;
};

export const hydrateWatchDataFromServer = async (profileId = null) => {
  clearLocalWatchState();

  const progressRes = await authedFetch("/api/progress/", { method: "GET" }, profileId);
  if (progressRes?.ok) {
    const progressItems = await progressRes.json();
    progressItems.forEach((item) => {
      const key = toStorageKey(item);
      localStorage.setItem(
        key,
        JSON.stringify({
          t: Number(item.current_time || 0),
          d: Number(item.duration || 0),
          updatedAt: new Date(item.updated_at).getTime() || Date.now(),
        })
      );
    });
  }

  const historyRes = await authedFetch("/api/history/", { method: "GET" }, profileId);
  if (historyRes?.ok) {
    const historyItems = await historyRes.json();
    const normalized = historyItems
      .map((item) => ({
        showId: item.show_id,
        watchedAt: new Date(item.watched_at).getTime() || Date.now(),
        lastSeason: item.season,
        lastEpisode: item.episode,
      }))
      .sort((a, b) => b.watchedAt - a.watchedAt);

    localStorage.setItem("lastWatched", JSON.stringify(normalized.slice(0, 50)));
    localStorage.setItem("lastWatchedMobile", JSON.stringify(normalized.slice(0, 50)));
  }
};

const progressDebounce = new Map();
export const queueWatchProgressSync = ({ showId, season = null, episode = null, currentTime = 0, duration = 0 }) => {
  const debounceKey = `${showId}:${season ?? "m"}:${episode ?? "m"}`;
  const existing = progressDebounce.get(debounceKey);
  if (existing) clearTimeout(existing.timeoutId);

  const timeoutId = setTimeout(async () => {
    progressDebounce.delete(debounceKey);
    await authedFetch("/api/progress/", {
      method: "POST",
      body: JSON.stringify({
        show_id: showId,
        season,
        episode,
        current_time: Number(currentTime || 0),
        duration: Number(duration || 0),
      }),
    });
  }, 1500);

  progressDebounce.set(debounceKey, { timeoutId });
};

export const syncWatchHistory = async ({ showId, season = null, episode = null }) => {
  await authedFetch("/api/history/", {
    method: "POST",
    body: JSON.stringify({
      show_id: showId,
      season,
      episode,
    }),
  });
};

export const removeWatchHistory = async ({ showId, season = null, episode = null }) => {
  await authedFetch("/api/history/", {
    method: "DELETE",
    body: JSON.stringify({
      show_id: showId,
      season,
      episode,
    }),
  });
};
