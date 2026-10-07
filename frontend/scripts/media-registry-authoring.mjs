import { validateRegistry } from "./generate-media-registry.mjs";

export function addRegistryEntry(registry, entry, { dateAdded, newMedia = false } = {}) {
  const next = structuredClone(registry);
  if (next.media[entry.id]) throw Error(`Media registry already has ${entry.id}.`);
  const existing = Object.values(next.media);
  if (existing.some(item => item.assetId === entry.assetId || item.sidebar?.cardId === entry.cardId)) throw Error("Asset ID or card ID is already in use.");
  const nextOrder = field => Math.max(-1, ...existing.map(item => field === "mobileOrder" ? item.mobileOrder : item[field]?.order ?? -1)) + 1;
  const library = {
    type: entry.mediaType, title: entry.title, agerating: entry.ageRating,
    release_year: entry.releaseYear, genre: entry.genre,
    ...(entry.mediaType === "movie" ? { duration: entry.duration } : {
      season_total_number: `${entry.seasonCount} season${entry.seasonCount === 1 ? "" : "s"}`,
      season_digit: entry.seasonCount,
    }),
    description: entry.description, background: entry.cover, subtitles: entry.subtitles,
  };
  const item = {
    assetId: entry.assetId, library,
    mobile: { creator: entry.creator, background: entry.backdrop, ratings: entry.rating,
      type: entry.mediaType === "show" ? "TV" : "Movies", keyart: entry.keyart, card: entry.card, dateadded: dateAdded },
    mobileOrder: nextOrder("mobileOrder"),
    sidebar: { cardId: entry.cardId, order: nextOrder("sidebar") },
    carousel: { order: nextOrder("carousel") },
    captions: entry.subtitles !== "yes" ? {} : entry.mediaType === "movie"
      ? { movie: entry.subtitlePath }
      : { series: `/subtitles/${entry.assetId}/season{season}/S{season}E{episode2}_subtitles.vtt` },
  };
  if (entry.episodeCatalog) {
    item.episodeTitles = entry.episodeCatalog.titlesBySeason;
    item.episodeMetadata = entry.episodeCatalog.metadataBySeason;
    item.seasonLengths = Object.fromEntries(Object.entries(item.episodeTitles).map(([season,titles])=>[season,titles.length]));
    item.skipTimes = { seasons: Object.fromEntries(Object.entries(item.episodeTitles).map(([season,titles])=>[
      season, Object.fromEntries(titles.map((_,index)=>[index+1,{intro:{start:0,end:0},outro:{start:0,skipTo:"next"}}])),
    ])) };
  }
  next.media[entry.id] = item;
  if (newMedia) {
    const firstSeason = Math.min(...Object.keys(item.episodeTitles || {1:[]}).map(Number));
    const episodeTitle = entry.episodeCatalog?.displayTitlesBySeason?.[firstSeason]?.[0]
      || String(item.episodeTitles?.[firstSeason]?.[0] || "Episode 1").replaceAll("_", " ");
    next.newMedia.unshift(entry.mediaType === "movie" ? {
      kind: "movie", showSlug: entry.id, placeholder: entry.placeholder,
      to: `/video-library/${entry.id}?movie=1`,
    } : {
      kind: "episode", showSlug: entry.id, season:firstSeason, episode:1, episodeTitle,
      placeholder:`https://d20honz3pkzrs8.cloudfront.net/${entry.assetId}/placeholders/season${firstSeason}/S${firstSeason}E1_${entry.assetId}_placeholder.png`,
      to:`/video-library/${entry.id}?season=${firstSeason}&episode=1`,
    });
  }
  validateRegistry(next);
  return next;
}
