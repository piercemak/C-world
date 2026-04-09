import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Show from './Show.jsx'
import Chevron from './Chevron.jsx'
import Menu from './framercomponents/Menu.jsx'
import WatchProgressBar from "./WatchProgressBar.jsx";
import { allEpisodeTitles } from "./episodeTitles.js";
import { buildLibraryShows } from "../data/libraryShowsData.js";
import { syncWatchHistory } from "../lib/watchSync.js";
import {
  fetchSignedUrl as fetchSignedAssetUrl,
  fetchSignedEpisodeUrl as fetchSignedEpisodePlaybackUrl,
} from "../lib/mediaSigning.js";



const Library = () => {

    
    const { showId } = useParams();
    console.log(showId);
    const navigate = useNavigate();

    const [expanded, setExpanded] = useState(false);
    const cleanShowId = (id) => id.replace(/-/g, "");
    const location = useLocation();

    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

    const layersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-layers-fill" viewBox="0 0 16 16"><path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/><path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/></svg>
    const downChevron = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/></svg>
    const closeIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-10" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>

    {/* Variants */}
    const dropdownVariants = {
      hidden: { opacity: 0, scale: 0.95, x: -10 },
      visible: {
        opacity: 1,
        scale: 1,
        x: 0,
        transition: {
          type: "spring",
          stiffness: 150,
          damping: 20,
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
      exit: { opacity: 0, scale: 0.95, x: -10 },
    };
    
    const itemVariants = {
      hidden: { opacity: 0, x: -10 },
      visible: { opacity: 1, x: 0 },
    };

    {/* Skip Handler */}
    const handleSkipToNext = async (targetSeason, targetEpisode, signedUrl = null, opts = {}) => {
      const isJJKOutro = opts.source === "outro" && showId === "jjk";
      const episodes = show?.videos?.[`season${targetSeason}`] || [];
      const idx = Math.max(0, (targetEpisode ?? 1) - 1);
      const ep = episodes[idx];
      const videoPath = signedUrl || ep?.path;
      if (!videoPath) {
        console.warn("🛑 No path for target episode; not changing selection.", {
          targetSeason,
          targetEpisode,
          hasEpisodes: episodes.length,
        });
        return;
      }
      setSelectedVideo({
        path: videoPath,
        showId,
        season: targetSeason,
        episode: targetEpisode,
        skipIntro: !isJJKOutro,
      });
      pushDesktopLastWatched({ showId, season: targetSeason, episode: targetEpisode });
    };

    {/* Season Dropdown Handling */}
    const dropdownRef = useRef(null);
    useEffect(() => {
      function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setSeasonDropdownOpen(false);
        }
      }
    
      if (seasonDropdownOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
    
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [seasonDropdownOpen]);



    
const extractS3KeyFromPath = (path) => {
  const match = path.match(/https:\/\/[^/]+\.amazonaws\.com\/(.+)/);
  return match ? match[1] : "";
};

    {/* Show/Season Handling */}
    const awsHostedShows = import.meta.env.VITE_AWS_HOSTED_SHOWS?.split(",") || [];
    const generateSeasonVideos = (titlesBySeason, rawId, type = "show") => {
      const cleanId = cleanShowId(rawId);
      const isAwsHosted = awsHostedShows.includes(rawId);
      const videos = {};

      if (type === "movie") {
        const s3Key = `${cleanId}/${cleanId}.mp4`;
        return [
          {
            path: isAwsHosted
              ? `https://all-shows.s3.us-east-2.amazonaws.com/${s3Key}`
              : `/videos/${cleanId}/${cleanId}.mp4`,
            title: cleanId,
            season: null,
            episode: null
          }
        ];
      }

      Object.entries(titlesBySeason).forEach(([seasonNumStr, titles]) => {
        const seasonNum = parseInt(seasonNumStr, 10);
        const seasonKey = `season${seasonNum}`;
        
        videos[seasonKey] = titles.map((title, index) => {
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
      });
      return videos;
    };
  
    const videoDataByShow = Object.fromEntries(
      Object.entries(allEpisodeTitles).map(([showId, titlesBySeason]) => [
        showId,
        generateSeasonVideos(titlesBySeason, showId)
      ])
    );


    {/* Show Database */}
    const shows = buildLibraryShows({ videoDataByShow, generateSeasonVideos });
    const show = shows[showId];
      
      {/* AWS Signed Urls */}
      const API_BASE = import.meta.env.VITE_API_URL;
      const fetchSignedUrl = async (s3Key) =>
        fetchSignedAssetUrl({ apiBase: API_BASE, key: s3Key });
      const fetchSignedEpisodeUrl = async (targetShowId, season, episode) =>
        fetchSignedEpisodePlaybackUrl({
          apiBase: API_BASE,
          showId: targetShowId,
          season,
          episode,
        });


      {/* Search Functionality */}
      useEffect(() => {
        const params = new URLSearchParams(location.search);
        const seasonParam = params.get("season");
        const episodeParam = params.get("episode");
        const isMovie = params.get("movie") === "1";

        if (isMovie) {
          const currentlyPlaying = playingRef.current;
          if (currentlyPlaying?.showId === showId && currentlyPlaying?.type === "movie") {
            return;
          }
          const moviePathRaw =
            show?.videos?.path ||
            show?.videos?.movie?.path ||
            (Array.isArray(show?.videos) ? show.videos[0]?.path : null);
          if (!moviePathRaw) return;
          (async () => {
            let videoPath = moviePathRaw;

            if (awsHostedShows.includes(showId)) {
              const isCloudfrontUrl = videoPath.includes("cloudfront.net");
              const s3Key = isCloudfrontUrl
                ? videoPath.split("cloudfront.net/")[1]
                : extractS3KeyFromPath(videoPath);

              if (s3Key) {
                const signed = await fetchSignedUrl(s3Key);
                if (signed) videoPath = signed;
              }
            }
            setSelectedSeason(null);
            setSelectedVideo({ path: videoPath, showId, type: "movie", season: null, episode: null, });
            setExpanded(true);
            pushDesktopLastWatched({ showId, season: null, episode: null });

            playingRef.current = { showId, type: "movie" };
          })();
          return;
        }    

        if (!seasonParam || !episodeParam) return;
        const s = parseInt(seasonParam, 10);
        const e = parseInt(episodeParam, 10);
        if (!Number.isFinite(s) || !Number.isFinite(e)) return;
        const currentlyPlaying = playingRef.current;
        if (
          currentlyPlaying?.showId === showId &&
          currentlyPlaying?.season === s &&
          currentlyPlaying?.episode === e
        ) {
          return;
        }


        (async () => {
          const episodeList = show?.videos?.[`season${s}`];
          const ep = episodeList?.[e - 1];
          if (!ep?.path) return;

          let videoPath = ep.path;

          if (awsHostedShows.includes(showId)) {
            const signed = await fetchSignedEpisodeUrl(showId, s, e);
            if (signed) videoPath = signed;
          }

          setSelectedSeason(s);
          setSelectedVideo({
            path: videoPath,
            showId,
            season: s,
            episode: e,
            skipIntro: true,
          });
          setExpanded(true);
          pushDesktopLastWatched({ showId, season: s, episode: e });

        })();
      }, [location.search, showId, awsHostedShows, show?.videos]);



      {/* Color Storage */}
      useEffect(() => {
        const savedGradient = localStorage.getItem('userGradient');
        if (savedGradient) {
          document.documentElement.style.setProperty('--gradient-9', savedGradient);
        }
      }, []);
      


      {/* Placeholder load state */}
      const [loadedPlaceholders, setLoadedPlaceholders] = useState({});
      const handleImageLoad = (key) => {
        setLoadedPlaceholders(prev => ({ ...prev, [key]: true }));
      };


      {/* Progress Map States */}
      const [watchProgressMap, setWatchProgressMap] = useState({});


      {/* Continue Watching Button */}
      const handleResume = async () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`watchProgress-${showId}`)
        );
        if (keys.length === 0) {
          console.log("▶️ No saved progress for this show.");
          return;
        }

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
        if (!match) return;

        const [, matchedShowId, , seasonNumStr, episodeNumStr] = match;
        const isMovie = !seasonNumStr && !episodeNumStr;

        let videoPath = null;
        let season = null;
        let episode = null;

        if (isMovie) {
          videoPath = show?.videos?.[0]?.path || null;
        } else {
          season = parseInt(seasonNumStr);
          episode = parseInt(episodeNumStr);
          const episodeList = show?.videos?.[`season${season}`];
          if (!episodeList || !episodeList[episode - 1]) return;

          videoPath = episodeList[episode - 1].path;
        }

        if (!videoPath) {
          console.error("❌ No video path found for resume.");
          return;
        }

        if (awsHostedShows.includes(showId)) {
          const isCloudfrontUrl = videoPath.includes("cloudfront.net");
          const s3Key = isCloudfrontUrl
            ? videoPath.split("cloudfront.net/")[1]
            : extractS3KeyFromPath(videoPath);

          if (!s3Key) {
            console.error("❌ Could not extract s3Key from resume video path:", videoPath);
            return;
          }

          const signedUrl = await fetchSignedUrl(s3Key);
          if (!signedUrl) {
            console.error("❌ Signed URL fetch failed.");
            return;
          }

          videoPath = signedUrl;
        }

        setSelectedVideo({
          path: videoPath,
          showId: matchedShowId,
          season: season,
          episode: episode,
        });

        setExpanded(true);
        pushDesktopLastWatched({ showId: matchedShowId, season, episode });

        // ✅ Sync progress bar state for movies or shows
        let key;
        if (isMovie) {
          key = `${showId}`;
        } else {
          key = toProgressStorageKey(showId, season, episode);
        }

        const prog = readProgress(key);
        setWatchProgressMap(prev => ({ ...prev, [key]: prog }));
      };




      {/* Continue Wacthing Modal */}
      const [resumeHovered, setResumeHovered] = useState(false);
      const [resumeEpisode, setResumeEpisode] = useState(null);
      const handleMouseEnterResume = () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`watchProgress-${showId}`)
        );
        if (keys.length === 0) return;
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
        if (!match) return;
        const [, matchedShowId, , seasonNumStr, episodeNumStr] = match;
        const isMovie = !seasonNumStr && !episodeNumStr;

        if (isMovie) {
          const video = show?.videos?.[0];
          if (!video) return;
          setResumeEpisode({
            season: null,
            episode: null,
            title: show?.title || matchedShowId,
            path: video.path,
          });
          setResumeHovered(true);
          return;
        }
        const seasonNum = parseInt(seasonNumStr);
        const episodeNum = parseInt(episodeNumStr);
        const episodeList = show?.videos?.[`season${seasonNum}`];
        if (!episodeList || !episodeList[episodeNum - 1]) return;
        const video = episodeList[episodeNum - 1];
        setResumeEpisode({
          season: seasonNum,
          episode: episodeNum,
          title: video.title,
          path: video.path,
        });
        setResumeHovered(true);
      };

      const handleMouseLeaveResume = () => {
        setResumeHovered(false);
      };


    {/* Subtitles */}
    const metaShowId = selectedVideo?.showId || showId;
    const seasons = show?.season_digit
      ? Array.from({ length: show.season_digit }, (_, i) => i + 1)
      : [];

  const playingRef = useRef(null);
  useEffect(() => {
    playingRef.current = selectedVideo;
  }, [selectedVideo]);

  {/* Last Watched Videoplayer Helper */}
  const pushDesktopLastWatched = ({ showId, season = null, episode = null }) => {
  const KEY = "lastWatched";
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}

  const entry = {
    showId,
    watchedAt: Date.now(),
    lastSeason: season,
    lastEpisode: episode,
  };
  arr = arr.filter((x) => x?.showId !== showId);
  arr.unshift(entry);

  localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50)));
  syncWatchHistory({ showId, season, episode });
  };
  

  {/* Watch Progress Helper */}
  const toProgressStorageKey = (id, season = null, episode = null) => {
    if (season == null || episode == null) return `${id}`;
    const seasonNum = Number(season);
    const episodeNum = Number(episode);
    if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return `${id}`;
    return `${id}-S${String(seasonNum).padStart(2, "0")}-E${String(episodeNum).padStart(2, "0")}`;
  };
  const readProgress = (storageKey) => {
    const primaryKey = `watchProgress-${storageKey}`;
    let raw = localStorage.getItem(primaryKey);
    if (!raw) {
      const m = storageKey.match(/^(.*)-S(\d+)-E(\d+)$/);
      if (m) {
        const legacyStorageKey = `${m[1]}-S${Number(m[2])}-E${Number(m[3])}`;
        const legacyKey = `watchProgress-${legacyStorageKey}`;
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          localStorage.setItem(primaryKey, legacyRaw);
          localStorage.removeItem(legacyKey);
          raw = legacyRaw;
        }
      }
    }
    if (!raw) return { t: 0, d: 0, updatedAt: 0 };

    try {
      const obj = JSON.parse(raw);
      const t = Number(obj?.t ?? obj?.currentTime ?? 0);
      const d = Number(obj?.d ?? obj?.duration ?? 0);
      const updatedAt = Number(obj?.updatedAt ?? 0);

      return {
        t: Number.isFinite(t) ? t : 0,
        d: Number.isFinite(d) ? d : 0,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
      };
    } catch {
      const n = Number(raw);
      return { t: Number.isFinite(n) ? n : 0, d: 0, updatedAt: 0 };
    }
  };
  useEffect(() => {
    const onUpdate = (e) => {
      const { storageKey, t, d } = e.detail || {};
      if (!storageKey) return;

      setWatchProgressMap(prev => ({
        ...prev,
        [storageKey]: {
          t: Number.isFinite(Number(t)) ? Number(t) : (prev[storageKey]?.t ?? 0),
          d: Number.isFinite(Number(d)) ? Number(d) : (prev[storageKey]?.d ?? 0),
          updatedAt: Date.now(),
        },
      }));
    };

    window.addEventListener("watchprogress:update", onUpdate);
    return () => window.removeEventListener("watchprogress:update", onUpdate);
  }, []);








  return (
    <div  style={{ background: "var(--gradient-9)" }} className='w-full h-dvh flex p-6 gap-4 justify-center items-center'>
        <div className='w-full max-w-[1400px] h-[92vh] px-14 pt-4 bg-black/20 backdrop-blur-md rounded-[20px] border border-white/10 shadow-[inset_0_0_0.5px_0.5px_rgba(255,255,255,0.2)] relative overflow-hidden'>
            {/* Overlapping Stack (relative container) */}
            <div className="relative w-full h-[65dvh] mb-12 overflow-hidden rounded-[20px]">
  
              {/* Background Image */}
              <div
                style={{
                  backgroundImage: `url(${show?.background})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
                className="absolute inset-0 z-0"
              />

              {/* Optional semi-transparent overlay (to make text easier to read) */}
              <div className="absolute inset-0 bg-black/20 z-10" />

              {/* Info Content */}
              <div className="relative z-20 flex flex-col justify-end h-full p-6">
                <span className="text-white font-semibold text-[28px] tracking-wider">
                  {show?.title}
                </span>
                <span className="text-[#d1d1d1] font-medium text-xs tracking-wide mb-4">
                  {show?.release_year} • {show?.genre} • {show?.type === "show" ? show?.season_total_number : show?.duration}
                </span>
                <span className="text-[#d1d1d1] font-medium text-sm tracking-wide">
                  {show?.description}
                </span>
              </div>

            </div>

              
            {createPortal(
            <AnimatePresence>
                {expanded && (
                <motion.div
                    key="expanding"
                    initial={{
                    scale: 0,
                    opacity: 0,
                    x: "-50%",
                    y: "-50%",
                    }}
                    animate={{
                    scale: 1,
                    opacity: 1,
                    x: "-50%",
                    y: "-50%",
                    }}
                    exit={{
                    scale: 0,
                    opacity: 0,
                    x: "-50%",
                    y: "-50%",
                    }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="fixed top-1/2 left-1/2 w-full h-full z-[100] rounded-none flex justify-start"
                    style={{ transform: "translate(-50%, -50%)" }}
                >
                <motion.button
                  onClick={() => {
                    setExpanded(false);
                    setSelectedVideo(null); 
                    navigate(`/video-library/${showId}`, { replace: true });
                    let key;
                    if (selectedVideo?.season !== null && selectedVideo?.episode !== null) {
                      key = toProgressStorageKey(selectedVideo.showId, selectedVideo.season, selectedVideo.episode);
                    } else {
                      key = `${selectedVideo.showId}`;
                    }
                    const prog = readProgress(key);
                    setWatchProgressMap(prev => ({ ...prev, [key]: prog }));               
                  }}
                  whileHover={{ scale: 1.14, }}
                  whileTap={{ scale: 0.92 }}
                  className="absolute text-white flex items-center justify-center m-12 cursor-pointer z-[9999]"
                >
                  {closeIcon}
                </motion.button>

                <div className="flex-1 w-full p-8">
                  {selectedVideo && (
                    <Show
                    src={selectedVideo.path}
                    delayPlay={2000}
                    showId={selectedVideo.showId}
                    season={selectedVideo.season}
                    episode={selectedVideo.episode}
                    skipIntro={selectedVideo.skipIntro}
                    episodeTitles={allEpisodeTitles[showId] || allEpisodeTitles[cleanShowId(showId)]}
                    onSkipToNext={handleSkipToNext}
                    getSignedUrl={fetchSignedUrl}
                    getSignedEpisodeUrl={fetchSignedEpisodeUrl}
                    hasSubtitles={shows[metaShowId]?.subtitles === "yes"}
                    
                    />
                  )}
                </div>
                    
                </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}  
        </div>

      
      <div className="fixed w-full h-full">      
          <Menu />
          {/* Season Content (below stack) */}
          <div ref={dropdownRef} className="absolute bottom-34 2xl:bottom-50 left-10 2xl:left-64 w-fit flex flex-row mb-4 text-white z-[10]">
            <button 
              className="flex items-center gap-2 text-xl font-semibold cursor-pointer"
              onClick={() => {
                if (show?.season_digit > 1) {
                  setSeasonDropdownOpen(!seasonDropdownOpen);
                }
              }}
            >
              {layersIcon}
              <span>{show?.type === "movie" ? "Movie" : `Season ${selectedSeason}`}</span>
              {show?.type !== "movie" && show?.season_digit > 1 && <Chevron isOpen={seasonDropdownOpen} />}         
            </button>

            <div className="relative flex items-center justify-end gap-4 ml-2">
              <button
                onClick={handleResume}
                onMouseEnter={handleMouseEnterResume}
                onMouseLeave={handleMouseLeaveResume}
                className="text-white font-medium bg-white/10 hover:bg-white/20 px-3 py-1 text-sm rounded-md transition cursor-pointer"
              >
                Continue watching 
              </button>

              {/* Modal */}
              <AnimatePresence>
                {resumeHovered && resumeEpisode && (
                  (() => {
                    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
                    const cleanedId = cleanShowId(showId);
                    const sNum = String(resumeEpisode.season);
                    const eNum = String(resumeEpisode.episode);

                    const placeholderPath = show?.type === "show"
                      ? `${cloudFrontDomain}/${cleanedId}/placeholders/season${resumeEpisode.season}/S${sNum}E${eNum}_${cleanedId}_placeholder.png`
                      : `/images/${cleanedId}/placeholders/${cleanedId}_placeholder.png`;

                    console.log("🖼️ Resume placeholder path:", placeholderPath);

                    return (
                      <motion.div
                        key="resume-tooltip"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-[120%] left-0 w-64 bg-black text-white p-2 rounded-md shadow-lg z-50 pointer-events-none"
                      >
                        <div className="relative w-full h-32 rounded mb-2 overflow-hidden bg-gray-800/40">
                          <img
                            src={placeholderPath}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <WatchProgressBar
                            storageKey={
                              resumeEpisode.season !== null && resumeEpisode.episode !== null
                                ? toProgressStorageKey(showId, resumeEpisode.season, resumeEpisode.episode)
                                : `${showId}`
                            }
                            progressOverride={
                              resumeEpisode.season !== null && resumeEpisode.episode !== null
                                ? watchProgressMap[toProgressStorageKey(showId, resumeEpisode.season, resumeEpisode.episode)]?.t
                                : watchProgressMap[`${showId}`]?.t
                            }
                          />
                        </div>
                        <div className="text-sm font-semibold tracking-wide">
                          {resumeEpisode.season !== null && resumeEpisode.episode !== null
                            ? `S${resumeEpisode.season}E${resumeEpisode.episode} — ${resumeEpisode.title.replace(/_/g, " ")}`
                            : resumeEpisode.title.replace(/_/g, " ")}
                        </div>
                      </motion.div>
                    );
                  })()
                )}
              </AnimatePresence>
            </div>               

            {/* Season Dropdown */}
            <AnimatePresence>
              {seasonDropdownOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={dropdownVariants}
                  className="
                    absolute bottom-0 left-full
                    ml-4 mt-1
                    bg-black/80 text-[#5c5c5c]
                    rounded-md shadow-md backdrop-blur
                    px-4 py-3
                  "
                >
                  {/* Inner grid that actually lays out the buttons */}
                  <div
                    className={`
                      grid ${show?.season_digit > 8 ? "grid-cols-2" : "grid-cols-1"}
                      gap-x-6 gap-y-4
                      w-max
                    `}
                  >
                    {Array.from({ length: show?.season_digit }, (_, i) => i + 1).map((season) => (
                      <motion.button
                        key={season}
                        whileHover={{ color: "rgba(255, 255, 255, 0.6)" }}
                        variants={itemVariants}
                        onClick={() => {
                          setSelectedSeason(season);
                          setSeasonDropdownOpen(false);
                        }}
                        className={`
                          text-left text-sm px-2 py-1 cursor-pointer whitespace-nowrap
                          ${season === selectedSeason ? "text-white font-bold" : ""}
                        `}
                      >
                        Season {season}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Cards for each video */}
          <AnimatePresence mode="wait">
          <motion.div 
            key={selectedSeason}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}      
            className="flex flex-row h-full pb-6 2xl:pb-20 px-4 items-end gap-6 snap-x overflow-x-auto scrollbar-hidden z-[8]"
          >
            
          {/* Movies */}  
          {show?.type === "movie" && (
            <motion.div 
              whileHover={{
                scale: 1.05,
                boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                transition: { duration: 0.3, ease: "easeInOut" }
              }}
              onClick={async () => {
              let videoPath = show?.videos[0];
              let rawPath = typeof videoPath === "string" ? videoPath : videoPath?.path;

              if (awsHostedShows.includes(showId)) {
                const isCloudfrontUrl = rawPath?.includes("cloudfront.net");
                const s3Key = isCloudfrontUrl
                  ? rawPath.split("cloudfront.net/")[1]
                  : extractS3KeyFromPath(rawPath);

                if (!s3Key) {
                  console.error("❌ Could not extract s3Key from movie video path:", rawPath);
                  return;
                }

                const signedUrl = await fetchSignedUrl(s3Key);
                videoPath = signedUrl;
              } else {
                videoPath = rawPath;
              }
                setSelectedVideo({
                  path: videoPath,
                  showId,
                  season: null,
                  episode: null,
                });
                setExpanded(true);
                const key = `${showId}`;
                const prog = readProgress(key);
                setWatchProgressMap(prev => ({ ...prev, [key]: prog }));
                pushDesktopLastWatched({ showId, season: null, episode: null });
             
              }}
              style={{ 
                backgroundImage: `url(/images/${cleanShowId(showId)}/placeholders/${cleanShowId(showId)}_placeholder.png)`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              className="relative override-left-8 lg:left-60 w-56 h-28 group rounded-2xl cursor-pointer flex-shrink-0 snap-center"
            >
              <div 
                className="absolute bottom-0 w-full text-white font-bold tracking-wide text-sm p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
                  borderBottomLeftRadius: '1rem',
                  borderBottomRightRadius: '1rem',
                }}
              >
                {show?.title}
              </div>

              <WatchProgressBar
                storageKey={`${showId}`}
                progressOverride={watchProgressMap[`${showId}`]?.t}
              />     

            </motion.div>
          )}

          {(show?.videos?.[`season${selectedSeason}`] || []).map((videoUrl, index) => {

            const rawSeason = videoUrl.season; 
            const cleanedSeason = `S${parseInt(rawSeason.slice(1), 10)}`; 
            const seasonNumber = parseInt(rawSeason.slice(1), 10);       

            const episodeNumber = index + 1;
            const cleanShowId = showId.replace(/-/g, ''); 

            const filename = videoUrl.path.split("/").pop();  
            const baseName = filename.replace(".mp4", "");
            const parts = baseName.split("_");
        
            const rawTitleParts = parts.slice(2); 
            const episodeTitle = rawTitleParts
              .join(" ")
              .replace(/\b\w/g, c => c.toUpperCase()); 

              const episodeName = `${episodeNumber}: ${episodeTitle}`;
              const cleanedEpisodeName = `${episodeNumber}. ${episodeTitle}`;
              
              console.log("🎬 Clean Show ID:", cleanShowId, "| Raw Show ID:", showId);

            const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";

            const placeholderPath = show?.type === "show"
            ? `${cloudFrontDomain}/${cleanShowId}/placeholders/season${seasonNumber}/${cleanedSeason}E${episodeNumber}_${cleanShowId}_placeholder.png`
            : `/images/${cleanShowId}/placeholders/${cleanShowId}_placeholder.png`;
            
            const placeholderKey = `${showId}-${seasonNumber}-${episodeNumber}`;

                return (
                  //Shows
                  <motion.div 
                    key={index}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                      transition: { duration: 0.3, ease: "easeInOut" }
                    }}
                    whileTap={{
                        scale: 0.95,
                        transition: {
                        type: 'spring',
                        stiffness: 200,
                        damping: 10,
                        },
                    }}                    
                    onClick={async () => {
                      let videoPath = videoUrl.path;

                      if (awsHostedShows.includes(showId)) {
                        videoPath = await fetchSignedEpisodeUrl(showId, seasonNumber, episodeNumber);
                        console.log("✅ Signed CloudFront URL:", videoPath);
                      }

                      setSelectedVideo({
                        path: videoPath,
                        showId,
                        season: seasonNumber,
                        episode: episodeNumber,
                      });
                      setExpanded(true);
                      pushDesktopLastWatched({ showId, season: seasonNumber, episode: episodeNumber });
                    }}
                    
                    className={`relative w-56 h-28 rounded-2xl cursor-pointer group flex-shrink-0 snap-center 
                      ${!loadedPlaceholders[placeholderKey] ? "animate-pulse bg-gray-800/60" : ""} overflow-hidden`}
                    >
                    <img 
                      src={placeholderPath} 
                      alt="" 
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                        loadedPlaceholders[placeholderKey] ? "opacity-100" : "opacity-0"
                      }`}
                      onLoad={() => handleImageLoad(placeholderKey)} 
                    />
                    {/* TEXT OVERLAY */}
                    <div 
                      className="absolute bottom-0 w-full text-white font-bold tracking-wide text-sm p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
                        borderBottomLeftRadius: '1rem',
                        borderBottomRightRadius: '1rem',
                      }}
                    >
                      {cleanedEpisodeName}
                    </div>

                    <WatchProgressBar
                      storageKey={toProgressStorageKey(showId, seasonNumber, episodeNumber)}
                      progressOverride={watchProgressMap[toProgressStorageKey(showId, seasonNumber, episodeNumber)]?.t}
                    />
                  </motion.div>   
                );
          })}
            </motion.div> 
            </AnimatePresence>
        </div> 

    </div>
  )
}

export default Library
