import { skipTimes, mediaAssetIds } from "./skipTimesData.js";

// Shared by browser playback and both native catalog generators.
export function getSkipMarkers(mediaId, season, episode) {
  const key = mediaAssetIds[mediaId] || String(mediaId || "").replaceAll("-", "").toLowerCase();
  const config = skipTimes[key];
  const perEpisode = config?.seasons?.[season]?.[episode];
  const defaults = perEpisode || config?.default;
  if (!defaults) return { intro: null, outro: null };
  const matched = perEpisode ? null : config?.rules?.find(rule =>
    season > rule.fromSeason || (season === rule.fromSeason && episode >= rule.fromEpisode));
  const intro = matched?.intro ?? defaults.intro ?? null;
  const outro = matched?.outro ?? defaults.outro ?? null;
  return {
    intro: intro && Number.isFinite(intro.start) && Number.isFinite(intro.end)
      && intro.start >= 0 && intro.end > intro.start ? intro : null,
    outro: outro && Number.isFinite(outro.start) && outro.start > 0 ? outro : null,
  };
}
