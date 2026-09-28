import { apiFetch } from "./apiClient.js";
import {
  parseWatchProgressPayload,
  toWatchProgressStorageKey,
} from "./watchProgressStorage.js";

const authedFetch = async (path, options = {}, profileIdOverride = null) =>
  apiFetch(path, {
    ...options,
    auth: true,
    profileId: profileIdOverride,
  });

const clearLocalWatchState = () => {
  const keys = Object.keys(localStorage).filter(
    (key) => key.startsWith("watchProgress-") || key === "lastWatched" || key === "lastWatchedMobile"
  );
  keys.forEach((key) => localStorage.removeItem(key));
};

let hydrationRevision = 0;
export const hydrateWatchDataFromServer = async (profileId = null) => {
  const revision = ++hydrationRevision;
  const selectedProfile = localStorage.getItem("activeProfileId");
  const stillCurrent = () => revision === hydrationRevision && selectedProfile === localStorage.getItem("activeProfileId");
  const sameProfile = localStorage.getItem("watchDataProfileId") === String(profileId ?? selectedProfile);
  const localProgressSnapshot = new Map(
    Object.keys(localStorage)
      .filter((key) => sameProfile && key.startsWith("watchProgress-"))
      .map((key) => [key, parseWatchProgressPayload(localStorage.getItem(key))])
  );

  const progressRes = await authedFetch("/api/progress/", { method: "GET" }, profileId);
  if (progressRes?.ok) {
    const progressItems = await progressRes.json();
    if (!stillCurrent()) return;
    localStorage.setItem("watchDataProfileId", String(profileId ?? selectedProfile));
    Object.keys(localStorage).filter(key => key.startsWith("watchProgress-")).forEach(key => localStorage.removeItem(key));
    const now = Date.now();
    const recentLocalWindowMs = 15 * 60 * 1000;

    progressItems.forEach((item) => {
      const key = toWatchProgressStorageKey({
        showId: item.show_id,
        season: item.season,
        episode: item.episode,
      });
      const localKey = key;
      const localSnapshot = localProgressSnapshot.get(localKey);
      const serverUpdatedAt = new Date(item.updated_at).getTime() || 0;
      const shouldPreferRecentLocal =
        localSnapshot &&
        localSnapshot.updatedAt > serverUpdatedAt &&
        now - localSnapshot.updatedAt <= recentLocalWindowMs;

      if (shouldPreferRecentLocal) {
        localStorage.setItem(
          key,
          JSON.stringify({
            t: Number(localSnapshot.t || 0),
            d: Number(localSnapshot.d || 0),
            updatedAt: Number(localSnapshot.updatedAt || now),
          })
        );
        return;
      }

      localStorage.setItem(
        key,
        JSON.stringify({
          t: Number(item.current_time || 0),
          d: Number(item.duration || 0),
          updatedAt: new Date(item.updated_at).getTime() || Date.now(),
        })
      );
    });

    for (const [key, localSnapshot] of localProgressSnapshot.entries()) {
      if (localStorage.getItem(key)) continue;
      if (!localSnapshot?.updatedAt) continue;
      if (now - localSnapshot.updatedAt > recentLocalWindowMs) continue;

      localStorage.setItem(
        key,
        JSON.stringify({
          t: Number(localSnapshot.t || 0),
          d: Number(localSnapshot.d || 0),
          updatedAt: Number(localSnapshot.updatedAt || now),
        })
      );
    }
  }

  const historyRes = await authedFetch("/api/history/", { method: "GET" }, profileId);
  if (historyRes?.ok) {
    const historyItems = await historyRes.json();
    if (!stillCurrent()) return;
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
  window.dispatchEvent(new Event("watchprogress:update"));
};

export const continueWatchingEntries = () => {
  const latest = new Map();
  for (const key of Object.keys(localStorage).filter(key => key.startsWith("watchProgress-"))) {
    const match = key.slice("watchProgress-".length).match(/^(.*?)(?:-S(\d+)-E(\d+))?$/);
    if (!match) continue;
    const progress = parseWatchProgressPayload(localStorage.getItem(key));
    const entry = { showId: match[1], lastSeason: match[2] ? Number(match[2]) : null, lastEpisode: match[3] ? Number(match[3]) : null, watchedAt: progress.updatedAt, ...progress };
    const id = entry.showId.replace(/-/g, "");
    if (!latest.has(id) || latest.get(id).watchedAt < entry.watchedAt) latest.set(id, entry);
  }
  return [...latest.values()].filter(item => item.d > 0 && item.t > 5 && item.t < item.d - 30).sort((a, b) => b.watchedAt - a.watchedAt);
};

export const removeContinueWatching = async (showId) => {
  const response = await authedFetch("/api/progress/", { method: "GET" });
  if (!response?.ok) throw new Error("Could not load watch progress.");
  const records = await response.json();
  for (const record of records.filter(item => item.show_id.replace(/-/g, "") === showId.replace(/-/g, ""))) {
    const saved = await authedFetch("/api/progress/", { method: "POST", body: JSON.stringify({ show_id: record.show_id, season: record.season, episode: record.episode, current_time: 0, duration: record.duration }) });
    if (!saved?.ok) throw new Error("Could not remove title. Please retry.");
    const value = await saved.json();
    localStorage.setItem(toWatchProgressStorageKey({ showId: record.show_id, season: record.season, episode: record.episode }), JSON.stringify({ t: 0, d: record.duration, updatedAt: Date.parse(value.updated_at) }));
  }
  await hydrateWatchDataFromServer();
};

const progressDebounce = new Map();

const postWatchProgress = async ({
  showId,
  season = null,
  episode = null,
  currentTime = 0,
  duration = 0,
}, { keepalive = false } = {}) => {
  await authedFetch(
    "/api/progress/",
    {
      method: "POST",
      body: JSON.stringify({
        show_id: showId,
        season,
        episode,
        current_time: Number(currentTime || 0),
        duration: Number(duration || 0),
      }),
      keepalive,
    },
    null
  );
};

export const queueWatchProgressSync = ({ showId, season = null, episode = null, currentTime = 0, duration = 0 }) => {
  const debounceKey = `${showId}:${season ?? "m"}:${episode ?? "m"}`;
  const existing = progressDebounce.get(debounceKey);
  if (existing) clearTimeout(existing.timeoutId);

  const timeoutId = setTimeout(async () => {
    progressDebounce.delete(debounceKey);
    await postWatchProgress({ showId, season, episode, currentTime, duration });
  }, 1500);

  progressDebounce.set(debounceKey, { timeoutId });
};

export const flushWatchProgressSync = async ({
  showId,
  season = null,
  episode = null,
  currentTime = 0,
  duration = 0,
}) => {
  const debounceKey = `${showId}:${season ?? "m"}:${episode ?? "m"}`;
  const existing = progressDebounce.get(debounceKey);
  if (existing) {
    clearTimeout(existing.timeoutId);
    progressDebounce.delete(debounceKey);
  }

  await postWatchProgress(
    { showId, season, episode, currentTime, duration },
    { keepalive: true }
  );
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
