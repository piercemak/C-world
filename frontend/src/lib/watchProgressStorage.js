const WATCH_PROGRESS_PREFIX = "watchProgress-";
const HISTORY_LIMIT = 50;

export const cleanMediaId = (id = "") => String(id).replace(/-/g, "");

export const formatWatchProgressKey = ({ showId, season = null, episode = null }) => {
  if (season == null || episode == null) return String(showId || "");

  const seasonNum = Number(season);
  const episodeNum = Number(episode);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return String(showId || "");

  return `${showId}-S${String(seasonNum).padStart(2, "0")}-E${String(episodeNum).padStart(2, "0")}`;
};

export const formatLegacyWatchProgressKey = ({ showId, season = null, episode = null }) => {
  if (season == null || episode == null) return String(showId || "");

  const seasonNum = Number(season);
  const episodeNum = Number(episode);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return String(showId || "");

  return `${showId}-S${seasonNum}-E${episodeNum}`;
};

export const toWatchProgressStorageKey = (input) =>
  `${WATCH_PROGRESS_PREFIX}${formatWatchProgressKey(input)}`;

export const parseWatchProgressPayload = (payload) => {
  if (!payload) return { t: 0, d: 0, updatedAt: 0, fraction: 0 };

  let data = payload;
  if (typeof payload === "string") {
    try {
      data = JSON.parse(payload);
    } catch {
      const t = Number(payload);
      return {
        t: Number.isFinite(t) ? t : 0,
        d: 0,
        updatedAt: 0,
        fraction: 0,
      };
    }
  }

  const t = Number(data?.t ?? data?.currentTime ?? data?.time ?? data?.progress ?? 0);
  const d = Number(data?.d ?? data?.duration ?? data?.len ?? 0);
  const updatedAt = Number(data?.updatedAt ?? data?.updated ?? data?.watchedAt ?? 0);
  const safeT = Number.isFinite(t) ? t : 0;
  const safeD = Number.isFinite(d) ? d : 0;

  return {
    t: safeT,
    d: safeD,
    currentTime: safeT,
    duration: safeD,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    fraction: safeD > 0 ? Math.min(1, Math.max(0, safeT / safeD)) : 0,
  };
};

export const readWatchProgressRaw = (input) => {
  const storageKey = toWatchProgressStorageKey(input);
  const raw = localStorage.getItem(storageKey);
  if (raw != null) return raw;

  const legacyKey = `${WATCH_PROGRESS_PREFIX}${formatLegacyWatchProgressKey(input)}`;
  if (legacyKey === storageKey) return null;

  const legacyRaw = localStorage.getItem(legacyKey);
  if (legacyRaw != null) {
    localStorage.setItem(storageKey, legacyRaw);
    localStorage.removeItem(legacyKey);
    return legacyRaw;
  }

  return null;
};

export const readWatchProgress = (input) =>
  parseWatchProgressPayload(readWatchProgressRaw(input));

export const writeWatchProgress = ({
  showId,
  season = null,
  episode = null,
  currentTime = 0,
  duration = 0,
  updatedAt = Date.now(),
}) => {
  const payload = {
    t: Number(currentTime || 0),
    d: Number(duration || 0),
    currentTime: Number(currentTime || 0),
    duration: Number(duration || 0),
    updatedAt,
  };
  localStorage.setItem(
    toWatchProgressStorageKey({ showId, season, episode }),
    JSON.stringify(payload),
  );
  return payload;
};

export const dispatchWatchProgressUpdate = ({ showId, season = null, episode = null, t = 0, d = 0 }) => {
  window.dispatchEvent(
    new CustomEvent("watchprogress:update", {
      detail: {
        storageKey: formatWatchProgressKey({ showId, season, episode }),
        t,
        d,
      },
    }),
  );
};

export const upsertHistoryEntry = (storageKey, entry) => {
  let list = [];
  try {
    const raw = localStorage.getItem(storageKey);
    list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }

  const entrySeason = entry.lastSeason == null ? null : Number(entry.lastSeason);
  const entryEpisode = entry.lastEpisode == null ? null : Number(entry.lastEpisode);
  const next = [
    {
      ...entry,
      lastSeason: entrySeason,
      lastEpisode: entryEpisode,
      watchedAt: entry.watchedAt || Date.now(),
    },
    ...list.filter((item) => {
      if (!item?.showId) return false;
      return !(
        cleanMediaId(item.showId) === cleanMediaId(entry.showId) &&
        (item.lastSeason == null ? null : Number(item.lastSeason)) === entrySeason &&
        (item.lastEpisode == null ? null : Number(item.lastEpisode)) === entryEpisode
      );
    }),
  ];

  localStorage.setItem(storageKey, JSON.stringify(next.slice(0, HISTORY_LIMIT)));
  return next;
};
