import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { buildLibraryShows } from "../data/libraryShowsData.js";
import { allEpisodeMetadata, allEpisodeTitles } from "./episodeTitles.js";
import { SHOWS } from "./mobileshowsData.js";
import Show from "./Show.jsx";
import Menu from "./framercomponents/Menu.jsx";
import PlayPauseButton from "./framercomponents/PlayPauseButton";
import VolumeSlider from "./VolumeSlider.jsx";
import SkipForward from "../assets/icons/SkipForward.svg";
import SkipBack from "../assets/icons/SkipBack.svg";
import { syncWatchHistory } from "../lib/watchSync.js";
import {
  fetchSignedEpisodeUrl as fetchSignedEpisodePlaybackUrl,
  fetchSignedUrl as fetchSignedAssetUrl,
} from "../lib/mediaSigning.js";
import {
  formatWatchProgressKey,
  readWatchProgress,
  upsertHistoryEntry,
} from "../lib/watchProgressStorage.js";

const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";

const cleanMediaId = (id = "") => id.replace(/-/g, "");

const normalizeType = (type = "") => (
  String(type).toLowerCase() === "tv" || String(type).toLowerCase() === "show"
    ? "show"
    : "movie"
);

const libraryMetadata = buildLibraryShows({
  videoDataByShow: {},
  generateSeasonVideos: () => [],
});

const metadataByCleanId = Object.fromEntries(
  Object.entries(libraryMetadata).map(([id, metadata]) => [cleanMediaId(id), metadata]),
);

const titleToRuntime = (media) => (
  media.duration
  || (media.type === "show" ? "22m" : "1h 45m")
);

const getSeasonNumbers = (media) => {
  if (media.type !== "show") return [];

  const titlesBySeason = allEpisodeTitles[media.id] || allEpisodeTitles[cleanMediaId(media.id)] || {};
  const dataSeasons = Object.keys(titlesBySeason)
    .map((season) => Number(season))
    .filter(Number.isFinite);

  const knownSeasonCount = Number(media.seasonDigit || 0);
  const sunnySeasonCount = cleanMediaId(media.id) === "itsalwayssunny" ? 20 : 0;
  const seasonCount = Math.max(knownSeasonCount, sunnySeasonCount, ...dataSeasons, 1);

  return Array.from({ length: seasonCount }, (_, index) => index + 1);
};

const getMoviePlaceholder = (media) => (
  `/images/${cleanMediaId(media.id)}/placeholders/${cleanMediaId(media.id)}_placeholder.png`
);

const getEpisodePlaceholder = (media, seasonNumber, episodeNumber) => {
  const cleanId = cleanMediaId(media.id);
  return `${cloudFrontDomain}/${cleanId}/placeholders/season${seasonNumber}/S${seasonNumber}E${episodeNumber}_${cleanId}_placeholder.png`;
};

const getEpisodeMetadata = (media, seasonNumber, episodeNumber) => {
  const metadataBySeason = allEpisodeMetadata[media.id] || allEpisodeMetadata[media.cleanId] || {};
  return (
    metadataBySeason?.[seasonNumber]?.[episodeNumber - 1]
    || metadataBySeason?.[String(seasonNumber)]?.[episodeNumber - 1]
    || null
  );
};

const getStatus = (progress) => {
  if (progress >= 95) return "Watched";
  if (progress > 0) return "Continue";
  return "Unwatched";
};

const getProgress = (mediaId, seasonNumber, episodeNumber) => {
  const seed = Array.from(`${mediaId}-${seasonNumber}-${episodeNumber}`)
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const values = [0, 0, 12, 28, 42, 68, 83, 100];
  return values[seed % values.length];
};

const formatProgress = (value) => `${Math.round(value)}%`;

const getPrimaryActionLabel = (episode) => {
  if (!episode) return "Play";
  if (episode.progress >= 95) return "Play Again";
  if (episode.progress > 0) return "Resume";
  return "Play";
};

const heroVariants = {
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(8px)" },
};

const railVariants = {
  animate: {
    transition: {
      staggerChildren: 0.035,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.98 },
};

const heroLayoutTransition = {
  layout: {
    type: "spring",
    stiffness: 300,
    damping: 34,
    mass: 0.95,
  },
  opacity: { duration: 0.28, ease: "easeOut" },
  y: { duration: 0.32, ease: "easeOut" },
};

const softHoverTransition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.85,
};

const crispHoverTransition = {
  type: "spring",
  stiffness: 340,
  damping: 30,
  mass: 0.8,
};

const playerGrowTransition = {
  type: "spring",
  stiffness: 120,
  damping: 21,
  mass: 0.95,
  opacity: { duration: 0.28, ease: "easeOut" },
};

const textContentVariants = {
  initial: { opacity: 0, y: 10, filter: "blur(5px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(5px)" },
};

const getHeroTitleSizeClass = (title, isEpisodeMode) => {
  const length = String(title || "").length;
  const words = String(title || "").trim().split(/\s+/).filter(Boolean).length;

  if (isEpisodeMode && (length > 95 || words > 14)) return "text-2xl sm:text-3xl lg:text-4xl";
  if (isEpisodeMode && (length > 76 || words > 11)) return "text-3xl sm:text-4xl lg:text-[2.9rem]";
  if (length > 58 || words > 8) return "text-4xl sm:text-5xl lg:text-[3.35rem]";
  if (isEpisodeMode && (length > 34 || words > 5)) return "text-4xl sm:text-5xl lg:text-6xl";
  return "text-5xl sm:text-6xl lg:text-7xl";
};

const getHeroDescriptionClamp = (title, description, isEpisodeMode) => {
  if (!isEpisodeMode) return 3;

  const titleLength = String(title || "").length;
  const titleWords = String(title || "").trim().split(/\s+/).filter(Boolean).length;
  const descriptionLength = String(description || "").length;

  if (titleLength > 95 || titleWords > 14 || descriptionLength > 360) return 1;
  if (titleLength > 68 || titleWords > 10 || descriptionLength > 240) return 2;
  return 3;
};

const createPreviewMedia = (item) => {
  const cleanId = cleanMediaId(item.id);
  const metadata = libraryMetadata[item.id] || metadataByCleanId[cleanId] || {};
  const type = normalizeType(metadata.type || item.type);
  const seasonDigit = Number(metadata.season_digit || 0);

  return {
    id: item.id,
    cleanId,
    title: metadata.title || item.title,
    type,
    creator: item.creator || metadata.creator || "",
    rating: item.ratings || metadata.ratings || "NR",
    meta: [
      metadata.release_year,
      metadata.genre,
      type === "show" ? metadata.season_total_number : metadata.duration,
    ].filter(Boolean).join(" • "),
    description: metadata.description || `${item.title} from the current CWorld library.`,
    backdrop: metadata.mobilebackground || metadata.background || item.background || item.keyart,
    cover: metadata.background || item.keyart || item.background,
    logo: item.card,
    seasonDigit,
  };
};

const mediaList = SHOWS.map(createPreviewMedia);

const createMediaFromShow = (id, show = {}) => {
  const cleanId = cleanMediaId(id);
  const item = SHOWS.find((entry) => (
    entry.id === id || cleanMediaId(entry.id) === cleanId
  )) || {};
  const metadata = show || {};
  const type = normalizeType(metadata.type || item.type);

  return {
    id,
    cleanId,
    title: metadata.title || item.title || id,
    type,
    creator: item.creator || metadata.creator || "",
    rating: item.ratings || metadata.ratings || "NR",
    meta: [
      metadata.release_year,
      metadata.genre,
      type === "show" ? metadata.season_total_number : metadata.duration,
    ].filter(Boolean).join(" • "),
    description: metadata.description || `${item.title || id} from the current CWorld library.`,
    backdrop: metadata.mobilebackground || metadata.background || item.background || item.keyart,
    cover: metadata.background || item.keyart || item.background,
    logo: item.card || metadata.logo || item.keyart || metadata.background,
    seasonDigit: Number(metadata.season_digit || 0),
  };
};

const getEpisodesForSeason = (
  media,
  seasonNumber,
  progressResolver = (targetMedia, targetSeason, targetEpisode) =>
    getProgress(targetMedia.id, targetSeason || 1, targetEpisode || 1),
) => {
  if (media.type !== "show") {
    const progress = progressResolver(media, null, null);
    return [
      {
        id: "Movie",
        number: 1,
        title: media.title,
        runtime: titleToRuntime(media),
        progress,
        status: getStatus(progress),
        thumb: getMoviePlaceholder(media),
        description: media.description,
      },
    ];
  }

  const titlesBySeason = allEpisodeTitles[media.id] || allEpisodeTitles[media.cleanId] || {};
  const titles = titlesBySeason[String(seasonNumber)] || [];

  return titles.map((title, index) => {
    const episodeNumber = index + 1;
    const progress = progressResolver(media, seasonNumber, episodeNumber);
    const episodeMetadata = getEpisodeMetadata(media, seasonNumber, episodeNumber);
    const description = typeof episodeMetadata === "string"
      ? episodeMetadata
      : episodeMetadata?.description || "";

    return {
      id: `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`,
      number: episodeNumber,
      title: String(title).replace(/_/g, " "),
      runtime: titleToRuntime(media),
      progress,
      status: getStatus(progress),
      thumb: getEpisodePlaceholder(media, seasonNumber, episodeNumber),
      description: description || media.description,
    };
  });
};

const extractS3KeyFromPath = (path = "") => {
  const value = typeof path === "string" ? path : "";
  if (!value) return "";

  if (value.includes("cloudfront.net/")) {
    return value.split("cloudfront.net/")[1] || "";
  }

  const match = value.match(/https:\/\/[^/]+\.amazonaws\.com\/(.+)/);
  return match ? match[1] : "";
};

const getInitialSeason = (media) => {
  const seasons = getSeasonNumbers(media);
  return seasons.includes(5) ? 5 : seasons[0] || null;
};

const getViewportTarget = () => ({
  top: 0,
  left: 0,
  width: window.visualViewport?.width || window.innerWidth,
  height: window.visualViewport?.height || window.innerHeight,
});

const BetterEpisodePreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showId: routeShowId } = useParams();
  const isProductionRoute = Boolean(routeShowId);
  const hoverIntentTimeoutRef = useRef(null);
  const episodeRailRef = useRef(null);
  const sidePreviewRef = useRef(null);
  const previewPlayerFrameRef = useRef(null);
  const previewFullscreenRequestedRef = useRef(false);
  const previewPlayerClosingRef = useRef(false);
  const previewVolumeHoverCloseTimeoutRef = useRef(null);
  const playingRef = useRef(null);
  const queryLaunchKeyRef = useRef("");
  const [selectedMediaId, setSelectedMediaId] = useState(routeShowId || mediaList[0]?.id || "");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [hoverIntentEpisodeId, setHoverIntentEpisodeId] = useState(null);
  const [previewPlayer, setPreviewPlayer] = useState(null);
  const [realPlayerVisible, setRealPlayerVisible] = useState(false);
  const [previewIsPlaying, setPreviewIsPlaying] = useState(false);
  const [previewVolumeHovered, setPreviewVolumeHovered] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(() => {
    const savedVolume = Number(localStorage.getItem("videoVolume"));
    return Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 1;
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [watchProgressVersion, setWatchProgressVersion] = useState(0);
  const awsHostedShows = useMemo(
    () => import.meta.env.VITE_AWS_HOSTED_SHOWS?.split(",").filter(Boolean) || [],
    [],
  );
  const isAwsHostedMedia = useCallback((id, path = "") => {
    const value = String(path || "");
    if (value.includes("amazonaws.com") || value.includes("cloudfront.net")) return true;

    const cleanId = cleanMediaId(id);
    return awsHostedShows.some((hostedId) => (
      hostedId === id || cleanMediaId(hostedId) === cleanId
    ));
  }, [awsHostedShows]);
  const generateSeasonVideos = useCallback((titlesBySeason, rawId, type = "show") => {
    const cleanId = cleanMediaId(rawId);
    const isAwsHosted = isAwsHostedMedia(rawId);

    if (type === "movie") {
      const s3Key = `${cleanId}/${cleanId}.mp4`;
      return [
        {
          path: isAwsHosted
            ? `https://all-shows.s3.us-east-2.amazonaws.com/${s3Key}`
            : `/videos/${cleanId}/${cleanId}.mp4`,
          title: cleanId,
          season: null,
          episode: null,
        },
      ];
    }

    return Object.fromEntries(
      Object.entries(titlesBySeason).map(([seasonNumStr, titles]) => {
        const seasonNum = parseInt(seasonNumStr, 10);
        const seasonKey = `season${seasonNum}`;
        const videos = titles.map((title, index) => {
          const seasonStr = `S${String(seasonNum).padStart(2, "0")}`;
          const episodeStr = `E${String(index + 1).padStart(2, "0")}`;
          const s3Key = `${cleanId}/season${seasonNum}-mp4s/${seasonStr}${episodeStr}_${cleanId}_${title}.mp4`;

          return {
            path: isAwsHosted
              ? `https://all-shows.s3.us-east-2.amazonaws.com/${s3Key}`
              : `/videos/${cleanId}/season${seasonNum}/${seasonStr}${episodeStr}_${cleanId}_${title}.mp4`,
            title,
            season: seasonStr,
            episode: episodeStr,
          };
        });

        return [seasonKey, videos];
      }),
    );
  }, [isAwsHostedMedia]);
  const videoDataByShow = useMemo(
    () => Object.fromEntries(
      Object.entries(allEpisodeTitles).map(([id, titlesBySeason]) => [
        id,
        generateSeasonVideos(titlesBySeason, id),
      ]),
    ),
    [generateSeasonVideos],
  );
  const shows = useMemo(
    () => buildLibraryShows({ videoDataByShow, generateSeasonVideos }),
    [generateSeasonVideos, videoDataByShow],
  );
  const routedShowId = useMemo(() => {
    if (!routeShowId) return "";
    if (shows[routeShowId]) return routeShowId;

    const routeCleanId = cleanMediaId(routeShowId);
    return Object.keys(shows).find((id) => cleanMediaId(id) === routeCleanId) || routeShowId;
  }, [routeShowId, shows]);
  const selectedShow = routeShowId ? shows[routedShowId] : null;
  const selectedMedia = useMemo(
    () => (
      isProductionRoute
        ? createMediaFromShow(routedShowId, selectedShow)
        : mediaList.find((media) => media.id === selectedMediaId) || mediaList[0]
    ),
    [isProductionRoute, routedShowId, selectedMediaId, selectedShow],
  );

  const [selectedSeasonByMedia, setSelectedSeasonByMedia] = useState(() => {
    const entries = mediaList.map((media) => [media.id, getInitialSeason(media)]);
    if (routeShowId) entries.push([routeShowId, 1]);
    return Object.fromEntries(entries);
  });
  const [selectedEpisodeIdByMedia, setSelectedEpisodeIdByMedia] = useState({});

  const seasonNumbers = useMemo(() => getSeasonNumbers(selectedMedia), [selectedMedia]);
  const selectedSeason = selectedSeasonByMedia[selectedMedia.id] || seasonNumbers[0] || null;
  const toProgressStorageKey = useCallback((id, season = null, episode = null) => (
    formatWatchProgressKey({ showId: id, season, episode })
  ), []);
  const readProgress = useCallback((storageKey) => {
    const match = String(storageKey || "").match(/^(.*?)(?:-S(\d+)-E(\d+))?$/);
    if (!match) return { t: 0, d: 0, updatedAt: 0 };

    return readWatchProgress({
      showId: match[1],
      season: match[2] == null ? null : Number(match[2]),
      episode: match[3] == null ? null : Number(match[3]),
    });
  }, []);
  const getWatchProgressPercent = useCallback((mediaId, seasonNumber = null, episodeNumber = null) => {
    const progress = readWatchProgress({ showId: mediaId, season: seasonNumber, episode: episodeNumber });
    if (!progress.duration || progress.duration <= 0) return 0;

    return Math.max(0, Math.min(100, (progress.currentTime / progress.duration) * 100));
  }, []);
  const progressResolver = useCallback((media, seasonNumber, episodeNumber) => (
    isProductionRoute
      ? getWatchProgressPercent(media.id, seasonNumber, episodeNumber)
      : getProgress(media.id, seasonNumber || 1, episodeNumber || 1)
  ), [getWatchProgressPercent, isProductionRoute]);
  const episodes = useMemo(
    () => getEpisodesForSeason(selectedMedia, selectedSeason, progressResolver),
    [progressResolver, selectedMedia, selectedSeason, watchProgressVersion],
  );

  const selectedEpisodeId = selectedEpisodeIdByMedia[selectedMedia.id];
  const selectedEpisode = selectedEpisodeId
    ? episodes.find((episode) => episode.id === selectedEpisodeId) || null
    : null;
  const hoverIntentEpisode = hoverIntentEpisodeId
    ? episodes.find((episode) => episode.id === hoverIntentEpisodeId) || null
    : null;
  const heroEpisode = selectedMedia.type === "show"
    ? hoverIntentEpisode || selectedEpisode
    : null;
  const sideEpisode = heroEpisode || selectedEpisode;
  const heroTitle = heroEpisode?.title || selectedMedia.title;
  const heroDescription = heroEpisode?.description || selectedMedia.description;
  const isEpisodeHero = Boolean(heroEpisode);
  const heroTitleSizeClass = getHeroTitleSizeClass(heroTitle, isEpisodeHero);
  const heroDescriptionClamp = getHeroDescriptionClamp(heroTitle, heroDescription, isEpisodeHero);
  const heroContentKey = heroEpisode
    ? `${selectedMedia.id}-${selectedSeason || "movie"}-${heroEpisode.id}`
    : `${selectedMedia.id}-media`;
  const heroContextParts = heroEpisode
    ? [selectedMedia.title, `Season ${selectedSeason}`, heroEpisode.id]
    : [
      selectedMedia.type === "show" ? "Series" : "Movie",
      selectedMedia.meta || selectedMedia.creator || selectedMedia.type,
    ];
  const heroMetaParts = heroEpisode
    ? [
      selectedMedia.meta || selectedMedia.creator || selectedMedia.type,
      heroEpisode.runtime,
      `${formatProgress(heroEpisode.progress)} watched`,
    ]
    : [
      selectedMedia.meta || selectedMedia.creator || selectedMedia.type,
      selectedMedia.rating,
    ];
  const fullscreenexitIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16">
      <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z" />
    </svg>
  );
  const volumeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-10" viewBox="0 0 16 16">
      <path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12zm3.025 4a4.5 4.5 0 0 1-1.318 3.182L10 10.475A3.5 3.5 0 0 0 11.025 8 3.5 3.5 0 0 0 10 5.525l.707-.707A4.5 4.5 0 0 1 12.025 8" />
    </svg>
  );
  const mutedIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16">
      <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0" />
    </svg>
  );
  const nextepIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16">
      <path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0z" />
    </svg>
  );
  const prevepIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16">
      <path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0z" />
    </svg>
  );
  const restartIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-10" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z" />
      <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466" />
    </svg>
  );
  const filteredMediaList = useMemo(() => {
    const query = mediaSearch.trim().toLowerCase();
    if (!query) return mediaList;

    return mediaList.filter((media) => (
      [
        media.title,
        media.creator,
        media.meta,
        media.type === "show" ? "tv show series" : "movie film",
      ].some((value) => String(value || "").toLowerCase().includes(query))
    ));
  }, [mediaSearch]);

  const fetchSignedUrl = useCallback((s3Key) =>
    fetchSignedAssetUrl({ key: s3Key }), []);
  const fetchSignedEpisodeUrl = useCallback((targetShowId, season, episode) =>
    fetchSignedEpisodePlaybackUrl({
      showId: targetShowId,
      season,
      episode,
    }), []);
  const pushDesktopLastWatched = useCallback(({ showId, season = null, episode = null }) => {
    upsertHistoryEntry("lastWatched", {
      showId,
      watchedAt: Date.now(),
      lastSeason: season,
      lastEpisode: episode,
    });
    syncWatchHistory({ showId, season, episode });
  }, []);
  const getVideoForEpisode = useCallback((seasonNumber, episodeNumber) => {
    if (!selectedShow) return null;
    if (selectedMedia.type === "movie") {
      return Array.isArray(selectedShow.videos) ? selectedShow.videos[0] : null;
    }

    return selectedShow.videos?.[`season${seasonNumber}`]?.[episodeNumber - 1] || null;
  }, [selectedMedia.type, selectedShow]);
  const resolvePlaybackUrl = useCallback(async ({ season = null, episode = null, video }) => {
    let videoPath = typeof video === "string" ? video : video?.path;
    if (!videoPath) return "";

    if (!isAwsHostedMedia(selectedMedia.id, videoPath)) return videoPath;

    if (selectedMedia.type === "movie") {
      const s3Key = extractS3KeyFromPath(videoPath) || `${selectedMedia.cleanId}/${selectedMedia.cleanId}.mp4`;
      if (!s3Key) return "";
      return fetchSignedUrl(s3Key);
    }

    return fetchSignedEpisodeUrl(selectedMedia.id, season, episode);
  }, [fetchSignedEpisodeUrl, fetchSignedUrl, isAwsHostedMedia, selectedMedia.cleanId, selectedMedia.id, selectedMedia.type]);
  const buildPreviewPlayerState = useCallback((episode) => {
    const previewRect = sidePreviewRef.current?.getBoundingClientRect();
    const target = getViewportTarget();
    const origin = previewRect
      ? {
        top: previewRect.top,
        left: previewRect.left,
        width: previewRect.width,
        height: previewRect.height,
      }
      : {
        top: 0,
        left: 0,
        width: target.width,
        height: target.height,
      };

    return {
      origin,
      target,
      displayTitle: selectedMedia.title,
      displayEpisodeNumber: episode?.id || "",
      displayEpisodeTitle: episode?.title || "",
      subtitle: selectedMedia.meta || selectedMedia.creator || "CWorld",
      thumb: episode?.thumb || selectedMedia.cover,
      progress: episode?.progress || 0,
      isEpisode: selectedMedia.type === "show" && Boolean(episode),
    };
  }, [selectedMedia]);
  const startProductionPlayback = useCallback(async (episode, options = {}) => {
    const activeEpisode = episode || episodes[0];
    if (!activeEpisode || !selectedShow) return;

    const isMovie = selectedMedia.type === "movie";
    const season = isMovie ? null : (options.season ?? selectedSeason);
    const episodeNumber = isMovie ? null : activeEpisode.number;
    const video = getVideoForEpisode(season, episodeNumber);
    const storageKey = toProgressStorageKey(selectedMedia.id, season, episodeNumber);
    const resumeProgress = readProgress(storageKey);
    const resumeTime = Number(resumeProgress?.t || 0);

    previewFullscreenRequestedRef.current = false;
    previewPlayerClosingRef.current = false;
    setRealPlayerVisible(false);
    setSelectedVideo(null);
    setPreviewPlayer(buildPreviewPlayerState(activeEpisode));
    setPreviewIsPlaying(true);

    const videoPath = await resolvePlaybackUrl({ season, episode: episodeNumber, video });
    if (!videoPath) {
      setPreviewPlayer((current) => (
        current ? { ...current, playbackError: "Media could not be loaded." } : current
      ));
      setPreviewIsPlaying(false);
      return;
    }

    setSelectedVideo({
      path: videoPath,
      showId: selectedMedia.id,
      type: isMovie ? "movie" : "show",
      season,
      episode: episodeNumber,
      skipIntro: options.skipIntro,
      resumeTime,
    });
    pushDesktopLastWatched({ showId: selectedMedia.id, season, episode: episodeNumber });
    setWatchProgressVersion((value) => value + 1);
  }, [
    buildPreviewPlayerState,
    episodes,
    getVideoForEpisode,
    pushDesktopLastWatched,
    readProgress,
    resolvePlaybackUrl,
    selectedMedia.id,
    selectedMedia.type,
    selectedSeason,
    selectedShow,
    toProgressStorageKey,
  ]);

  useEffect(() => {
    if (!routedShowId) return;
    setSelectedMediaId(routedShowId);
  }, [routedShowId]);

  useEffect(() => {
    if (!selectedMedia?.id) return;
    setSelectedSeasonByMedia((current) => {
      if (current[selectedMedia.id] != null) return current;
      return {
        ...current,
        [selectedMedia.id]: getInitialSeason(selectedMedia),
      };
    });
  }, [selectedMedia]);

  useEffect(() => {
    const onUpdate = () => setWatchProgressVersion((value) => value + 1);
    window.addEventListener("watchprogress:update", onUpdate);
    return () => window.removeEventListener("watchprogress:update", onUpdate);
  }, []);

  useEffect(() => {
    playingRef.current = selectedVideo;
  }, [selectedVideo]);

  const getValidatedSequentialTarget = useCallback((requestedSeason, requestedEpisode) => {
    const currentSeason = Number(playingRef.current?.season);
    const currentEpisode = Number(playingRef.current?.episode);
    const nextSeason = Number(requestedSeason);
    const nextEpisode = Number(requestedEpisode);

    if (
      !Number.isFinite(currentSeason)
      || !Number.isFinite(currentEpisode)
      || !Number.isFinite(nextSeason)
      || !Number.isFinite(nextEpisode)
    ) {
      return { season: requestedSeason, episode: requestedEpisode, corrected: false };
    }

    if (currentSeason !== nextSeason || currentEpisode !== nextEpisode) {
      return { season: requestedSeason, episode: requestedEpisode, corrected: false };
    }

    const availableSeasons = Object.keys(selectedShow?.videos || {})
      .map((key) => {
        const match = key.match(/^season(\d+)$/);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    for (const seasonNumber of availableSeasons) {
      const seasonEpisodes = selectedShow?.videos?.[`season${seasonNumber}`] || [];
      if (seasonNumber < currentSeason) continue;

      if (seasonNumber === currentSeason) {
        const candidateEpisode = currentEpisode + 1;
        if (seasonEpisodes[candidateEpisode - 1]) {
          return { season: seasonNumber, episode: candidateEpisode, corrected: true };
        }
        continue;
      }

      if (seasonEpisodes[0]) {
        return { season: seasonNumber, episode: 1, corrected: true };
      }
    }

    return { season: requestedSeason, episode: requestedEpisode, corrected: false };
  }, [selectedShow]);

  const handleSkipToNext = useCallback(async (targetSeason, targetEpisode, signedUrl = null, opts = {}) => {
    const isJJKOutro = opts.source === "outro" && selectedMedia.id === "jjk";
    const validatedTarget = getValidatedSequentialTarget(targetSeason, targetEpisode);
    const effectiveSeason = validatedTarget.season;
    const effectiveEpisode = validatedTarget.episode;
    const video = getVideoForEpisode(effectiveSeason, effectiveEpisode);
    let videoPath = signedUrl || video?.path;

    if (!videoPath) return;

    if (validatedTarget.corrected && isAwsHostedMedia(selectedMedia.id, videoPath)) {
      const correctedSignedUrl = await fetchSignedEpisodeUrl(selectedMedia.id, effectiveSeason, effectiveEpisode);
      if (correctedSignedUrl) videoPath = correctedSignedUrl;
    }

    setSelectedSeasonByMedia((current) => ({
      ...current,
      [selectedMedia.id]: effectiveSeason,
    }));
    setSelectedVideo({
      path: videoPath,
      showId: selectedMedia.id,
      season: effectiveSeason,
      episode: effectiveEpisode,
      skipIntro: !isJJKOutro,
    });
    pushDesktopLastWatched({ showId: selectedMedia.id, season: effectiveSeason, episode: effectiveEpisode });
    setWatchProgressVersion((value) => value + 1);
  }, [
    fetchSignedEpisodeUrl,
    getValidatedSequentialTarget,
    getVideoForEpisode,
    isAwsHostedMedia,
    pushDesktopLastWatched,
    selectedMedia.id,
  ]);

  const resumeTarget = useMemo(() => {
    if (!isProductionRoute || !selectedMedia?.id || typeof localStorage === "undefined") return null;

    const progressPrefixes = [
      `watchProgress-${selectedMedia.id}`,
      `watchProgress-${selectedMedia.cleanId}`,
    ];
    const keys = Object.keys(localStorage).filter((key) =>
      progressPrefixes.some((prefix) => key.startsWith(prefix))
    );
    if (keys.length === 0) return null;

    const mostRecentKey = keys.sort((a, b) => {
      const aKey = a.replace(/^watchProgress-/, "");
      const bKey = b.replace(/^watchProgress-/, "");
      const aProg = readProgress(aKey);
      const bProg = readProgress(bKey);
      const byUpdated = (bProg.updatedAt || 0) - (aProg.updatedAt || 0);
      if (byUpdated !== 0) return byUpdated;
      return (bProg.t || 0) - (aProg.t || 0);
    })[0];
    const match = mostRecentKey.match(/watchProgress-(.+?)(-S(\d+)-E(\d+))?$/);
    if (!match) return null;

    const [, matchedShowId, , seasonNumStr, episodeNumStr] = match;
    if (!seasonNumStr || !episodeNumStr) {
      return {
        showId: matchedShowId,
        season: null,
        episode: null,
        episodeData: episodes[0],
      };
    }

    const season = parseInt(seasonNumStr, 10);
    const episodeNumber = parseInt(episodeNumStr, 10);
    if (!Number.isFinite(season) || !Number.isFinite(episodeNumber)) return null;

    const seasonEpisodes = getEpisodesForSeason(selectedMedia, season, progressResolver);
    const episodeData = seasonEpisodes[episodeNumber - 1];
    if (!episodeData) return null;

    return {
      showId: matchedShowId,
      season,
      episode: episodeNumber,
      episodeData,
    };
  }, [episodes, isProductionRoute, progressResolver, readProgress, selectedMedia, watchProgressVersion]);

  const handleContinuePlayback = useCallback(() => {
    if (!resumeTarget) return;

    if (resumeTarget.season != null) {
      setSelectedSeasonByMedia((current) => ({
        ...current,
        [selectedMedia.id]: resumeTarget.season,
      }));
    }

    startProductionPlayback(resumeTarget.episodeData, { season: resumeTarget.season });
  }, [resumeTarget, selectedMedia.id, startProductionPlayback]);

  useEffect(() => {
    if (!isProductionRoute || !selectedShow || !selectedMedia?.id) return;

    const params = new URLSearchParams(location.search);
    const seasonParam = params.get("season");
    const episodeParam = params.get("episode");
    const isMovieParam = params.get("movie") === "1";

    if (isMovieParam && selectedMedia.type === "movie") {
      const launchKey = `${selectedMedia.id}:movie`;
      if (queryLaunchKeyRef.current === launchKey) return;
      if (playingRef.current?.showId === selectedMedia.id && playingRef.current?.type === "movie") return;
      queryLaunchKeyRef.current = launchKey;
      startProductionPlayback(episodes[0]);
      return;
    }

    if (!seasonParam || !episodeParam || selectedMedia.type !== "show") return;

    const season = parseInt(seasonParam, 10);
    const episodeNumber = parseInt(episodeParam, 10);
    if (!Number.isFinite(season) || !Number.isFinite(episodeNumber)) return;
    if (
      playingRef.current?.showId === selectedMedia.id
      && Number(playingRef.current?.season) === season
      && Number(playingRef.current?.episode) === episodeNumber
    ) return;

    const launchKey = `${selectedMedia.id}:S${season}:E${episodeNumber}`;
    if (queryLaunchKeyRef.current === launchKey) return;
    queryLaunchKeyRef.current = launchKey;

    setSelectedSeasonByMedia((current) => ({
      ...current,
      [selectedMedia.id]: season,
    }));

    const titles = getEpisodesForSeason(selectedMedia, season, progressResolver);
    const targetEpisode = titles[episodeNumber - 1];
    if (targetEpisode) {
      startProductionPlayback(targetEpisode, { season, skipIntro: true });
    }
  }, [
    episodes,
    isProductionRoute,
    location.search,
    progressResolver,
    selectedMedia,
    selectedShow,
    startProductionPlayback,
  ]);

  const clearEpisodeHoverTimer = useCallback(() => {
    if (!hoverIntentTimeoutRef.current) return;
    window.clearTimeout(hoverIntentTimeoutRef.current);
    hoverIntentTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    clearEpisodeHoverTimer();
    setHoverIntentEpisodeId(null);
    return clearEpisodeHoverTimer;
  }, [clearEpisodeHoverTimer, selectedMedia.id, selectedSeason]);

  useEffect(() => {
    episodeRailRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [selectedMedia.id, selectedSeason]);

  useEffect(() => {
    if (!previewPlayer) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        previewPlayerClosingRef.current = true;
        previewFullscreenRequestedRef.current = false;
        setPreviewPlayer(null);
        setPreviewIsPlaying(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPlayer]);

  const showPreviewVolumeFlyout = useCallback(() => {
    window.clearTimeout(previewVolumeHoverCloseTimeoutRef.current);
    previewVolumeHoverCloseTimeoutRef.current = null;
    setPreviewVolumeHovered(true);
  }, []);

  const scheduleHidePreviewVolumeFlyout = useCallback(() => {
    window.clearTimeout(previewVolumeHoverCloseTimeoutRef.current);
    previewVolumeHoverCloseTimeoutRef.current = window.setTimeout(() => {
      setPreviewVolumeHovered(false);
      previewVolumeHoverCloseTimeoutRef.current = null;
    }, 160);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(previewVolumeHoverCloseTimeoutRef.current);
  }, []);

  const handleMediaSelect = (media) => {
    setSelectedMediaId(media.id);
    setSelectedSeasonByMedia((current) => ({
      ...current,
      [media.id]: current[media.id] || getInitialSeason(media),
    }));
    setSelectedEpisodeIdByMedia((current) => ({
      ...current,
      [media.id]: null,
    }));
    setHoverIntentEpisodeId(null);
    setIsMediaModalOpen(false);
    setMediaSearch("");
  };

  const handleSeasonSelect = (seasonNumber) => {
    setSelectedSeasonByMedia((current) => ({
      ...current,
      [selectedMedia.id]: seasonNumber,
    }));
    setSelectedEpisodeIdByMedia((current) => ({
      ...current,
      [selectedMedia.id]: null,
    }));
    setHoverIntentEpisodeId(null);
  };

  const handleEpisodeSelect = (episode) => {
    clearEpisodeHoverTimer();
    setHoverIntentEpisodeId(null);
    setSelectedEpisodeIdByMedia((current) => ({
      ...current,
      [selectedMedia.id]: episode.id,
    }));
  };

  const handleEpisodeHoverStart = (episode) => {
    if (selectedMedia.type !== "show") return;
    clearEpisodeHoverTimer();
    hoverIntentTimeoutRef.current = window.setTimeout(() => {
      setHoverIntentEpisodeId(episode.id);
      hoverIntentTimeoutRef.current = null;
    }, 1500);
  };

  const handleEpisodeHoverEnd = (episode) => {
    clearEpisodeHoverTimer();
    setHoverIntentEpisodeId((current) => (current === episode.id ? null : current));
  };

  const handlePreviewPlay = () => {
    const activeEpisode = sideEpisode || selectedEpisode || episodes[0];

    if (isProductionRoute) {
      startProductionPlayback(activeEpisode);
      return;
    }

    previewFullscreenRequestedRef.current = false;
    previewPlayerClosingRef.current = false;
    setRealPlayerVisible(false);
    setPreviewPlayer(buildPreviewPlayerState(activeEpisode));
    setPreviewIsPlaying(true);
  };

  const handlePreviewClose = () => {
    previewPlayerClosingRef.current = true;
    previewFullscreenRequestedRef.current = false;
    setPreviewPlayer(null);
    setRealPlayerVisible(false);
    setSelectedVideo(null);
    setPreviewIsPlaying(false);
    setPreviewVolumeHovered(false);
    setWatchProgressVersion((value) => value + 1);

    if (isProductionRoute && routeShowId) {
      navigate(`/video-library/${routeShowId}`, { replace: true });
    }

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handlePreviewGrowComplete = () => {
    if (
      !previewPlayer
      || previewPlayerClosingRef.current
      || previewFullscreenRequestedRef.current
      || document.fullscreenElement
    ) return;

    if (isProductionRoute) {
      setRealPlayerVisible(true);
    }

    const fullscreenTarget = previewPlayerFrameRef.current || document.documentElement;
    if (!fullscreenTarget.requestFullscreen) return;

    previewFullscreenRequestedRef.current = true;
    fullscreenTarget.requestFullscreen({ navigationUI: "hide" }).catch(() => {
      previewFullscreenRequestedRef.current = false;
    });
  };

  useEffect(() => {
    if (!previewPlayer) return undefined;

    const syncPreviewTarget = () => {
      setPreviewPlayer((current) => (
        current
          ? { ...current, target: getViewportTarget() }
          : current
      ));
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        previewPlayerClosingRef.current = true;
        previewFullscreenRequestedRef.current = false;
        setPreviewPlayer(null);
        setRealPlayerVisible(false);
        setSelectedVideo(null);
        setPreviewIsPlaying(false);
        setPreviewVolumeHovered(false);
        setWatchProgressVersion((value) => value + 1);
        return;
      }

      syncPreviewTarget();
    };

    window.addEventListener("resize", syncPreviewTarget);
    window.visualViewport?.addEventListener("resize", syncPreviewTarget);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("resize", syncPreviewTarget);
      window.visualViewport?.removeEventListener("resize", syncPreviewTarget);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [previewPlayer]);

  return (
    <main className="h-dvh overflow-hidden bg-[#08090c] text-white alexandria-font">
      <section className="relative h-dvh overflow-hidden">
        {isProductionRoute && <Menu />}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMedia.backdrop}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${selectedMedia.backdrop}')` }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,0.97)_0%,rgba(8,9,12,0.84)_42%,rgba(8,9,12,0.48)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#08090c] to-transparent" />

        <motion.button
          type="button"
          onClick={() => navigate(-1)}
          className={`absolute left-4 top-4 z-20 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white sm:left-6 lg:left-8 ${
            previewPlayer ? "pointer-events-none opacity-0" : ""
          }`}
          aria-label="Back"
          whileHover={{ scale: 1.08, x: -2 }}
          whileTap={{ scale: 0.94 }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
          <header className="flex h-11 shrink-0 items-center justify-end gap-3">
            {!isProductionRoute && (
              <motion.button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="flex h-11 max-w-[72vw] cursor-pointer items-center gap-3 rounded-md border border-white/12 bg-black/35 px-3 text-left text-white/80 shadow-lg shadow-black/20 backdrop-blur transition hover:border-white/24 hover:bg-white/10 hover:text-white sm:max-w-sm"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                aria-haspopup="dialog"
                aria-expanded={isMediaModalOpen}
              >
                <img src={selectedMedia.logo} alt="" className="h-5 max-w-24 shrink-0 object-contain" />
                <span className="min-w-0 truncate text-sm font-bold">{selectedMedia.title}</span>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white/65">
                  {selectedMedia.type === "show" ? "TV" : "Movie"}
                </span>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
          </header>

          <AnimatePresence>
            {isMediaModalOpen && (
              <motion.div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-md"
                role="dialog"
                aria-modal="true"
                aria-label="Choose title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMediaModalOpen(false)}
              >
                <motion.div
                  className="flex max-h-[86dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/12 bg-[#0d0f14]/95 shadow-2xl shadow-black/50"
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <div className="min-w-0">
                      <div className="pb-0.5 text-sm font-bold leading-5">Choose Title</div>
                      <div className="text-xs leading-5 text-white/50">{mediaList.length} titles in this preview</div>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => setIsMediaModalOpen(false)}
                      className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/70 transition hover:bg-white/14 hover:text-white"
                      aria-label="Close title picker"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </motion.button>
                  </div>

                  <div className="border-b border-white/10 px-4 py-3">
                    <label className="relative block">
                      <span className="sr-only">Search titles</span>
                      <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true">
                        <path d="m21 21-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <input
                        value={mediaSearch}
                        onChange={(event) => setMediaSearch(event.target.value)}
                        className="h-11 w-full rounded-md border border-white/10 bg-white/8 pl-10 pr-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-white/28 focus:bg-white/12"
                        placeholder="Search titles, creators, type..."
                        autoFocus
                      />
                    </label>
                  </div>

                  <div className="min-h-0 overflow-y-auto recent-scrollbar p-4">
                    {filteredMediaList.length === 0 ? (
                      <div className="rounded-md border border-white/10 bg-white/6 p-5 text-sm text-white/60">
                        No titles match that search.
                      </div>
                    ) : (
                      <motion.div
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                        variants={railVariants}
                        initial="initial"
                        animate="animate"
                      >
                        {filteredMediaList.map((media) => {
                          const isSelected = media.id === selectedMedia.id;
                          return (
                            <motion.button
                              key={media.id}
                              type="button"
                              onClick={() => handleMediaSelect(media)}
                              variants={cardVariants}
                              whileHover={{
                                y: -5,
                                scale: 1.015,
                                boxShadow: "0px 18px 34px rgba(0,0,0,0.35)",
                              }}
                              whileTap={{ scale: 0.97 }}
                              className={`group cursor-pointer overflow-hidden rounded-lg border text-left transition ${
                                isSelected
                                  ? "border-white/45 bg-white/14"
                                  : "border-white/10 bg-white/6 hover:border-white/24 hover:bg-white/10"
                              }`}
                            >
                              <div
                                className="relative h-28 bg-cover bg-center"
                                style={{ backgroundImage: `url('${media.cover || media.backdrop}')` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10 transition duration-300 group-hover:from-black/88" />
                                <div className="absolute inset-x-0 bottom-0 p-3">
                                  <img src={media.logo} alt="" className="mb-2 h-5 max-w-28 object-contain object-left" />
                                  <div className="truncate pb-0.5 text-sm font-bold leading-5 text-white">{media.title}</div>
                                </div>
                                <div className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[11px] font-bold text-white/75 backdrop-blur">
                                  {media.type === "show" ? "TV" : "Movie"}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3 px-3 py-2">
                                <div className="min-w-0">
                                  <div className="truncate text-xs leading-5 text-white/55">{media.meta || media.creator || media.rating}</div>
                                  <div className="mt-1 truncate text-[11px] leading-4 text-white/38">{media.creator || media.rating || "CWorld"}</div>
                                </div>
                                {isSelected && (
                                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-black">
                                    Current
                                  </span>
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid min-h-0 flex-1 grid-cols-1 content-end items-end gap-5 overflow-hidden py-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-8">
            <motion.section
              layout
              variants={heroVariants}
              initial="initial"
              animate="animate"
              transition={heroLayoutTransition}
              className="flex min-h-0 max-w-3xl flex-col justify-end overflow-hidden"
            >
              <motion.div
                layout="position"
                transition={heroLayoutTransition}
                className="mb-3 overflow-visible text-xs font-semibold uppercase text-white/65"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`context-${heroContentKey}`}
                    variants={textContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="flex max-w-full min-w-0 items-center gap-3 overflow-visible"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-visible rounded-md border border-white/10 bg-black/28 p-1.5 shadow-lg shadow-black/20 backdrop-blur">
                      <img
                        src={selectedMedia.logo}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-2 overflow-hidden">
                      {heroContextParts.filter(Boolean).map((part, index) => (
                        <span key={`${part}-${index}`} className={index === 0 ? "min-w-0 max-w-[50vw] truncate sm:max-w-none" : "shrink-0"}>
                          {index > 0 && <span className="mr-2 inline-block h-1 w-1 rounded-full bg-white/35 align-middle" />}
                          {part}
                        </span>
                      ))}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <motion.h1
                layout
                transition={heroLayoutTransition}
                className={`max-w-3xl overflow-hidden pb-1 font-bold leading-[1.08] ${heroTitleSizeClass}`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`title-${heroContentKey}`}
                    variants={textContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    className="block"
                  >
                    {heroTitle}
                  </motion.span>
                </AnimatePresence>
              </motion.h1>

              <motion.div
                layout="position"
                transition={heroLayoutTransition}
                className="mt-4 overflow-hidden text-sm text-white/70"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`meta-${heroContentKey}`}
                    variants={textContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="flex max-w-full flex-wrap items-center gap-3 overflow-hidden"
                  >
                    {heroMetaParts.filter(Boolean).map((part, index) => (
                      <span key={`${part}-${index}`} className={index === 0 ? "max-w-[58vw] truncate sm:max-w-none" : ""}>
                        {index > 0 && <span className="mr-3 inline-block h-1 w-1 rounded-full bg-white/35 align-middle" />}
                        {part}
                      </span>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <motion.p
                layout
                transition={heroLayoutTransition}
                className={`mt-4 overflow-hidden pb-0.5 text-sm leading-6 text-white/76 sm:text-base sm:leading-7 ${
                  isEpisodeHero ? "max-w-3xl" : "max-w-2xl"
                }`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: heroDescriptionClamp,
                  WebkitBoxOrient: "vertical",
                }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`description-${heroContentKey}`}
                    variants={textContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    className="block"
                  >
                    {heroDescription}
                  </motion.span>
                </AnimatePresence>
              </motion.p>

              <motion.div layout="position" transition={heroLayoutTransition} className="-mx-2 mt-3 flex shrink-0 flex-wrap gap-3 overflow-visible px-2 py-2">
                <motion.button
                  type="button"
                  onClick={handlePreviewPlay}
                  className="inline-flex h-12 origin-left transform-gpu cursor-pointer items-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-white/85 will-change-transform"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={crispHoverTransition}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 5.14v13.72c0 .78.86 1.25 1.52.83l10.7-6.86a.98.98 0 0 0 0-1.66L9.52 4.31A.98.98 0 0 0 8 5.14Z" />
                  </svg>
                  {getPrimaryActionLabel(sideEpisode)}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={isProductionRoute ? handleContinuePlayback : undefined}
                  disabled={isProductionRoute && !resumeTarget}
                  className={`inline-flex h-12 origin-left transform-gpu items-center gap-2 rounded-md border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/16 will-change-transform ${
                    isProductionRoute && !resumeTarget
                      ? "cursor-not-allowed opacity-45"
                      : "cursor-pointer"
                  }`}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={crispHoverTransition}
                >
                  {isProductionRoute ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M7 5.14v13.72c0 .78.86 1.25 1.52.83l10.7-6.86a.98.98 0 0 0 0-1.66L8.52 4.31A.98.98 0 0 0 7 5.14Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                  {isProductionRoute ? "Continue" : "Add to List"}
                </motion.button>
              </motion.div>
            </motion.section>

            <motion.aside
              layout
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={heroLayoutTransition}
              className="hidden overflow-hidden rounded-lg border border-white/12 bg-black/38 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl md:block"
            >
              <motion.div
                ref={sidePreviewRef}
                layout
                className="relative aspect-[16/10] overflow-hidden rounded-md"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={`${selectedMedia.id}-${sideEpisode?.id || "media"}-thumb`}
                    src={sideEpisode?.thumb || selectedMedia.cover}
                    alt={`${sideEpisode?.title || selectedMedia.title} preview`}
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.34, ease: "easeOut" }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="truncate pb-0.5 text-sm font-semibold leading-5">{sideEpisode?.id || selectedMedia.title}</div>
                  <div className="text-xs leading-5 text-white/65">
                    {sideEpisode ? `${sideEpisode.status} • ${sideEpisode.runtime}` : selectedMedia.meta || "Series overview"}
                  </div>
                </div>
                {sideEpisode?.progress > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                    <motion.div
                      className="h-full bg-emerald-300"
                      initial={{ width: 0 }}
                      animate={{ width: `${sideEpisode.progress}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                  </div>
                )}
              </motion.div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <motion.div whileHover={{ y: -3, backgroundColor: "rgba(255,255,255,0.1)" }} className="rounded-md border border-white/10 bg-white/6 px-2 py-3">
                  <div className="text-xs leading-5 text-white/55">Resume</div>
                  <div className="mt-1 text-sm font-bold leading-5">
                    {sideEpisode?.progress > 0 ? formatProgress(sideEpisode.progress) : "Start"}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-white/45">watch progress</div>
                </motion.div>
                <motion.div whileHover={{ y: -3, backgroundColor: "rgba(255,255,255,0.1)" }} className="rounded-md border border-white/10 bg-white/6 px-2 py-3">
                  <div className="text-xs leading-5 text-white/55">Runtime</div>
                  <div className="mt-1 text-sm font-bold leading-5">{sideEpisode?.runtime || titleToRuntime(selectedMedia)}</div>
                  <div className="mt-1 truncate text-[11px] text-white/45">media length</div>
                </motion.div>
                <motion.div whileHover={{ y: -3, backgroundColor: "rgba(255,255,255,0.1)" }} className="rounded-md border border-white/10 bg-white/6 px-2 py-3">
                  <div className="text-xs leading-5 text-white/55">Offline</div>
                  <div className="mt-1 text-sm font-bold leading-5">{sideEpisode?.progress > 0 ? "Ready" : "None"}</div>
                  <div className="mt-1 truncate text-[11px] text-white/45">cache status</div>
                </motion.div>
              </div>
            </motion.aside>
          </div>

          <section className="relative z-10 shrink-0 overflow-hidden pb-3">
            {selectedMedia.type === "show" && (
              <div className="mb-3 flex max-w-full gap-2 overflow-x-auto scrollbar-hidden rounded-lg border border-white/10 bg-black/20 p-2.5 backdrop-blur">
                {seasonNumbers.map((seasonNumber) => {
                  const isSelected = seasonNumber === selectedSeason;
                  return (
                    <motion.button
                      key={seasonNumber}
                      type="button"
                      onClick={() => handleSeasonSelect(seasonNumber)}
                      className={`h-10 shrink-0 transform-gpu cursor-pointer rounded-md border px-4 text-sm font-bold transition-colors will-change-transform ${
                        isSelected
                          ? "border-white/40 bg-white text-black"
                          : "border-white/10 bg-white/8 text-white/70 hover:bg-white/12"
                      }`}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={crispHoverTransition}
                      animate={{ opacity: isSelected ? 1 : 0.72 }}
                    >
                      Season {seasonNumber}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {episodes.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/6 p-5 text-sm text-white/65">
                No episode placeholders found for this season in the current episode-title data.
              </div>
            ) : (
              <div
                ref={episodeRailRef}
                className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto overflow-y-visible snap-x snap-mandatory scroll-smooth scroll-px-3 recent-scrollbar px-3 pb-2 pt-3"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedMedia.id}-${selectedSeason || "movie"}`}
                    className="flex w-max max-w-none gap-3 px-2 pr-10"
                    variants={railVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {episodes.map((episode) => {
                      const isSelected = episode.id === selectedEpisode?.id;
                      const isPreviewed = episode.id === hoverIntentEpisode?.id;
                      return (
                        <motion.button
                          key={episode.id}
                          type="button"
                          onClick={() => handleEpisodeSelect(episode)}
                          onMouseEnter={() => handleEpisodeHoverStart(episode)}
                          onMouseLeave={() => handleEpisodeHoverEnd(episode)}
                          onFocus={() => handleEpisodeHoverStart(episode)}
                          onBlur={() => handleEpisodeHoverEnd(episode)}
                          variants={cardVariants}
                          whileHover={{
                            y: -5,
                            scale: 1.025,
                            boxShadow: "0px 18px 36px rgba(0,0,0,0.38)",
                          }}
                          whileTap={{ scale: 0.97 }}
                          transition={softHoverTransition}
                          className={`group w-72 shrink-0 transform-gpu cursor-pointer snap-start overflow-hidden rounded-lg border text-left transition-colors will-change-transform md:w-80 ${
                            isSelected || isPreviewed
                              ? "border-white/45 bg-white/14"
                              : "border-white/10 bg-white/6 hover:border-white/28 hover:bg-white/10"
                          }`}
                        >
                          <div className="relative aspect-video overflow-hidden bg-white/5">
                            <img
                              src={episode.thumb}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 transition duration-300 group-hover:bg-black/10" />
                            <motion.div
                              className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-xs font-bold backdrop-blur"
                              animate={{
                                backgroundColor: isSelected || isPreviewed ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.65)",
                                color: isSelected || isPreviewed ? "#000000" : "#ffffff",
                              }}
                            >
                              {episode.id}
                            </motion.div>
                            {episode.progress > 0 && (
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                                <motion.div
                                  className="h-full bg-emerald-300"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${episode.progress}%` }}
                                  transition={{ duration: 0.45, ease: "easeOut" }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="min-w-0">
                                <div className="truncate pb-0.5 text-sm font-bold leading-5 transition group-hover:text-white">{episode.title}</div>
                                <div className="mt-1 text-xs leading-5 text-white/50">
                                  {selectedMedia.type === "movie" ? "Movie" : `Episode ${episode.number}`} • {episode.runtime}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </section>

          <AnimatePresence>
            {previewPlayer && (
              <motion.div
                className="fixed inset-0 z-[9990]"
                onClick={handlePreviewClose}
              >
                <motion.div
                  className="absolute inset-0 bg-black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.96 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.08, duration: 0.24, ease: "easeOut" }}
                />
                <motion.div
                  ref={previewPlayerFrameRef}
                  initial={{
                    top: previewPlayer.origin.top,
                    left: previewPlayer.origin.left,
                    width: previewPlayer.origin.width,
                    height: previewPlayer.origin.height,
                    borderRadius: 6,
                  }}
                  animate={{
                    top: previewPlayer.target.top,
                    left: previewPlayer.target.left,
                    width: previewPlayer.target.width,
                    height: previewPlayer.target.height,
                    borderRadius: 0,
                  }}
                  exit={{
                    top: previewPlayer.origin.top,
                    left: previewPlayer.origin.left,
                    width: previewPlayer.origin.width,
                    height: previewPlayer.origin.height,
                    borderRadius: 6,
                  }}
                  transition={playerGrowTransition}
                  onAnimationComplete={handlePreviewGrowComplete}
                  className="fixed z-10 cursor-pointer overflow-hidden bg-black outline-none focus:outline-none"
                  onClick={(event) => event.stopPropagation()}
                >
                  <img
                    src={previewPlayer.thumb}
                    alt=""
                    className="relative z-[5] h-full w-full rounded-2xl object-contain"
                  />
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-transparent to-black/20" />

                  {!(isProductionRoute && realPlayerVisible) && (
                    <motion.div
                      className="absolute left-8 top-8 z-[9999] flex cursor-pointer items-center justify-center text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ scale: 1.14 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="cursor-pointer focus-visible:outline-none"
                        aria-label="Restart video"
                        title="Restart video"
                      >
                        {restartIcon}
                      </button>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {!(isProductionRoute && realPlayerVisible) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.14, duration: 0.24, ease: "easeOut" }}
                        className="pointer-events-none absolute left-0 right-0 top-0 z-30 rounded-2xl bg-gradient-to-b from-black/75 to-transparent px-6 pb-12 pt-7 text-right uppercase 2xl:pt-8 elms-font"
                      >
                        <div className="ml-auto max-w-[min(82vw,56rem)] truncate text-[16px] font-semibold leading-tight tracking-wide text-white 2xl:text-[24px]">
                          {previewPlayer.displayTitle}
                        </div>
                        {previewPlayer.isEpisode && (
                          <>
                            <div className="ml-auto mt-1 max-w-[min(82vw,56rem)] truncate pb-0.5 text-[13px] font-medium leading-[1.35] tracking-wide text-white/75 2xl:text-[18px]">
                              {previewPlayer.displayEpisodeNumber}
                              {previewPlayer.displayEpisodeTitle ? ` • ${previewPlayer.displayEpisodeTitle}` : ""}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!(isProductionRoute && realPlayerVisible) && (
                    <motion.div
                      className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 rounded-2xl bg-gradient-to-t from-black/80 to-transparent px-4 pt-44"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: 0.16, duration: 0.3 }}
                    >
                    <div className="relative bottom-8">
                      <div className="pointer-events-auto relative z-40 mb-5">
                        <div className="h-1 overflow-hidden rounded-full bg-white/18">
                          <motion.div
                            className="h-full rounded-full bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(previewPlayer.progress, 8)}%` }}
                            transition={{ delay: 0.32, duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      <div className="pointer-events-auto relative z-30 grid grid-cols-[1fr_auto_1fr] items-center pt-1 text-white">
                        <div />
                        <div className="flex items-center justify-center gap-5">
                          {previewPlayer.isEpisode && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              whileHover={{ scale: 1.18, y: -1 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="cursor-pointer text-white/90 hover:text-white focus-visible:outline-none"
                              aria-label="Previous episode"
                            >
                              <span>{prevepIcon}</span>
                            </motion.button>
                          )}
                          <motion.button
                            type="button"
                            className="cursor-pointer focus-visible:outline-none"
                            whileHover={{ scale: 1.14, y: -1 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            aria-label="Skip back"
                          >
                            <img src={SkipBack} alt="Skip back" className="size-10" />
                          </motion.button>
                          <div className="relative flex items-center">
                            <PlayPauseButton
                              isPlaying={previewIsPlaying}
                              onToggle={() => setPreviewIsPlaying((current) => !current)}
                            />
                          </div>
                          <motion.button
                            type="button"
                            className="cursor-pointer focus-visible:outline-none"
                            whileHover={{ scale: 1.14, y: -1 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            aria-label="Skip forward"
                          >
                            <img src={SkipForward} alt="Skip forward" className="size-10" />
                          </motion.button>
                          {previewPlayer.isEpisode && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              whileHover={{ scale: 1.18, y: -1 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="cursor-pointer text-white/90 hover:text-white focus-visible:outline-none"
                              aria-label="Next episode"
                            >
                              <span>{nextepIcon}</span>
                            </motion.button>
                          )}
                        </div>
                        <div className="grid min-w-[144px] grid-cols-3 items-center justify-items-center gap-3 justify-self-end">
                          <div
                            className="relative flex h-10 w-10 items-center justify-center"
                            onMouseEnter={showPreviewVolumeFlyout}
                            onMouseLeave={scheduleHidePreviewVolumeFlyout}
                          >
                            <AnimatePresence mode="wait">
                              {previewVolumeHovered && (
                                <motion.div
                                  className="absolute bottom-full left-1/2 z-[120] -translate-x-1/2 cursor-pointer pb-3"
                                  onMouseEnter={showPreviewVolumeFlyout}
                                  onMouseLeave={scheduleHidePreviewVolumeFlyout}
                                  initial={{ opacity: 0, y: 10, scale: 0.92 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 8, scale: 0.94 }}
                                  transition={{ duration: 0.22, ease: "easeOut" }}
                                >
                                  <div className="flex justify-center rounded-lg border border-white/15 bg-black/55 px-2 py-2 backdrop-blur-md">
                                    <VolumeSlider
                                      volume={previewVolume}
                                      muted={previewMuted}
                                      setVolume={(value) => {
                                        setPreviewVolume(value);
                                        if (value > 0 && previewMuted) {
                                          setPreviewMuted(false);
                                        }
                                      }}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              whileHover={{ scale: 1.14, y: -1 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="relative z-30 flex h-10 w-10 cursor-pointer items-center justify-center text-white/90 hover:text-white focus-visible:outline-none"
                              onClick={() => setPreviewMuted((current) => !current)}
                              aria-label={previewMuted ? "Unmute" : "Mute"}
                            >
                              {previewMuted ? mutedIcon : volumeIcon}
                            </motion.button>
                          </div>
                          <motion.button
                            type="button"
                            className="flex cursor-pointer items-center justify-center text-2xl font-bold text-white/40 transition-colors hover:text-white/70 elms-font"
                            whileHover={{ scale: 1.14 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            aria-label="Subtitles"
                          >
                            CC
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={handlePreviewClose}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center text-white/90 hover:text-white focus-visible:outline-none"
                            whileHover={{ scale: 1.14, y: -1 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            aria-label="Exit fullscreen preview"
                          >
                            {fullscreenexitIcon}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  )}

                  {previewPlayer.playbackError && (
                    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/72 px-6 text-center text-lg font-semibold text-white">
                      {previewPlayer.playbackError}
                    </div>
                  )}

                  {isProductionRoute && realPlayerVisible && selectedVideo && (
                    <div className="absolute inset-0 z-[100] bg-black">
                      <Show
                        src={selectedVideo.path}
                        showId={selectedVideo.showId}
                        season={selectedVideo.season}
                        episode={selectedVideo.episode}
                        skipIntro={selectedVideo.skipIntro}
                        resumeTime={selectedVideo.resumeTime}
                        episodeTitles={allEpisodeTitles[selectedMedia.id] || allEpisodeTitles[cleanMediaId(selectedMedia.id)]}
                        episodeMetadata={allEpisodeMetadata[selectedMedia.id] || allEpisodeMetadata[cleanMediaId(selectedMedia.id)]}
                        onSkipToNext={handleSkipToNext}
                        getSignedUrl={fetchSignedUrl}
                        getSignedEpisodeUrl={fetchSignedEpisodeUrl}
                        hasSubtitles={selectedShow?.subtitles === "yes"}
                      />
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
};

export default BetterEpisodePreview;
