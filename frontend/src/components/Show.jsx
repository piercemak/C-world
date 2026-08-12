import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PlayPauseButton from "./framercomponents/PlayPauseButton";
import ProgressBar from "./ProgressBar.jsx";
import VolumeSlider from "./VolumeSlider.jsx";
import SkipForward from '../assets/icons/SkipForward.svg'
import SkipBack from '../assets/icons/SkipBack.svg'
import { queueWatchProgressSync, flushWatchProgressSync } from "../lib/watchSync.js";
import { getSubtitleTrackSrc } from "../data/subtitleTracks.js";


const Show = ({
  src,
  delayPlay = 0,
  onSkipToNext,
  showId,
  season,
  episode,
  skipIntro = false,
  hasSubtitles = false,
  episodeTitles,
  getSignedUrl = {},
  getSignedEpisodeUrl = null,
}) => {


  const containerRef = useRef(null)
  const videoRef = useRef(null);
  const [playbackSrc, setPlaybackSrc] = useState(src);
  const [mediaNotFound, setMediaNotFound] = useState(false);
  const intendedResumeTimeRef = useRef(null);
  const stallTimerRef = useRef(null);
  const recoveryInFlightRef = useRef(false);
  const recoveryAttemptCountRef = useRef(0);
  const recoveryWindowStartRef = useRef(0);
  const recoveryWindowMs = 45_000;
  const recoveryMaxAttempts = 2;
  useEffect(() => {
    setPlaybackSrc(src);
    setMediaNotFound(!src);
    intendedResumeTimeRef.current = null;
    recoveryInFlightRef.current = false;
    recoveryAttemptCountRef.current = 0;
    recoveryWindowStartRef.current = 0;
  }, [src]);
  const spinner = <svg xmlns="http://www.w3.org/2000/svg" className="size-14" viewBox="0 0 200 200"><radialGradient id="a12" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="#FCFAFF"></stop><stop offset=".3" stop-color="#FCFAFF" stop-opacity=".9"></stop><stop offset=".6" stop-color="#FCFAFF" stop-opacity=".6"></stop><stop offset=".8" stop-color="#FCFAFF" stop-opacity=".3"></stop><stop offset="1" stop-color="#FCFAFF" stop-opacity="0"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a12)" stroke-width="15" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="#FCFAFF" stroke-width="15" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
  
  const fullscreenIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/></svg>
  const fullscreenexitIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"/></svg>
  const volumeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-10" viewBox="0 0 16 16"><path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12zm3.025 4a4.5 4.5 0 0 1-1.318 3.182L10 10.475A3.5 3.5 0 0 0 11.025 8 3.5 3.5 0 0 0 10 5.525l.707-.707A4.5 4.5 0 0 1 12.025 8"/></svg>
  const mutedIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0"/></svg>
  const nextepIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0z"/></svg>
  const prevepIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0z"/></svg>
  const closeIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
  const restartIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-10" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/></svg>

  {/* Outro Ref */}
  const outroSkipRef = useRef(false);
  useEffect(() => {
    outroSkipRef.current = false;
  }, [src]);

  {/* Volume Control */}
  const [volumeHovered, setvolumeHovered] = useState(false);
  const isMovie = season === null && episode === null;
  const [toggleMute, setToggleMute] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("videoVolume");
    return saved !== null ? parseFloat(saved) : 1; 
  });
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    localStorage.setItem("videoVolume", volume.toString());
  }, [volume]);
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
  
    const handleVolumeChange = () => {
      const newVolume = vid.volume;
      setVolume(newVolume);
      localStorage.setItem("videoVolume", newVolume.toString());
    };
  
    vid.addEventListener("volumechange", handleVolumeChange);
    return () => vid.removeEventListener("volumechange", handleVolumeChange);
  }, []);
  

  {/* Pause buttons */}
  const [isPlaying, setIsPlaying] = useState(false);
  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
  
    if (vid.paused || vid.ended) {
      vid.play();
    } else {
      vid.pause();
    }
  };
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setIsPlaying(false); 
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
  
    vid.addEventListener("play", handlePlay);
    vid.addEventListener("pause", handlePause);
    return () => {
      vid.removeEventListener("play", handlePlay);
      vid.removeEventListener("pause", handlePause);
    };
  }, [playbackSrc]); 


  {/* Fullscreen Toggle */}
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (isTauri()) {
      const appWindow = getCurrentWindow();
      const nextFullscreenState = !(await appWindow.isFullscreen());
      await appWindow.setFullscreen(nextFullscreenState);
      setIsFullscreen(nextFullscreenState);
      return;
    }

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  useEffect(() => {
    if (isTauri()) {
      const appWindow = getCurrentWindow();
      let unlistenResize = null;

      const syncFullscreenState = async () => {
        try {
          setIsFullscreen(await appWindow.isFullscreen());
        } catch {
          // Ignore window state read errors and preserve the last known UI state.
        }
      };

      syncFullscreenState();

      appWindow.onResized(() => {
        syncFullscreenState();
      }).then((unlisten) => {
        unlistenResize = unlisten;
      });

      return () => {
        if (unlistenResize) {
          unlistenResize();
        }
      };
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);


  {/* Skip intro/outro Handling */}
  const [currentTime, setCurrentTime] = useState(0);
  const [introVisible, setIntroVisible] = useState(false);
  const [outroVisible, setOutroVisible] = useState(false);
  const [autoSkipDone, setAutoSkipDone] = useState(false); 
  const lastProgressPersistAtRef = useRef(0);
  const lastPersistedTimeRef = useRef(-1);
  const outroProgressResetRef = useRef(false);

  
  const pathParts = src.split("/");
  const showKey = showId?.replace(/-/g, "").toLowerCase();
  const NO_AUTO_SKIP_INTRO_SHOWS = new Set(["jjk", "cyberpunk", "severance", "pluribus", "itsalwayssunny", "mobpsycho","theericandreshow", "jojos"]);
  const filename = pathParts[pathParts.length - 1];
  const match = filename.match(/S(\d+)E(\d+)/);

  let base;
  try {
    const u = new URL(src);
    base = u.pathname.split("/").pop() || "";
  } catch {

    base = src.split("/").pop() || "";
  }

  const m = base.match(/^S(\d{1,3})E(\d{1,3})/i);

  const parsedSeason = m ? parseInt(m[1], 10) : null;
  const parsedEpisode = m ? parseInt(m[2], 10) : null;

  const actualSeason = parsedSeason ?? (Number.isFinite(season) ? season : null);
  const actualEpisode = parsedEpisode ?? (Number.isFinite(episode) ? episode : null);

  const seasonLength = {
    stevenuniverse: {
      1: 49,
      2: 29,
      3: 24,
      4: 24,
      5: 28,
    },
    overthegardenwall: {
      1: 10,
    },
    adventuretime: {
      1: 26,
      2: 26,
      3: 26,
      4: 26,
      5: 52,
      6: 43,
      7: 25,
      8: 27,
      9: 14,
      10: 13,

    },
    neongenesis: {
      1:26,
    },
    mobpsycho: {
      1:12,
      2:13,
      3:12
    },
    fmab: {
      1:13,
      2:13,
      3:13,
      4:13,
      5:12,
    },
    jjk: {
      1:24,
      2:23,
      3:12,
    }, 
      cyberpunk: {
      1:10,
    },    
      lovedeathandrobots: {
      1:18,
      2:8,
      3:9,
      4:10,
    },  
      severance: {
      1:9,
      2:10,
    },     
    pluribus: {
      1:9,
    },
    itsalwayssunny: {
      1:7,
      2:10,
      3:15,
      4:13,
      5:12,
      6:13,
      7:13,
      8:10,
      9:10,
      10:10,
      11:10,
      12:10,
      13:10,
      14:10,
      15:8,
      16:8,
    },  
    thetwilightzone: {
      1:36,
      2:29,
      3:37,
      4:18,
      5:36,
    },
    truedetective: {
      1:8,
    },
    theericandreshow: {
      1:11,
      2:10,
      3:10,
      4:10,
      5:10,
    },
    mongolianchopsquad: {
      1:26,
    },
    widowsbay: {
      1: 10,
    },
    "atlanta": {
      1: 10,
      2: 11,
      3: 10,
      4: 10,
    },
    "jojos": {
      1: 26,
      2: 48,
      3: 39,
      4: 39,
      5: 38,
      6: 12,
    },
    "chernobyl": {
      1: 5,
    },
    "attackontitan": {
      1: 25,
      2: 12,
      3: 22,
      4: 29,
    },
  };
const displaySeason =
  m ? parseInt(m[1], 10) : (Number.isFinite(season) ? season : null);
const displayEpisode =
  m ? parseInt(m[2], 10) : (Number.isFinite(episode) ? episode : null);

const showSeasonData = seasonLength[showKey] || {};

const currS = Number.isFinite(displaySeason) ? displaySeason : 1;
const currE = Number.isFinite(displayEpisode) ? displayEpisode : 1;

let nextSeason = currS;
let nextEpisode = currE + 1;
if (showSeasonData[currS] && nextEpisode > showSeasonData[currS]) {
  nextSeason = currS + 1;
  nextEpisode = 1;
}

let prevSeason = currS;
let prevEpisode = currE - 1;
if (prevEpisode < 1) {
  const prevSeasonLen = showSeasonData[currS - 1];
  if (prevSeasonLen) {
    prevSeason = currS - 1;
    prevEpisode = prevSeasonLen;
  } else {
    prevEpisode = null; 
  }
}

const isFirstEpisode = !isMovie && currS === 1 && currE === 1;
const maxSeasonNumber = Object.keys(showSeasonData).length
  ? Math.max(...Object.keys(showSeasonData).map(Number))
  : currS;
const isLastEpisode =
  !isMovie &&
  currS === maxSeasonNumber &&
  currE === (showSeasonData[currS] || 0);
const cleanIdForS3 = showId?.replace(/-/g, "");
const buildEpisodeS3Key = (targetSeason, targetEpisode) => {
  if (!cleanIdForS3) return "";
  const seasonNum = Number(targetSeason);
  const episodeNum = Number(targetEpisode);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return "";
  const seasonStr = `S${String(seasonNum).padStart(2, "0")}`;
  const episodeStr = `E${String(episodeNum).padStart(2, "0")}`;
  const titleRaw = episodeTitles?.[seasonNum]?.[episodeNum - 1] || "";
  return `${cleanIdForS3}/season${seasonNum}-mp4s/${seasonStr}${episodeStr}_${cleanIdForS3}_${titleRaw}.mp4`;
};
const resolveSignedEpisodeUrl = async (targetSeason, targetEpisode) => {
  if (typeof getSignedEpisodeUrl === "function") {
    return getSignedEpisodeUrl(showId, targetSeason, targetEpisode);
  }
  if (typeof getSignedUrl === "function") {
    return getSignedUrl(buildEpisodeS3Key(targetSeason, targetEpisode));
  }
  return "";
};
  const skipTimes = {
    "stevenuniverse": {
      default: {
        intro: { start: 0, end: 25 },
        outro: { start: 670, skipTo: "next" }, //Outro starts around 11:10
      },
      rules: [
        {
          condition: (s, e) => (s === 2 && e >= 9) || s > 2,
          intro: { start: 0, end: 22 },
          outro: { start: 667, skipTo: "next" }
        }
      ]
    },

    "adventuretime": {
      default: {
        intro: { start: 0, end: 25 },
        outro: { start: 675, skipTo: "next" }, //Outro starts around 11:10
      },
    },

    "overthegardenwall": {
      default: {
        intro: { start: 0, end: 12 },
        outro: { start: 657, skipTo: "next" }, //Outro starts around 10:50
      },
    },
    
    "neongenesis": {
      default: {
        intro: { start: 0, end: 90 },
        outro: { start: 1325, skipTo: "next" }, //Outro starts around 22:05
      },
    },
    
    "fmab": {
      default: {
        intro: { start: 0, end: 118 },
        outro: { start: 1345, skipTo: "next" }, //Outro starts around 22:25
      },
      rules: [
        {
          condition: (s, e) => (s === 2 && e >= 1) || s > 2,
          intro: { start: 0, end: 90 },
        }
      ]
    },
    "mobpsycho": {
      seasons: {
        1: {
          1: { outro: { start: 1429, skipTo: "next" } },
          2: { intro: { start: 61.0, end: 154.0 }, outro: { start: 1331, skipTo: "next" } },
          3: { intro: { start: 40.0, end: 130.0 }, outro: { start: 1434, skipTo: "next" } },
          4: { intro: { start: 56.0, end: 146.0 }, outro: { start: 1345, skipTo: "next" } },
          5: { intro: { start: 42.0, end: 133.0 }, outro: { start: 1341, skipTo: "next" } },
          6: { intro: { start: 35.0, end: 126.0 }, outro: { start: 1345, skipTo: "next" } },
          7: { intro: { start: 57.0, end: 147.0 }, outro: { start: 1345, skipTo: "next" } },
          8: { intro: { start: 54.0, end: 144.0 }, outro: { start: 1435, skipTo: "next" } },
          9: { intro: { start: 63.0, end: 153.0 }, outro: { start: 1345, skipTo: "next" } },
          10: { intro: { start: 32.0, end: 122.0 }, outro: { start: 1302, skipTo: "next" } },
          11: { intro: { start: 33.0, end: 123.0 }, outro: { start: 1345, skipTo: "next" } },
          12: { intro: { start: 45.0, end: 135.0 }, outro: { start: 1451, skipTo: "next" } },
        },
        2: {
          1: { intro: { start: 395.0, end: 485.0 }, outro: { start: 1432, skipTo: "next" } },
          2: { intro: { start: 19.0, end: 109.0 }, outro: { start: 1345, skipTo: "next" } },
          3: { intro: { start: 24.0, end: 114.0 }, outro: { start: 1345, skipTo: "next" } },
          4: { intro: { start: 27.0, end: 117.0 }, outro: { start: 1345, skipTo: "next" } },
          5: { intro: { start: 10.0, end: 100.0 }, outro: { start: 1431, skipTo: "next" } },
          6: { intro: { start: 57.0, end: 147.0 }, outro: { start: 1345, skipTo: "next" } },
          7: { intro: { start: 20.0, end: 110.0 }, outro: { start: 1434, skipTo: "next" } },
          8: { intro: { start: 43.0, end: 133.0 }, outro: { start: 1345, skipTo: "next" } },
          9: { intro: { start: 83.0, end: 173.0 }, outro: { start: 1345, skipTo: "next" } },
          10: { intro: { start: 52.0, end: 142.0 }, outro: { start: 1345, skipTo: "next" } },
          11: { intro: { start: 63.0, end: 153.0 }, outro: { start: 1313, skipTo: "next" } },
          12: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1345, skipTo: "next" } },
          13: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1446, skipTo: "next" } },
        },
        3: {
          1: { intro: { start: 32.0, end: 122.0 }, outro: { start: 1380, skipTo: "next" } },
          2: { intro: { start: 47.0, end: 137.0 }, outro: { start: 1299, skipTo: "next" } },
          3: { intro: { start: 275.0, end: 365.0 }, outro: { start: 1316, skipTo: "next" } },
          4: { intro: { start: 43.0, end: 133.0 }, outro: { start: 1404, skipTo: "next" } },
          5: { intro: { start: 149.0, end: 239.0 }, outro: { start: 1315, skipTo: "next" } },
          6: { intro: { start: 83.0, end: 173.0 }, outro: { start: 1405, skipTo: "next" } },
          7: { intro: { start: 177.0, end: 267.0 }, outro: { start: 1315, skipTo: "next" } },
          8: { intro: { start: 104.0, end: 194.0 }, outro: { start: 1397, skipTo: "next" } },
          9: { intro: { start: 39.0, end: 129.0 }, outro: { start: 1315, skipTo: "next" } },
          10: { intro: { start: 123.0, end: 213.0 }, outro: { start: 1315, skipTo: "next" } },
          11: { intro: { start: 81.0, end: 171.0 }, outro: { start: 1315, skipTo: "next" } },
          12: { intro: { start: 110.0, end: 200.0 }, outro: { start: 1410, skipTo: "next" } },
        }

      }
  }, 
    "jjk": {
      seasons: {
        1: {
          1: { intro: { start: 56.0, end: 145.0 }, outro: { start: 1425, skipTo: "next" } },
          2: { intro: { start: 346.0, end: 435.0 }, outro: { start: 1336, skipTo: "next" } },
          3: { intro: { start: 193.0, end: 282.0 }, outro: { start: 1275, skipTo: "next" } },
          4: { intro: { start: 176.0, end: 266.0 }, outro: { start: 1275, skipTo: "next" } },
          5: { intro: { start: 144.0, end: 233.0 }, outro: { start: 1275, skipTo: "next" } },
          6: { intro: { start: 35.0, end: 124.0 }, outro: { start: 1305, skipTo: "next" } },
          7: { intro: { start: 131.0, end: 220.0 }, outro: { start: 1275, skipTo: "next" } },
          8: { intro: { start: 200.0, end: 289.0 }, outro: { start: 1220, skipTo: "next" } },
          9: { intro: { start: 277.0, end: 366.0 }, outro: { start: 1306, skipTo: "next" } },
          10: { intro: { start: 171.0, end: 260.0 }, outro: { start: 1276, skipTo: "next" } },
          11: { intro: { start: 137.0, end: 226.0 }, outro: { start: 1320, skipTo: "next" } },
          12: { intro: { start: 118.0, end: 207.0 }, outro: { start: 1276, skipTo: "next" } },
          13: { intro: { start: 290.0, end: 379.0 }, outro: { start: 1245, skipTo: "next" } },
          14: { intro: { start: 205.0, end: 294.0 }, outro: { start: 1247, skipTo: "next" } },
          15: { intro: { start: 149.0, end: 238.0 }, outro: { start: 1246, skipTo: "next" } },
          16: { intro: { start: 234.0, end: 323.0 }, outro: { start: 1246, skipTo: "next" } },
          17: { intro: { start: 0.0, end: 89.0 }, outro: { start: 1246, skipTo: "next" } },
          18: { intro: { start: 159.0, end: 248.0 }, outro: { start: 1246, skipTo: "next" } },
          19: { intro: { start: 485.0, end: 574.0 }, outro: { start: 1246, skipTo: "next" } },
          20: { intro: { start: 67.0, end: 156.0 }, outro: { start: 1286, skipTo: "next" } },
          21: { intro: { start: 314.0, end: 403.0 }, outro: { start: 1286, skipTo: "next" } },
          22: { intro: { start: 31.0, end: 120.0 }, outro: { start: 1246, skipTo: "next" } },
          23: { intro: { start: 348.0, end: 437.0 }, outro: { start: 1246, skipTo: "next" } },
          24: { intro: { start: 133.0, end: 222.0 }, outro: { start: 1414, skipTo: "next" } },
        },
        2: {
          1: { intro: { start: 649.0, end: 738.0 }, outro: { start: 1330, skipTo: "next" } },
          2: { intro: { start: 192.0, end: 281.0 }, outro: { start: 1330, skipTo: "next" } },
          3: { intro: { start: 174.0, end: 263.0 }, outro: { start: 1330, skipTo: "next" } },
          4: { intro: { start: 76.0, end: 165.0 }, outro: { start: 1509, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 89.0 }, outro: { start: 1330, skipTo: "next" } },
          6: { intro: { start: 299.0, end: 388.0 }, outro: { start: 1330, skipTo: "next" } },
          7: { intro: { start: 125.0, end: 214.0 }, outro: { start: 1330, skipTo: "next" } },
          8: { intro: { start: 161.0, end: 250.0 }, outro: { start: 1330, skipTo: "next" } },
          9: { intro: { start: 56.0, end: 145.0 }, outro: { start: 1330, skipTo: "next" } },
          10: { intro: { start: 183.0, end: 272.0 }, outro: { start: 1300, skipTo: "next" } },
          11: { intro: { start: 285.0, end: 374.0 }, outro: { start: 1330, skipTo: "next" } },
          12: { intro: { start: 47.0, end: 136.0 }, outro: { start: 1330, skipTo: "next" } },
          13: { intro: { start: 66.0, end: 155.0 }, outro: { start: 1304, skipTo: "next" } },
          14: { intro: { start: 324.0, end: 413.0 }, outro: { start: 1330, skipTo: "next" } },
          15: { intro: { start: 271.0, end: 360.0 }, outro: { start: 1330, skipTo: "next" } },
          16: { intro: { start: 13.0, end: 102.0 }, outro: { start: 1330, skipTo: "next" } },
          17: { outro: { start: 1430, skipTo: "next" } },
          18: { intro: { start: 102.0, end: 191.0 }, outro: { start: 1315, skipTo: "next" } },
          19: { intro: { start: 59.0, end: 148.0 }, outro: { start: 1315, skipTo: "next" } },
          20: { intro: { start: 306.0, end: 395.0 }, outro: { start: 1405, skipTo: "next" } },
          21: { intro: { start: 219.0, end: 308.0 }, outro: { start: 1315, skipTo: "next" } },
          22: { intro: { start: 406.0, end: 495.0 }, outro: { start: 1315, skipTo: "next" } },
          23: { intro: { start: 0.0, end: 89.0 }, outro: { start: 1327, skipTo: "next" } },
        },
        3: {
          1: { intro: { start: 222.0, end: 313.0 }, outro: { start: 1329, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1325, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1328, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1585, skipTo: "next" } },
          5: { intro: { start: 380.0, end: 470.0 }, outro: { start: 1330, skipTo: "next" } },
          6: { intro: { start: 198.0, end: 288.0 }, outro: { start: 1330, skipTo: "next" } },
          7: { intro: { start: 183.0, end: 273.0 }, outro: { start: 1328, skipTo: "next" } },
          8: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1330, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1229, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1313, skipTo: "next" } },
          11: { intro: { start: 270.0, end: 360.0 }, outro: { start: 1316, skipTo: "next" } },
          12: { outro: { start: 1618, skipTo: "next" } },
        }
      }
    },
    "cyberpunk": {
      seasons: {
        1: {
          1: { outro: { start: 1345, skipTo: "next" } },
          2: { intro: { start: 75.0, end: 165.0 }, outro: { start: 1350, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 100.0 }, outro: { start: 1353, skipTo: "next" } },
          4: { intro: { start: 30.0, end: 120.0 }, outro: { start: 1350, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 100.0 }, outro: { start: 1305, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 100.0 }, outro: { start: 1444, skipTo: "next" } },
          7: { intro: { start: 86.0, end: 176.0 }, outro: { start: 1350, skipTo: "next" } },
          8: { intro: { start: 90.0, end: 180.0 }, outro: { start: 1350, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 100.0 }, outro: { start: 1414, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 100.0 }, outro: { start: 1525, skipTo: "next" } },
        }
      }
  },   
    "severance": {
      seasons: {
        1: {
          1: { outro: { start: 2840, skipTo: "next" } },
          2: { intro: { start: 327.0, end: 407.0 }, outro: { start: 3137, skipTo: "next" } },
          3: { intro: { start: 131.0, end: 211.0 }, outro: { start: 3137, skipTo: "next" } },
          4: { intro: { start: 235.0, end: 315.0 }, outro: { start: 2730, skipTo: "next" } },
          5: { intro: { start: 170.0, end: 350.0 }, outro: { start: 2528, skipTo: "next" } },
          6: { intro: { start: 60.0, end: 140.0 }, outro: { start: 2328, skipTo: "next" } },
          7: { intro: { start: 349.0, end: 429.0 }, outro: { start: 2925, skipTo: "next" } },
          8: { intro: { start: 196.0, end: 276.0 }, outro: { start: 2732, skipTo: "next" } },
          9: { intro: { start: 153.0, end: 233.0 }, outro: { start: 2322, skipTo: "next" } },
        },
        2: {
          1: { outro: { start: 3337, skipTo: "next" } },
          2: { intro: { start: 718.0, end: 798.0 }, outro: { start: 2686, skipTo: "next" } },
          3: { intro: { start: 190.0, end: 270.0 }, outro: { start: 3139, skipTo: "next" } },
          4: { outro: { start: 2962, skipTo: "next" } },
          5: { intro: { start: 142.0, end: 222.0 }, outro: { start: 2716, skipTo: "next" } },
          6: { intro: { start: 212.0, end: 292.0 }, outro: { start: 2805, skipTo: "next" } },
          7: { intro: { start: 300.0, end: 380.0 }, outro: { start: 2904, skipTo: "next" } },
          8: { outro: { start: 2149, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 80.0 }, outro: { start: 4400, skipTo: "next" } },
        },
      }
  },   
    "pluribus": {
      seasons: {
        1: {
          1: { outro: { start: 3291, skipTo: "next" } },
          2: { intro: { start: 455.0, end: 477.0 }, outro: { start: 3630, skipTo: "next" } },
          3: { intro: { start: 384.0, end: 406.0 }, outro: { start: 2490, skipTo: "next" } },
          4: { intro: { start: 610.0, end: 636.0 }, outro: { start: 2623, skipTo: "next" } },
          5: { intro: { start: 472.0, end: 495.0 }, outro: { start: 2669, skipTo: "next" } },
          6: { intro: { start: 329.0, end: 350.0 }, outro: { start: 2865, skipTo: "next" } },
          7: { intro: { start: 298.0, end: 323.0 }, outro: { start: 2645, skipTo: "next" } },
          8: { intro: { start: 183.0, end: 205.0 }, outro: { start: 2488, skipTo: "next" } },
          9: { intro: { start: 533.0, end: 555.0 }, outro: { start: 3322, skipTo: "next" } },
        }
      }
  },   
    "itsalwayssunny": {
      seasons: {
        1: {
          1: { intro: { start: 105.0, end: 133.0 }, outro: { start: 1294, skipTo: "next" } },
          2: { intro: { start: 81.0, end: 109.0 }, outro: { start: 1308, skipTo: "next" } },
          3: { intro: { start: 84.0, end: 112.0 }, outro: { start: 1302, skipTo: "next" } },
          4: { intro: { start: 155.0, end: 183.0 }, outro: { start: 1310, skipTo: "next" } },
          5: { intro: { start: 80.0, end: 108.0 }, outro: { start: 1244, skipTo: "next" } },
          6: { intro: { start: 67.0, end: 95.0 }, outro: { start: 1309, skipTo: "next" } },
          7: { intro: { start: 69.0, end: 97.0 }, outro: { start: 1105, skipTo: "next" } },
        },
        2: {
          1: { intro: { start: 69.0, end: 97.0 }, outro: { start: 1327, skipTo: "next" } },
          2: { intro: { start: 149.0, end: 177.0 }, outro: { start: 1326, skipTo: "next" } },
          3: { intro: { start: 56.0, end: 84.0 }, outro: { start: 1276, skipTo: "next" } },
          4: { intro: { start: 66.0, end: 94.0 }, outro: { start: 1367, skipTo: "next" } },
          5: { intro: { start: 62.0, end: 90.0 }, outro: { start: 1350, skipTo: "next" } },
          6: { intro: { start: 71.0, end: 99.0 }, outro: { start: 1329, skipTo: "next" } },
          7: { intro: { start: 89.0, end: 117.0 }, outro: { start: 1311, skipTo: "next" } },
          8: { intro: { start: 99.0, end: 127.0 }, outro: { start: 1337, skipTo: "next" } },
          9: { intro: { start: 115.0, end: 143.0 }, outro: { start: 1224, skipTo: "next" } },
          10: { intro: { start: 83.0, end: 111.0 }, outro: { start: 1389, skipTo: "next" } },
        },
        3: {
          1: { intro: { start: 56.0, end: 84.0 }, outro: { start: 1332, skipTo: "next" } },
          2: { intro: { start: 116.0, end: 144.0 }, outro: { start: 1273, skipTo: "next" } },
          3: { intro: { start: 46.0, end: 74.0 }, outro: { start: 1334, skipTo: "next" } },
          4: { intro: { start: 121.0, end: 149.0 }, outro: { start: 1342, skipTo: "next" } },
          5: { intro: { start: 194.0, end: 222.0 }, outro: { start: 1309, skipTo: "next" } },
          6: { intro: { start: 132.0, end: 160.0 }, outro: { start: 1295, skipTo: "next" } },
          7: { intro: { start: 102.0, end: 130.0 }, outro: { start: 1295, skipTo: "next" } },
          8: { intro: { start: 135.0, end: 163.0 }, outro: { start: 1292, skipTo: "next" } },
          9: { intro: { start: 101.0, end: 129.0 }, outro: { start: 1194, skipTo: "next" } },
          10: { intro: { start: 104.0, end: 132.0 }, outro: { start: 1311, skipTo: "next" } },
          11: { intro: { start: 92.0, end: 120.0 }, outro: { start: 1299, skipTo: "next" } },
          12: { intro: { start: 116.0, end: 144.0 }, outro: { start: 1223, skipTo: "next" } },
          13: { intro: { start: 0.0, end: 30.0 }, outro: { start: 1285, skipTo: "next" } },
          14: { intro: { start: 30.0, end: 60.0 }, outro: { start: 1185, skipTo: "next" } },
          15: { intro: { start: 116.0, end: 146.0 }, outro: { start: 1276, skipTo: "next" } },
        },     
        4: {
          1: { intro: { start: 112.0, end: 142.0 }, outro: { start: 1228, skipTo: "next" } },
          2: { intro: { start: 100.0, end: 130.0 }, outro: { start: 1202, skipTo: "next" } },
          3: { intro: { start: 70.0, end: 100.0 }, outro: { start: 1228, skipTo: "next" } },
          4: { intro: { start: 151.0, end: 181.0 }, outro: { start: 1230, skipTo: "next" } },
          5: { intro: { start: 96.0, end: 126.0 }, outro: { start: 1197, skipTo: "next" } },
          6: { intro: { start: 32.0, end: 62.0 }, outro: { start: 1200, skipTo: "next" } },
          7: { intro: { start: 85.0, end: 115.0 }, outro: { start: 1218, skipTo: "next" } },
          8: { intro: { start: 89.0, end: 119.0 }, outro: { start: 1228, skipTo: "next" } },
          9: { intro: { start: 105.0, end: 135.0 }, outro: { start: 1347, skipTo: "next" } },
          10: { intro: { start: 56.0, end: 86.0 }, outro: { start: 1228, skipTo: "next" } },
          11: { intro: { start: 106.0, end: 136.0 }, outro: { start: 1228, skipTo: "next" } },
          12: { intro: { start: 118.0, end: 148.0 }, outro: { start: 1213, skipTo: "next" } },
          13: { intro: { start: 76.0, end: 106.0 }, outro: { start: 1233, skipTo: "next" } },
        },     
        5: {
          1: { intro: { start: 165.0, end: 195.0 }, outro: { start: 1264, skipTo: "next" } },
          2: { intro: { start: 97.0, end: 127.0 }, outro: { start: 1228, skipTo: "next" } },
          3: { intro: { start: 98.0, end: 128.0 }, outro: { start: 1223, skipTo: "next" } },
          4: { intro: { start: 85.0, end: 115.0 }, outro: { start: 1187, skipTo: "next" } },
          5: { intro: { start: 135.0, end: 165.0 }, outro: { start: 1218, skipTo: "next" } },
          6: { intro: { start: 45.0, end: 75.0 }, outro: { start: 1195, skipTo: "next" } },
          7: { intro: { start: 150.0, end: 180.0 }, outro: { start: 1224, skipTo: "next" } },
          8: { intro: { start: 73.0, end: 103.0 }, outro: { start: 1226, skipTo: "next" } },
          9: { intro: { start: 144.0, end: 174.0 }, outro: { start: 1256, skipTo: "next" } },
          10: { intro: { start: 53.0, end: 83.0 }, outro: { start: 1237, skipTo: "next" } },
          11: { intro: { start: 146.0, end: 176.0 }, outro: { start: 1226, skipTo: "next" } },
          12: { intro: { start: 100.0, end: 130.0 }, outro: { start: 1226, skipTo: "next" } },
        },   
        6: {
          1: { intro: { start: 79.0, end: 109.0 }, outro: { start: 1223, skipTo: "next" } },
          2: { intro: { start: 90.0, end: 120.0 }, outro: { start: 1226, skipTo: "next" } },
          3: { intro: { start: 140.0, end: 170.0 }, outro: { start: 1232, skipTo: "next" } },
          4: { intro: { start: 96.0, end: 126.0 }, outro: { start: 1230, skipTo: "next" } },
          5: { intro: { start: 140.0, end: 170.0 }, outro: { start: 1230, skipTo: "next" } },
          6: { intro: { start: 134.0, end: 164.0 }, outro: { start: 1224, skipTo: "next" } },
          7: { intro: { start: 100.0, end: 130.0 }, outro: { start: 1230, skipTo: "next" } },
          8: { intro: { start: 140.0, end: 170.0 }, outro: { start: 1263, skipTo: "next" } },
          9: { intro: { start: 110.0, end: 140.0 }, outro: { start: 1219, skipTo: "next" } },
          10: { intro: { start: 108.0, end: 138.0 }, outro: { start: 1227, skipTo: "next" } },
          11: { intro: { start: 70.0, end: 100.0 }, outro: { start: 1340, skipTo: "next" } },
          12: { intro: { start: 66.0, end: 96.0 }, outro: { start: 1230, skipTo: "next" } },
          13: { intro: { start: 168.0, end: 198.0 }, outro: { start: 2533, skipTo: "next" } },
        },       
        7: {
          1: { intro: { start: 82.0, end: 101.0 }, outro: { start: 1284, skipTo: "next" } },
          2: { intro: { start: 97.0, end: 116.0 }, outro: { start: 1245, skipTo: "next" } },
          3: { intro: { start: 96.0, end: 115.0 }, outro: { start: 1260, skipTo: "next" } },
          4: { intro: { start: 93.0, end: 112.0 }, outro: { start: 1291, skipTo: "next" } },
          5: { intro: { start: 87.0, end: 106.0 }, outro: { start: 1247, skipTo: "next" } },
          6: { intro: { start: 107.0, end: 126.0 }, outro: { start: 1184, skipTo: "next" } },
          7: { intro: { start: 94.0, end: 113.0 }, outro: { start: 1167, skipTo: "next" } },
          8: { intro: { start: 123.0, end: 142.0 }, outro: { start: 1229, skipTo: "next" } },
          9: { intro: { start: 77.0, end: 96.0 }, outro: { start: 1161, skipTo: "next" } },
          10: { intro: { start: 18.0, end: 37.0 }, outro: { start: 1222, skipTo: "next" } },
          11: { intro: { start: 89.0, end: 108.0 }, outro: { start: 1165, skipTo: "next" } },
          12: { intro: { start: 77.0, end: 96.0 }, outro: { start: 1180, skipTo: "next" } },
          13: { intro: { start: 37.0, end: 56.0 }, outro: { start: 1268, skipTo: "next" } },
        },            
        8: {
          1: { intro: { start: 132.0, end: 151.0 }, outro: { start: 1242, skipTo: "next" } },
          2: { intro: { start: 96.0, end: 115.0 }, outro: { start: 1166, skipTo: "next" } },
          3: { intro: { start: 40.0, end: 59.0 }, outro: { start: 1337, skipTo: "next" } },
          4: { intro: { start: 149.0, end: 168.0 }, outro: { start: 1268, skipTo: "next" } },
          5: { intro: { start: 83.0, end: 102.0 }, outro: { start: 1285, skipTo: "next" } },
          6: { intro: { start: 55.0, end: 74.0 }, outro: { start: 1259, skipTo: "next" } },
          7: { intro: { start: 73.0, end: 92.0 }, outro: { start: 1267, skipTo: "next" } },
          8: { intro: { start: 120.0, end: 139.0 }, outro: { start: 1268, skipTo: "next" } },
          9: { intro: { start: 122.0, end: 141.0 }, outro: { start: 1126, skipTo: "next" } },
          10: { intro: { start: 180.0, end: 199.0 }, outro: { start: 1227, skipTo: "next" } },
        },
        9: {
          1: { intro: { start: 103.0, end: 123.0 }, outro: { start: 1245, skipTo: "next" } },
          2: { intro: { start: 130.0, end: 150.0 }, outro: { start: 1259, skipTo: "next" } },
          3: { intro: { start: 108.0, end: 128.0 }, outro: { start: 1266, skipTo: "next" } },
          4: { intro: { start: 128.0, end: 148.0 }, outro: { start: 1268, skipTo: "next" } },
          5: { intro: { start: 86.0, end: 106.0 }, outro: { start: 1247, skipTo: "next" } },
          6: { intro: { start: 42.0, end: 62.0 }, outro: { start: 1283, skipTo: "next" } },
          7: { intro: { start: 103.0, end: 123.0 }, outro: { start: 1242, skipTo: "next" } },
          8: { intro: { start: 150.0, end: 170.0 }, outro: { start: 1177, skipTo: "next" } },
          9: { intro: { start: 62.0, end: 82.0 }, outro: { start: 1126, skipTo: "next" } },
          10: { intro: { start: 174.0, end: 194.0 }, outro: { start: 1136, skipTo: "next" } },
        },  
        10: {
          1: { intro: { start: 67.0, end: 87.0 }, outro: { start: 1180, skipTo: "next" } },
          2: { intro: { start: 72.0, end: 92.0 }, outro: { start: 1375, skipTo: "next" } },
          3: { intro: { start: 61.0, end: 81.0 }, outro: { start: 1261, skipTo: "next" } },
          4: { intro: { start: 30.0, end: 50.0 }, outro: { start: 1205, skipTo: "next" } },
          5: { intro: { start: 157.0, end: 177.0 }, outro: { start: 1221, skipTo: "next" } },
          6: { intro: { start: 62.0, end: 82.0 }, outro: { start: 1243, skipTo: "next" } },
          7: { intro: { start: 80.0, end: 100.0 }, outro: { start: 1168, skipTo: "next" } },
          8: { intro: { start: 115.0, end: 135.0 }, outro: { start: 1168, skipTo: "next" } },
          9: { intro: { start: 87.0, end: 107.0 }, outro: { start: 1182, skipTo: "next" } },
          10: { intro: { start: 65.0, end: 85.0 }, outro: { start: 1224, skipTo: "next" } },
        },   
        11: {
          1: { intro: { start: 105.0, end: 125.0 }, outro: { start: 1194, skipTo: "next" } },
          2: { intro: { start: 49.0, end: 69.0 }, outro: { start: 1273, skipTo: "next" } },
          3: { intro: { start: 115.0, end: 135.0 }, outro: { start: 1299, skipTo: "next" } },
          4: { intro: { start: 135.0, end: 155.0 }, outro: { start: 1235, skipTo: "next" } },
          5: { intro: { start: 60.0, end: 80.0 }, outro: { start: 1271, skipTo: "next" } },
          6: { outro: { start: 1024, skipTo: "next" } },
          7: { intro: { start: 107.0, end: 127.0 }, outro: { start: 1267, skipTo: "next" } },
          8: { intro: { start: 175.0, end: 195.0 }, outro: { start: 1291, skipTo: "next" } },
          9: { intro: { start: 60.0, end: 80.0 }, outro: { start: 1272, skipTo: "next" } },
          10: { intro: { start: 65.0, end: 85.0 }, outro: { start: 1350, skipTo: "next" } },
        },
        12: {
          1: { intro: { start: 147.0, end: 167.0 }, outro: { start: 1301, skipTo: "next" } },
          2: { intro: { start: 106.0, end: 126.0 }, outro: { start: 1078, skipTo: "next" } },
          3: { intro: { start: 98.0, end: 118.0 }, outro: { start: 1221, skipTo: "next" } },
          4: { intro: { start: 117.0, end: 137.0 }, outro: { start: 1140, skipTo: "next" } },
          5: { intro: { start: 62.0, end: 82.0 }, outro: { start: 1286, skipTo: "next" } },
          6: { intro: { start: 120.0, end: 140.0 }, outro: { start: 1265, skipTo: "next" } },
          7: { intro: { start: 215.0, end: 235.0 }, outro: { start: 1290, skipTo: "next" } },
          8: { intro: { start: 209.0, end: 229.0 }, outro: { start: 1280, skipTo: "next" } },
          9: { intro: { start: 108.0, end: 128.0 }, outro: { start: 1051, skipTo: "next" } },
          10: { intro: { start: 115.0, end: 135.0 }, outro: { start: 1281, skipTo: "next" } },
        },         
        13: {
          1: { intro: { start: 98.0, end: 118.0 }, outro: { start: 1258, skipTo: "next" } },
          2: { intro: { start: 105.0, end: 125.0 }, outro: { start: 1271, skipTo: "next" } },
          3: { intro: { start: 76.0, end: 96.0 }, outro: { start: 1150, skipTo: "next" } },
          4: { intro: { start: 78.0, end: 98.0 }, outro: { start: 1208, skipTo: "next" } },
          5: { intro: { start: 109.0, end: 129.0 }, outro: { start: 1369, skipTo: "next" } },
          6: { intro: { start: 112.0, end: 132.0 }, outro: { start: 1266, skipTo: "next" } },
          7: { intro: { start: 74.0, end: 94.0 }, outro: { start: 1183, skipTo: "next" } },
          8: { intro: { start: 176.0, end: 196.0 }, outro: { start: 1066, skipTo: "next" } },
          9: { intro: { start: 158.0, end: 178.0 }, outro: { start: 1112, skipTo: "next" } },
          10: { intro: { start: 86.0, end: 106.0 }, outro: { start: 1220, skipTo: "next" } },
        },     
        14: {
          1: { intro: { start: 96.0, end: 116.0 }, outro: { start: 1380, skipTo: "next" } },
          2: { intro: { start: 118.0, end: 138.0 }, outro: { start: 1292, skipTo: "next" } },
          3: { intro: { start: 177.0, end: 197.0 }, outro: { start: 1380, skipTo: "next" } },
          4: { intro: { start: 137.0, end: 157.0 }, outro: { start: 1344, skipTo: "next" } },
          5: { intro: { start: 133.0, end: 153.0 }, outro: { start: 1302, skipTo: "next" } },
          6: { outro: { start: 1288, skipTo: "next" } },
          7: { intro: { start: 99.0, end: 119.0 }, outro: { start: 1080, skipTo: "next" } },
          8: { intro: { start: 116.0, end: 136.0 }, outro: { start: 1195, skipTo: "next" } },
          9: { intro: { start: 129.0, end: 149.0 }, outro: { start: 1192, skipTo: "next" } },
          10: { intro: { start: 110.0, end: 130.0 }, outro: { start: 1219, skipTo: "next" } },
        },   
        15: {
          1: { intro: { start: 137.0, end: 157.0 }, outro: { start: 1303, skipTo: "next" } },
          2: { intro: { start: 116.0, end: 136.0 }, outro: { start: 1276, skipTo: "next" } },
          3: { intro: { start: 60.0, end: 80.0 }, outro: { start: 1270, skipTo: "next" } },
          4: { intro: { start: 118.0, end: 138.0 }, outro: { start: 1239, skipTo: "next" } },
          5: { intro: { start: 100.0, end: 120.0 }, outro: { start: 1238, skipTo: "next" } },
          6: { intro: { start: 67.0, end: 87.0 }, outro: { start: 1274, skipTo: "next" } },
          7: { intro: { start: 108.0, end: 128.0 }, outro: { start: 1319, skipTo: "next" } },
          8: { intro: { start: 104.0, end: 124.0 }, outro: { start: 1270, skipTo: "next" } },
        }, 
        16: {
          1: { intro: { start: 194.0, end: 214.0 }, outro: { start: 1318, skipTo: "next" } },
          2: { intro: { start: 119.0, end: 139.0 }, outro: { start: 1282, skipTo: "next" } },
          3: { intro: { start: 75.0, end: 95.0 }, outro: { start: 1258, skipTo: "next" } },
          4: { intro: { start: 52.0, end: 72.0 }, outro: { start: 1185, skipTo: "next" } },
          5: { intro: { start: 69.0, end: 89.0 }, outro: { start: 1232, skipTo: "next" } },
          6: { intro: { start: 99.0, end: 119.0 }, outro: { start: 1226, skipTo: "next" } },
          7: { intro: { start: 139.0, end: 159.0 }, outro: { start: 1316, skipTo: "next" } },
          8: { intro: { start: 63.0, end: 83.0 }, outro: { start: 1341, skipTo: "next" } },
        }, 
      }
  }, 
  "thetwilightzone": {
    seasons: {
      1: {
        1: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1486, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1486, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1486, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1486, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        12: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        13: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        14: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        15: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        16: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        17: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        18: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        19: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        20: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        21: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        22: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        23: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        24: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        25: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        26: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        27: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        28: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        29: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        30: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        31: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        32: { intro: { start: 0.0, end: 36.0 }, outro: { start: 1488, skipTo: "next" } },
        33: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1488, skipTo: "next" } },
        34: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1488, skipTo: "next" } },
        35: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1488, skipTo: "next" } },
        36: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1488, skipTo: "next" } },
      },
      2: {
        1: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1489, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1458, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1500, skipTo: "next" } },
        12: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        13: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        14: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        15: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        16: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        17: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1480, skipTo: "next" } },
        18: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        19: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1476, skipTo: "next" } },
        20: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1470, skipTo: "next" } },
        21: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        22: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        23: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1505, skipTo: "next" } },
        24: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1498, skipTo: "next" } },
        25: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        26: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1500, skipTo: "next" } },
        27: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1486, skipTo: "next" } },
        28: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1480, skipTo: "next" } },
        29: { intro: { start: 0.0, end: 21.0 }, outro: { start: 1500, skipTo: "next" } },
      },
      3: {
        1: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1497, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1491, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1491, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1488, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1489, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1489, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1488, skipTo: "next" } },
        12: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        13: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1487, skipTo: "next" } },
        14: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1489, skipTo: "next" } },
        15: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1488, skipTo: "next" } },
        16: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        17: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        18: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1494, skipTo: "next" } },
        19: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        20: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1500, skipTo: "next" } },
        21: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1489, skipTo: "next" } },
        22: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1502, skipTo: "next" } },
        23: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1487, skipTo: "next" } },
        24: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        25: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1484, skipTo: "next" } },
        26: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1498, skipTo: "next" } },
        27: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1487, skipTo: "next" } },
        28: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1508, skipTo: "next" } },
        29: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1485, skipTo: "next" } },
        30: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1501, skipTo: "next" } },
        31: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1488, skipTo: "next" } },
        32: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1501, skipTo: "next" } },
        33: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1478, skipTo: "next" } },
        34: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1490, skipTo: "next" } },
        35: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1486, skipTo: "next" } },
        36: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1461, skipTo: "next" } },
        37: { intro: { start: 0.0, end: 22.0 }, outro: { start: 1453, skipTo: "next" } },
      },
      4: {
        1: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3018, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3018, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3026, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3020, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3013, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        12: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        13: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        14: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        15: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        16: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3022, skipTo: "next" } },
        17: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3019, skipTo: "next" } },
        18: { intro: { start: 0.0, end: 29.0 }, outro: { start: 3020, skipTo: "next" } },
      },
      5: {
        1: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1495, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1497, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1493, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1495, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1492, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        12: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        13: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        14: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1493, skipTo: "next" } },
        15: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1493, skipTo: "next" } },
        16: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1495, skipTo: "next" } },
        17: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        18: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        19: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1470, skipTo: "next" } },
        20: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1494, skipTo: "next" } },
        21: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1470, skipTo: "next" } },
        22: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1500, skipTo: "next" } },
        23: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        24: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1492, skipTo: "next" } },
        25: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        26: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1495, skipTo: "next" } },
        27: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1486, skipTo: "next" } },
        28: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1494, skipTo: "next" } },
        29: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        30: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1468, skipTo: "next" } },
        31: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1495, skipTo: "next" } },
        32: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1493, skipTo: "next" } },
        33: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1493, skipTo: "next" } },
        34: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1496, skipTo: "next" } },
        35: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1494, skipTo: "next" } },
        36: { intro: { start: 0.0, end: 29.0 }, outro: { start: 1468, skipTo: "next" } },
      }
    },   
  },
  "truedetective": {
    seasons: {
      1: {
        1: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3513, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3413, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3431, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3362, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3375, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3452, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3147, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 97.0 }, outro: { start: 3223, skipTo: "next" } },
      }
    }
  }, 
  "theericandreshow": {
    seasons: {
      1: {
        1: { intro: { start: 0.0, end: 44.0 }, outro: { start: 630, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 44.0 }, outro: { start: 651, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 44.0 }, outro: { start: 649, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 41.0 }, outro: { start: 660, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 44.0 }, outro: { start: 658, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 33.0 }, outro: { start: 636, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 44.0 }, outro: { start: 641, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 66.0 }, outro: { start: 658, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 66.0 }, outro: { start: 635, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 44.0 }, outro: { start: 625, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 54.0 }, outro: { start: 1616, skipTo: "next" } },
      },
      2: {
        1: { intro: { start: 0.0, end: 48.0 }, outro: { start: 657, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 48.0 }, outro: { start: 660, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 48.0 }, outro: { start: 645, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 55.0 }, outro: { start: 660, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 48.0 }, outro: { start: 660, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 52.0 }, outro: { start: 660, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 54.0 }, outro: { start: 654, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 51.0 }, outro: { start: 661, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 54.0 }, outro: { start: 649, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 61.0 }, outro: { start: 618, skipTo: "next" } },
      },
      3: {
        1: { intro: { start: 0.0, end: 57.0 }, outro: { start: 660, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 45.0 }, outro: { start: 660, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 50.0 }, outro: { start: 645, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 45.0 }, outro: { start: 640, skipTo: "next" } },
        5: { outro: { start: 638, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 53.0 }, outro: { start: 652, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 54.0 }, outro: { start: 635, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 54.0 }, outro: { start: 635, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 45.0 }, outro: { start: 635, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 45.0 }, outro: { start: 650, skipTo: "next" } },
      },
      4: {
        1: { intro: { start: 0.0, end: 48.0 }, outro: { start: 645, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 48.0 }, outro: { start: 665, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 48.0 }, outro: { start: 660, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 48.0 }, outro: { start: 665, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 62.0 }, outro: { start: 665, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 71.0 }, outro: { start: 630, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 52.0 }, outro: { start: 635, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 53.0 }, outro: { start: 660, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 64.0 }, outro: { start: 667, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 56.0 }, outro: { start: 665, skipTo: "next" } },
      },
      5: {
        1: { intro: { start: 0.0, end: 40.0 }, outro: { start: 665, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 55.0 }, outro: { start: 660, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 53.0 }, outro: { start: 660, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 47.0 }, outro: { start: 657, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 52.0 }, outro: { start: 657, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 52.0 }, outro: { start: 652, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 46.0 }, outro: { start: 657, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 43.0 }, outro: { start: 655, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 63.0 }, outro: { start: 653, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 51.0 }, outro: { start: 860, skipTo: "next" } },
      },
    }
  }, 
  "mongolianchopsquad": {
    seasons: {
      1: {
        1: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1362.0, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1365.0, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1365.0, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1365.0, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1365.0, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1363.0, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        11: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        12: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        13: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        14: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        15: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        16: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        17: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        18: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        19: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        20: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        21: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        22: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        23: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        24: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        25: { intro: { start: 0.0, end: 96.0 }, outro: { start: 1364.0, skipTo: "next" } },
        26: { intro: { start: 0.0, end: 96.0 } },

      },
    },
  },
  "widowsbay": {
    seasons: {
      1: {
        1: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2385.5, skipTo: "next" } },
        2: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2116.27, skipTo: "next" } },
        3: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2169.85, skipTo: "next" } },
        4: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2036.05, skipTo: "next" } },
        5: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2113.2, skipTo: "next" } },
        6: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2147.65, skipTo: "next" } },
        7: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2443.55, skipTo: "next" } },
        8: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1922.7, skipTo: "next" } },
        9: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1783.95, skipTo: "next" } },
        10: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2789.0, skipTo: "next" } },
      },
    },
  },
    "atlanta": {
      seasons: {
        1: {
          1: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1467.75, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1311.3, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1446.99, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1329.2, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1250.6, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1443.67, skipTo: "next" } },
          7: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1236.3, skipTo: "next" } },
          8: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1485.7, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1394.75, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1505.0, skipTo: "next" } },
        },
        2: {
          1: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1743.3, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1525.45, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1532.93, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1501.1, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1315.75, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2046.8, skipTo: "next" } },
          7: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1584.25, skipTo: "next" } },
          8: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1568.25, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1830.95, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1386.6, skipTo: "next" } },
          11: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1745.05, skipTo: "next" } },
        },
        3: {
          1: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2152.65, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1931.5, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2067.6, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2095.9, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1845.05, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1868.1, skipTo: "next" } },
          7: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1920.55, skipTo: "next" } },
          8: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1842.85, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1664.9, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2160.9, skipTo: "next" } },
        },
        4: {
          1: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1587.4, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1916.2, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1851.3, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1522.6, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1707.7, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1609.9, skipTo: "next" } },
          7: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1858.25, skipTo: "next" } },
          8: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2164.4, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1935.0, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 0.0 }, outro: { start: 2051.0, skipTo: "next" } },
        },
      },
    },
    "jojos": {
      seasons: {
        1: {
          1: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1428.05, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 101.3 }, outro: { start: 1338.5, skipTo: "next" } },
          3: { intro: { start: 42.0, end: 132.75 }, outro: { start: 1338.25, skipTo: "next" } },
          4: { intro: { start: 180.0, end: 268.85 }, outro: { start: 1338.1, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 101.75 }, outro: { start: 1428.8, skipTo: "next" } },
          6: { intro: { start: 93.0, end: 180.8 }, outro: { start: 1338.27, skipTo: "next" } },
          7: { intro: { start: 189.0, end: 276.8 }, outro: { start: 1338.06, skipTo: "next" } },
          8: { intro: { start: 234.0, end: 318.8 }, outro: { start: 1338.06, skipTo: "next" } },
          9: { intro: { start: 129.0, end: 217.8 }, outro: { start: 1338.07, skipTo: "next" } },
          10: { intro: { start: 66.0, end: 154.8 }, outro: { start: 1339.47, skipTo: "next" } },
          11: { intro: { start: 49.0, end: 137.8 }, outro: { start: 1338.07, skipTo: "next" } },
          12: { intro: { start: 252.0, end: 340.8 }, outro: { start: 1310.07, skipTo: "next" } },
          13: { intro: { start: 258.0, end: 346.8 }, outro: { start: 1338.13, skipTo: "next" } },
          14: { intro: { start: 96.0, end: 184.8 }, outro: { start: 1303.26, skipTo: "next" } },
          15: { intro: { start: 0.0, end: 101.8 }, outro: { start: 1338.08, skipTo: "next" } },
          16: { intro: { start: 64.0, end: 152.8 }, outro: { start: 1338.13, skipTo: "next" } },
          17: { intro: { start: 229.0, end: 316.8 }, outro: { start: 1338.16, skipTo: "next" } },
          18: { intro: { start: 178.0, end: 266.8 }, outro: { start: 1296.94, skipTo: "next" } },
          19: { intro: { start: 198.0, end: 286.8 }, outro: { start: 1338.13, skipTo: "next" } },
          20: { intro: { start: 75.0, end: 163.8 }, outro: { start: 1338.13, skipTo: "next" } },
          21: { intro: { start: 50.0, end: 138.8 }, outro: { start: 1338.16, skipTo: "next" } },
          22: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1338.16, skipTo: "next" } },
          23: { intro: { start: 177.0, end: 265.8 }, outro: { start: 1338.13, skipTo: "next" } },
          24: { intro: { start: 180.0, end: 268.8 }, outro: { start: 1338.13, skipTo: "next" } },
          25: { intro: { start: 100.0, end: 187.45 }, outro: { start: 1338.22, skipTo: "next" } },
          26: { intro: { start: 66.0, end: 155.7 }, outro: { start: 1315.8, skipTo: "next" } },
          27: { intro: { start: 93.0, end: 182.2 }, outro: { start: 1428.15, skipTo: "next" } },
          28: { intro: { start: 107.0, end: 194.5 }, outro: { start: 1338.22, skipTo: "next" } },
          29: { intro: { start: 189.0, end: 277.3 }, outro: { start: 1338.1, skipTo: "next" } },
          30: { intro: { start: 132.0, end: 220.0 }, outro: { start: 1338.1, skipTo: "next" } },
          31: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1338.1, skipTo: "next" } },
          32: { intro: { start: 52.0, end: 140.9 }, outro: { start: 1428.55, skipTo: "next" } },
          33: { intro: { start: 192.0, end: 280.6 }, outro: { start: 1338.1, skipTo: "next" } },
          34: { intro: { start: 161.0, end: 249.3 }, outro: { start: 1338.22, skipTo: "next" } },
          35: { intro: { start: 181.0, end: 270.3 }, outro: { start: 1338.05, skipTo: "next" } },
          36: { intro: { start: 152.0, end: 240.6 }, outro: { start: 1338.22, skipTo: "next" } },
          37: { intro: { start: 118.0, end: 204.45 }, outro: { start: 1338.22, skipTo: "next" } },
          38: { intro: { start: 185.0, end: 278.5 }, outro: { start: 1343.2, skipTo: "next" } },
        },
      },
    },
    "attackontitan": {
      seasons: {
        1: {
          1: { intro: { start: 123.0, end: 214.3 }, outro: { start: 1432.6, skipTo: "next" } },
          2: { intro: { start: 0.0, end: 134.4 }, outro: { start: 1342.63, skipTo: "next" } },
          3: { intro: { start: 0.0, end: 91.4 }, outro: { start: 1342.63, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 129.4 }, outro: { start: 1342.63, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 143.4 }, outro: { start: 1339.55, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 91.4 }, outro: { start: 1339.63, skipTo: "next" } },
          7: { intro: { start: 0.0, end: 204.4 }, outro: { start: 1339.59, skipTo: "next" } },
          8: { intro: { start: 0.0, end: 151.4 }, outro: { start: 1339.63, skipTo: "next" } },
          9: { intro: { start: 0.0, end: 124.4 }, outro: { start: 1339.59, skipTo: "next" } },
          10: { intro: { start: 0.0, end: 140.4 }, outro: { start: 1339.63, skipTo: "next" } },
          11: { intro: { start: 0.0, end: 147.4 }, outro: { start: 1339.59, skipTo: "next" } },
          12: { intro: { start: 0.0, end: 207.4 }, outro: { start: 1340.19, skipTo: "next" } },
          13: { intro: { start: 0.0, end: 279.2 }, outro: { start: 1339.79, skipTo: "next" } },
          14: { intro: { start: 50.0, end: 140.34 }, outro: { start: 1339.47, skipTo: "next" } },
          15: { intro: { start: 32.0, end: 122.4 }, outro: { start: 1339.43, skipTo: "next" } },
          16: { intro: { start: 0.0, end: 90.4 }, outro: { start: 1339.43, skipTo: "next" } },
          17: { intro: { start: 0.0, end: 171.4 }, outro: { start: 1339.52, skipTo: "next" } },
          18: { intro: { start: 0.0, end: 217.4 }, outro: { start: 1339.43, skipTo: "next" } },
          19: { intro: { start: 0.0, end: 192.4 }, outro: { start: 1339.43, skipTo: "next" } },
          20: { intro: { start: 0.0, end: 211.4 }, outro: { start: 1339.43, skipTo: "next" } },
          21: { intro: { start: 0.0, end: 282.4 }, outro: { start: 1339.39, skipTo: "next" } },
          22: { intro: { start: 0.0, end: 190.4 }, outro: { start: 1339.39, skipTo: "next" } },
          23: { intro: { start: 0.0, end: 90.4 }, outro: { start: 1339.39, skipTo: "next" } },
          24: { intro: { start: 0.0, end: 140.4 }, outro: { start: 1339.79, skipTo: "next" } },
          25: { intro: { start: 0.0, end: 156.4 }, outro: { start: 1347.25, skipTo: "next" } },
        },
        2: {
          1: { intro: { start: 162.95, end: 251.8 }, outro: { start: 1327.1, skipTo: "next" } },
          2: { intro: { start: 85.8, end: 174.9 }, outro: { start: 1327.65, skipTo: "next" } },
          3: { intro: { start: 177.9, end: 267.0 }, outro: { start: 1327.68, skipTo: "next" } },
          4: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1327.63, skipTo: "next" } },
          5: { intro: { start: 0.0, end: 90.0 }, outro: { start: 1327.63, skipTo: "next" } },
          6: { intro: { start: 0.0, end: 210.0 }, outro: { start: 1327.63, skipTo: "next" } },
          7: { intro: { start: 98.9, end: 188.0 }, outro: { start: 1327.68, skipTo: "next" } },
          8: { intro: { start: 108.9, end: 198.0 }, outro: { start: 1327.55, skipTo: "next" } },
          9: { intro: { start: 80.7, end: 169.8 }, outro: { start: 1327.59, skipTo: "next" } },
          10: { intro: { start: 82.9, end: 172.0 }, outro: { start: 1327.76, skipTo: "next" } },
          11: { intro: { start: 65.7, end: 154.8 }, outro: { start: 1327.63, skipTo: "next" } },
          12: { intro: { start: 37.9, end: 127.0 }, outro: { start: 1327.65, skipTo: "next" } },
        },
        3: {
          1: { intro: { start: 34.95, end: 125.65 }, outro: { start: 1417.25, skipTo: "next" } },
          2: { intro: { start: 33.6, end: 123.25 }, outro: { start: 1328.0, skipTo: "next" } },
          3: { intro: { start: 1.55, end: 91.2 }, outro: { start: 1328.06, skipTo: "next" } },
          4: { intro: { start: 113.55, end: 203.2 }, outro: { start: 1328.06, skipTo: "next" } },
          5: { intro: { start: 34.55, end: 124.2 }, outro: { start: 1328.06, skipTo: "next" } },
          6: { intro: { start: 193.55, end: 283.2 }, outro: { start: 1328.06, skipTo: "next" } },
          7: { intro: { start: 1.55, end: 91.2 }, outro: { start: 1328.06, skipTo: "next" } },
          8: { intro: { start: 65.55, end: 155.2 }, outro: { start: 1328.06, skipTo: "next" } },
          9: { intro: { start: 94.55, end: 184.2 }, outro: { start: 1328.06, skipTo: "next" } },
          10: { intro: { start: 46.55, end: 136.2 }, outro: { start: 1328.06, skipTo: "next" } },
          11: { intro: { start: 1.55, end: 91.2 }, outro: { start: 1417.5, skipTo: "next" } },
          12: { intro: { start: 180.55, end: 270.2 }, outro: { start: 1279.84, skipTo: "next" } },
          13: { intro: { start: 100.25, end: 189.85 }, outro: { start: 1327.3, skipTo: "next" } },
          14: { intro: { start: 0.2, end: 89.8 }, outro: { start: 1327.26, skipTo: "next" } },
          15: { intro: { start: 0.2, end: 89.8 }, outro: { start: 1327.26, skipTo: "next" } },
          16: { intro: { start: 130.2, end: 219.8 }, outro: { start: 1327.26, skipTo: "next" } },
          17: { intro: { start: 39.8, end: 129.4 }, outro: { start: 1327.26, skipTo: "next" } },
          18: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1327.26, skipTo: "next" } },
          19: { intro: { start: 0.2, end: 89.8 }, outro: { start: 0.0, skipTo: "next" } },
          20: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1327.26, skipTo: "next" } },
          21: { intro: { start: 35.35, end: 125.4 }, outro: { start: 1374.7, skipTo: "next" } },
          22: { intro: { start: 100.8, end: 190.4 }, outro: { start: 1313.1, skipTo: "next" } },
        },
        4: {
          1: { intro: { start: 208.75, end: 297.9 }, outro: { start: 1374.75, skipTo: "next" } },
          2: { intro: { start: 174.85, end: 264.0 }, outro: { start: 1327.3, skipTo: "next" } },
          3: { intro: { start: 210.85, end: 300.0 }, outro: { start: 1327.24, skipTo: "next" } },
          4: { intro: { start: 52.85, end: 142.0 }, outro: { start: 1288.4, skipTo: "next" } },
          5: { intro: { start: 73.85, end: 163.0 }, outro: { start: 1327.24, skipTo: "next" } },
          6: { intro: { start: 317.05, end: 406.2 }, outro: { start: 1327.25, skipTo: "next" } },
          7: { intro: { start: 154.85, end: 244.0 }, outro: { start: 1327.24, skipTo: "next" } },
          8: { intro: { start: 112.85, end: 202.0 }, outro: { start: 1327.24, skipTo: "next" } },
          9: { intro: { start: 173.85, end: 263.0 }, outro: { start: 1327.24, skipTo: "next" } },
          10: { intro: { start: 81.85, end: 171.0 }, outro: { start: 1327.44, skipTo: "next" } },
          11: { intro: { start: 71.85, end: 161.0 }, outro: { start: 1417.95, skipTo: "next" } },
          12: { intro: { start: 58.85, end: 148.0 }, outro: { start: 1327.2, skipTo: "next" } },
          13: { intro: { start: 131.85, end: 221.0 }, outro: { start: 1327.24, skipTo: "next" } },
          14: { intro: { start: 40.85, end: 130.0 }, outro: { start: 1327.24, skipTo: "next" } },
          15: { intro: { start: 80.85, end: 170.0 }, outro: { start: 1327.35, skipTo: "next" } },
          16: { intro: { start: 88.85, end: 178.0 }, outro: { start: 1327.25, skipTo: "next" } },
          17: { intro: { start: 220.66, end: 310.15 }, outro: { start: 1328.1, skipTo: "next" } },
          18: { intro: { start: 409.71, end: 499.2 }, outro: { start: 1328.04, skipTo: "next" } },
          19: { intro: { start: 1.71, end: 90.4 }, outro: { start: 1328.04, skipTo: "next" } },
          20: { intro: { start: 333.71, end: 423.2 }, outro: { start: 1328.04, skipTo: "next" } },
          21: { intro: { start: 332.71, end: 422.2 }, outro: { start: 1328.04, skipTo: "next" } },
          22: { intro: { start: 87.71, end: 177.2 }, outro: { start: 1328.04, skipTo: "next" } },
          23: { intro: { start: 219.71, end: 309.2 }, outro: { start: 1417.2, skipTo: "next" } },
          24: { intro: { start: 253.71, end: 343.2 }, outro: { start: 1328.04, skipTo: "next" } },
          25: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1328.04, skipTo: "next" } },
          26: { intro: { start: 97.71, end: 187.2 }, outro: { start: 1328.04, skipTo: "next" } },
          27: { intro: { start: 274.71, end: 364.2 }, outro: { start: 1211.05, skipTo: "next" } },
          28: { intro: { start: 0.0, end: 0.0 }, outro: { start: 1419.2, skipTo: "next" } },
          29: { intro: { start: 0.0, end: 0.0 }, outro: { start: 0.0, skipTo: "next" } },
        },
      },
    },
  };
 
const getActiveSkipTime = () => {
  const perEp = skipTimes[showKey]?.seasons?.[actualSeason]?.[actualEpisode];
  const defaultTimes = perEp || skipTimes[showKey]?.default;

  if (!defaultTimes) return { intro: null, outro: null };
  const rules = perEp ? [] : (skipTimes[showKey]?.rules || []);
  const matched = rules.find(rule => rule.condition(actualSeason, actualEpisode));
  const introCandidate = (matched?.intro ?? defaultTimes?.intro) || null;
  const outroCandidate = (matched?.outro ?? defaultTimes?.outro) || null;
  return {
    intro: introCandidate && introCandidate.end > introCandidate.start ? introCandidate : null,
    outro: outroCandidate && outroCandidate.start > 0 ? outroCandidate : null,
  };
};
const { intro, outro } = getActiveSkipTime();
const hasIntro = !!(intro && Number.isFinite(intro.end));
const debugOutro =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debugOutro") === "1";
const [debugOutroDismissed, setDebugOutroDismissed] = useState(false);
useEffect(() => {
  setDebugOutroDismissed(false);
}, [src, debugOutro]);
const formatProgressStorageKey = (s = season, e = episode) => {
  if (s == null || e == null) return `${showId}`;
  const seasonNum = Number(s);
  const episodeNum = Number(e);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return `${showId}`;
  return `${showId}-S${String(seasonNum).padStart(2, "0")}-E${String(episodeNum).padStart(2, "0")}`;
};
const formatLegacyProgressStorageKey = (s = season, e = episode) => {
  if (s == null || e == null) return `${showId}`;
  const seasonNum = Number(s);
  const episodeNum = Number(e);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return `${showId}`;
  return `${showId}-S${seasonNum}-E${episodeNum}`;
};
const readProgressRawWithMigration = (storageKey) => {
  const primary = `watchProgress-${storageKey}`;
  const raw = localStorage.getItem(primary);
  if (raw != null) return raw;

  const legacyKey = formatLegacyProgressStorageKey();
  if (legacyKey !== storageKey) {
    const legacyFull = `watchProgress-${legacyKey}`;
    const legacyRaw = localStorage.getItem(legacyFull);
    if (legacyRaw != null) {
      localStorage.setItem(primary, legacyRaw);
      localStorage.removeItem(legacyFull);
      return legacyRaw;
    }
  }
  return null;
};

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (intendedResumeTimeRef.current != null) return;
    setAutoSkipDone(false); 

  const key = formatProgressStorageKey();
    
  const raw = readProgressRawWithMigration(key);
  let savedProgress = 0;
  try {
    const obj = raw ? JSON.parse(raw) : null;
    savedProgress = Number(obj?.t ?? obj?.currentTime ?? 0) || 0;
  } catch {
    savedProgress = Number(raw) || 0;
  }


    const startPlayback = async () => {
      try {
        vid.load();           
        vid.volume = volume;
        const shouldStartFromBeginning = savedProgress >= (outro?.start ?? Infinity);

        const shouldAutoSkipIntro =
          skipIntro &&
          hasIntro &&
          !NO_AUTO_SKIP_INTRO_SHOWS.has(showKey);

        const startTime =
          (!shouldStartFromBeginning && savedProgress > 1)
            ? savedProgress
            : (shouldAutoSkipIntro ? Number(intro.end) || 0 : 0);

        vid.currentTime = startTime;

        await vid.play();

        if (shouldAutoSkipIntro) {
          setAutoSkipDone(true);
        }   
      } catch (err) {
        console.warn("Autoplay blocked:", err);
      }
    };
    startPlayback();
  }, [playbackSrc, skipIntro, intro?.end]);
  useEffect(() => {
    const vid = videoRef.current;
    const resumeAt = intendedResumeTimeRef.current;
    if (!vid || resumeAt == null) return;

    const handleResumeReady = async () => {
      try {
        vid.currentTime = Math.max(0, Number(resumeAt) || 0);
        await vid.play();
      } catch (err) {
        console.warn("Recovery resume play failed:", err);
      } finally {
        intendedResumeTimeRef.current = null;
      }
    };

    vid.addEventListener("loadedmetadata", handleResumeReady, { once: true });
    vid.addEventListener("canplay", handleResumeReady, { once: true });
    return () => {
      vid.removeEventListener("loadedmetadata", handleResumeReady);
      vid.removeEventListener("canplay", handleResumeReady);
    };
  }, [playbackSrc]);
  const [countdown, setCountdown] = useState(null);
  const [outroDismissed, setOutroDismissed] = useState(false);
  const [countdownAfterEnded, setCountdownAfterEnded] = useState(false);
  const countdownRef = useRef(null);
  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);
  useEffect(() => {
    setCountdownAfterEnded(false);
  }, [playbackSrc]);

  {/* Time */}
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      const time = vid.currentTime;
      setCurrentTime(time);

      const key = formatProgressStorageKey();

      const duration = vid.duration || 0;
      const tSafe = Math.min(time, Math.max(duration - 0.25, 0));
      const now = Date.now();
      const keyWithPrefix = `watchProgress-${key}`;

      const persistProgress = (t, d) => {
        localStorage.setItem(
          keyWithPrefix,
          JSON.stringify({ t, d, updatedAt: now })
        );
        queueWatchProgressSync({
          showId,
          season,
          episode,
          currentTime: t,
          duration: d,
        });

        window.dispatchEvent(
          new CustomEvent("watchprogress:update", {
            detail: { storageKey: key, t, d },
          })
        );
      };

      setIntroVisible(intro ? (time >= intro.start && time <= intro.end) : false);

      const shouldShowOutroSkip =
        debugOutro ||
        (
          outro &&
          time >= outro.start &&
          !isMovie &&
          !(isLastEpisode && outro.skipTo === "next")
        );

      if (shouldShowOutroSkip && !outroDismissed) {
        setOutroVisible(true);
        if (countdownRef.current === null) setCountdown(10);
        if (duration && !outroProgressResetRef.current) {
          persistProgress(0, duration || 0);
          outroProgressResetRef.current = true;
        }
      } else {
        setOutroVisible(false);
        setCountdown(null);
        setCountdownAfterEnded(false);
        outroProgressResetRef.current = false;
        if (duration) {
          const shouldPersistByTime = now - lastProgressPersistAtRef.current >= 1500;
          const shouldPersistByDelta = Math.abs(tSafe - lastPersistedTimeRef.current) >= 1;
          if (shouldPersistByTime && shouldPersistByDelta) {
            persistProgress(tSafe, duration);
            lastProgressPersistAtRef.current = now;
            lastPersistedTimeRef.current = tSafe;
          }
        }
      }

      if (!shouldShowOutroSkip && outroDismissed) {
        setOutroDismissed(false);
      }
    };


    vid.addEventListener("timeupdate", handleTimeUpdate);
    return () => vid.removeEventListener("timeupdate", handleTimeUpdate);
  }, [intro, outro, showId, season, episode, outroDismissed, isMovie, isLastEpisode]);
  
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const key = formatProgressStorageKey();

    const syncDuration = () => {
      const d = Number(vid.duration || 0);
      if (!d || !Number.isFinite(d)) return;

      let obj = {};
      try { obj = JSON.parse(readProgressRawWithMigration(key) || "{}"); } catch {}
      localStorage.setItem(
        `watchProgress-${key}`,
        JSON.stringify({ ...obj, d, updatedAt: Date.now() })
      );
      flushWatchProgressSync({
        showId,
        season,
        episode,
        currentTime: Number(obj?.t ?? 0),
        duration: d,
      });

      window.dispatchEvent(
        new CustomEvent("watchprogress:update", {
          detail: { storageKey: key, t: obj?.t ?? 0, d },
        })
      );
    };

    vid.addEventListener("loadedmetadata", syncDuration);
    vid.addEventListener("durationchange", syncDuration);
    return () => {
      vid.removeEventListener("loadedmetadata", syncDuration);
      vid.removeEventListener("durationchange", syncDuration);
    };
  }, [showId, season, episode, src]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const key = formatProgressStorageKey();

    const onEnded = () => {
      const d = Number.isFinite(vid.duration) ? vid.duration : 0;

      if (countdownRef.current !== null) {
        setCountdownAfterEnded(true);
      }

      localStorage.setItem(
        `watchProgress-${key}`,
        JSON.stringify({ t: 0, d, updatedAt: Date.now() })
      );
      flushWatchProgressSync({
        showId,
        season,
        episode,
        currentTime: 0,
        duration: d,
      });

      window.dispatchEvent(
        new CustomEvent("watchprogress:update", {
          detail: { storageKey: key, t: 0, d },
        })
      );
    };

    vid.addEventListener("ended", onEnded);
    return () => vid.removeEventListener("ended", onEnded);
  }, [showId, season, episode, src]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const key = formatProgressStorageKey();

    const flushProgress = () => {
      const d = Number(vid.duration || 0);
      if (!d || !Number.isFinite(d)) return;
      const tSafe = Math.min(Number(vid.currentTime || 0), Math.max(d - 0.25, 0));

      localStorage.setItem(
        `watchProgress-${key}`,
        JSON.stringify({ t: tSafe, d, updatedAt: Date.now() })
      );
      flushWatchProgressSync({
        showId,
        season,
        episode,
        currentTime: tSafe,
        duration: d,
      });

      window.dispatchEvent(
        new CustomEvent("watchprogress:update", {
          detail: { storageKey: key, t: tSafe, d },
        })
      );

      lastProgressPersistAtRef.current = Date.now();
      lastPersistedTimeRef.current = tSafe;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushProgress();
      }
    };

    vid.addEventListener("pause", flushProgress);
    vid.addEventListener("seeked", flushProgress);
    window.addEventListener("beforeunload", flushProgress);
    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      vid.removeEventListener("pause", flushProgress);
      vid.removeEventListener("seeked", flushProgress);
      window.removeEventListener("beforeunload", flushProgress);
      window.removeEventListener("pagehide", flushProgress);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showId, season, episode, src]);




  {/* Skipping */}
  const handleSkipIntro = () => {
    if (intro && videoRef.current) videoRef.current.currentTime = intro.end;
  };

const handleSkipOutro = async () => {
  if (outroSkipRef.current) return;
  outroSkipRef.current = true;
  setCountdown(null);
  setOutroVisible(false);

  if (outro?.skipTo === "next") {
    const opts = { source: "outro" };
    if (typeof getSignedEpisodeUrl === "function" || typeof getSignedUrl === "function") {
      const signedUrl = await resolveSignedEpisodeUrl(nextSeason, nextEpisode);

      onSkipToNext?.(nextSeason, nextEpisode, signedUrl, opts);
    } else {
      onSkipToNext?.(nextSeason, nextEpisode, undefined, opts);
    }
  } else {
    if (videoRef.current) {
      videoRef.current.currentTime = outro?.skipTo;
    }
  }
};
const handleSkipOutroRef = useRef(handleSkipOutro);
useEffect(() => {
  handleSkipOutroRef.current = handleSkipOutro;
}, [handleSkipOutro]);

const skippingRef = useRef(false);

const handleNextEpisode = async () => {
  console.log(
    `[${new Date().toISOString()}] handleNextEpisode CLICKED → skippingRef: ${skippingRef.current}, nextSeason: ${nextSeason}, nextEpisode: ${nextEpisode}`
  );

  if (isMovie || isLastEpisode) return;

  if (skippingRef.current) {
    console.log("⛔ Skip blocked (already in progress)");
    return;
  }

  skippingRef.current = true;
  setCountdown(null);
  setOutroVisible(false);

  const targetS = nextSeason;
  const targetE = nextEpisode;

  console.log(`🚀 Initiating skip to → S${targetS}E${targetE}`);

  try {
    if (typeof getSignedEpisodeUrl === "function" || typeof getSignedUrl === "function") {
      const signedUrl = await resolveSignedEpisodeUrl(targetS, targetE);
      onSkipToNext?.(targetS, targetE, signedUrl);
    } else {
      onSkipToNext?.(targetS, targetE);
    }
  } finally {
    setTimeout(() => {
      skippingRef.current = false;
      console.log("✅ Skip lock released");
    }, 400);
  }
};



const handleSkipToPrevious = async () => {
  if (!prevEpisode || prevSeason < 1) return; 

  if (typeof getSignedEpisodeUrl === "function" || typeof getSignedUrl === "function") {
    const signedUrl = await resolveSignedEpisodeUrl(prevSeason, prevEpisode);
    onSkipToNext?.(prevSeason, prevEpisode, signedUrl);
  } else {
    onSkipToNext?.(prevSeason, prevEpisode);
  }
};

  {/* Placeholder Images */}
  const cleanShowId = showId?.replace(/-/g, "");
  const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
  const placeholderPath = `${cloudFrontDomain}/${cleanShowId}/placeholders/season${nextSeason}/S${nextSeason}E${nextEpisode}_${cleanShowId}_placeholder.png`

  { /* Episode Title */}
  let nextTitleRaw = episodeTitles?.[nextSeason]?.[nextEpisode - 1];
  let nextTitleFormatted = nextTitleRaw
    ? nextTitleRaw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : (isMovie ? showId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
              : `Episode ${nextEpisode}`);

  const displayTitleMap = {
    jjk: "Jujutsu Kaisen",
    fmab: "Fullmetal Alchemist: Brotherhood",
    mobpsycho: "Mob Psycho 100",
    neongenesis: "Neon Genesis Evangelion",
    overthegardenwall: "Over The Garden Wall",
    itsalwayssunny: "It's Always Sunny In Philadelphia",
    lovedeathandrobots: "Love, Death & Robots",
    thetwilightzone: "The Twilight Zone",
    theericandreshow: "The Eric Andre Show",
  };
  const cleanedShowKey = (showId || "").replace(/-/g, "").toLowerCase();
  const formattedShowTitle =
    displayTitleMap[cleanedShowKey] ||
    showId?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const [dispS, setDispS] = useState(null);
    const [dispE, setDispE] = useState(null);

    useEffect(() => {
      const parseSE = (url) => {
        try {
          const u = new URL(url);
          const base = u.pathname.split("/").pop() || "";
          const m = base.match(/^S(\d{1,3})E(\d{1,3})/i);
          return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [null, null];
        } catch {
          const base = (url || "").split("/").pop() || "";
          const m = base.match(/^S(\d{1,3})E(\d{1,3})/i);
          return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [null, null];
        }
      };

      const [s, e] = parseSE(playbackSrc);
      setDispS(Number.isFinite(s) ? s : (Number.isFinite(season) ? season : null));
      setDispE(Number.isFinite(e) ? e : (Number.isFinite(episode) ? episode : null));
    }, [playbackSrc, season, episode]);

    const currentTitleRaw = dispS && dispE && episodeTitles?.[dispS]?.[dispE - 1];
    const currentTitleFormatted = currentTitleRaw
      ? currentTitleRaw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      : (dispE != null ? `Episode ${dispE}` : "");

    const displayEpisodeNumber =
      dispS != null && dispE != null
        ? `S${dispS}E${dispE}`
        : (dispE != null ? `E${dispE}` : "");
    const displayTitle = formattedShowTitle;
    const displayEpisodeTitle = currentTitleFormatted;
 

  {/* Auto-skip Countdown */}
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdownAfterEnded(false);
      handleSkipOutroRef.current?.(); // Trigger skip using latest handler state
      return;
    }
  
    if (!isPlaying && !countdownAfterEnded) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, isPlaying, countdownAfterEnded]);


  {/* Skip ahead buttons */}
  const skipTriggeredRef = useRef(false);
  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + 15,
        videoRef.current.duration
      );
    }
  };
  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        videoRef.current.currentTime - 15,
        0
      );
    }
  };
  const restartVideo = async () => {
    const vid = videoRef.current;
    if (!vid) return;

    const wasPlaying = !vid.paused && !vid.ended;
    setCountdown(null);
    setOutroVisible(false);
    setOutroDismissed(false);
    setIsPreviewing(false);
    setPreviewImage(null);
    outroProgressResetRef.current = false;
    vid.currentTime = 0;

    if (wasPlaying) {
      try {
        await vid.play();
      } catch {
        
      }
    }
  };

  const handleRestartClick = async (e) => {
    // Keep keyboard focus on the player flow so spacebar controls play/pause.
    e.currentTarget.blur();
    await restartVideo();
  };

  {/* Frame Preview Handling */}
  const [isPreviewing, setIsPreviewing] = useState(false);
  const generateFramePreview = async (time) => {
    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous'; 
    try {
      tempVideo.src = new URL(playbackSrc, window.location.origin).toString();
    } catch {
      tempVideo.src = playbackSrc;
    }
    tempVideo.preload = 'auto';
    tempVideo.muted = true;
    return new Promise((resolve, reject) => {
      tempVideo.addEventListener('loadedmetadata', () => {
        tempVideo.currentTime = Math.min(time, tempVideo.duration);
      }, { once: true });
      tempVideo.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 854;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          resolve(dataUrl);
        } catch (err) {
          console.warn("❌ Canvas draw failed (CORS issue?)", err);
          reject(err);
        }
      }, { once: true });
      tempVideo.addEventListener('error', (e) => {
        console.error("❌ Preview video load error", e);
        reject(e);
      });
    });
  };
  const [previewImage, setPreviewImage] = useState(null);
  const handleSkipPreview = async (direction) => {
    if (!videoRef.current) return;
  
    const newTime = Math.min(
      Math.max(videoRef.current.currentTime + (direction === 'forward' ? 15 : -15), 0),
      videoRef.current.duration
    );
  
    const preview = await generateFramePreview(newTime);
    setPreviewImage(preview);
    setIsPreviewing(true); 
  
    videoRef.current.currentTime = newTime;
    videoRef.current.pause(); 
  };
  useEffect(() => {
    if (isPlaying && isPreviewing) {
      setPreviewImage(null);
      setIsPreviewing(false);
    }
  }, [isPlaying, isPreviewing]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSkipPreview("forward");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSkipPreview("backward");
      } else if (e.key === "Enter" && isPreviewing) {
        e.preventDefault();
        videoRef.current.play();
        setIsPreviewing(false);
        setPreviewImage(null);
      } else if (e.key === " " && !isPreviewing) {
        e.preventDefault();
        togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewing]);


  {/* Next ... */}
  const [isNextHovered, setNextHovered] = useState(false);
  const clickTimeoutRef = useRef(null);

  {/* Single/Double Click Video Screen */}
  const handleSingleClick = () => {
    if (clickTimeoutRef.current) return;
    clickTimeoutRef.current = setTimeout(() => {
      togglePlay();
      clickTimeoutRef.current = null;
    }, 200); 
  };
  const handleDoubleClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    toggleFullscreen();
  };

  {/* Mute */}
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = toggleMute;
    }
  }, [toggleMute]);


  {/* Controls Visiblity */}
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const inactivityTimer = useRef(null);
  useEffect(() => {
    const resetInactivity = () => {
      setControlsVisible(true);
      setCursorVisible(true);
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      inactivityTimer.current = setTimeout(() => {
        if (isPlaying && !isPreviewing) {
          setControlsVisible(false);
          setCursorVisible(false); 
        }
      }, 3000);
    };
  
    window.addEventListener("mousemove", resetInactivity);
    resetInactivity(); 
    return () => {
      window.removeEventListener("mousemove", resetInactivity);
      clearTimeout(inactivityTimer.current);
    };
  }, [isPlaying, isPreviewing]);

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(hasSubtitles);
  const [activeSubtitleCues, setActiveSubtitleCues] = useState([]);
  const subtitleTrackSrc = getSubtitleTrackSrc({ showId, season, episode });

  useEffect(() => {
  setSubtitlesEnabled(hasSubtitles);
  setActiveSubtitleCues([]);
  }, [hasSubtitles, playbackSrc]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const track = vid.textTracks[0];
    if (!track) return;

    if (!subtitlesEnabled) {
      track.mode = "disabled";
      setActiveSubtitleCues([]);
      return;
    }

    track.mode = "hidden"; 
    const handleCueChange = () => {
      const activeCues = track.activeCues;
      if (!activeCues || activeCues.length === 0) {
        setActiveSubtitleCues([]);
        return;
      }

      const normalized = Array.from(activeCues)
        .map((cue) => ({
          text: (cue?.text || "").trim(),
          startTime: Number(cue?.startTime || 0),
        }))
        .filter((cue) => cue.text)
        .sort((a, b) => a.startTime - b.startTime);

      setActiveSubtitleCues(normalized);
    };

    track.addEventListener("cuechange", handleCueChange);
    handleCueChange();

    return () => {
      track.removeEventListener("cuechange", handleCueChange);
    };
  }, [playbackSrc, subtitlesEnabled]);



  {/* Loading Pulse State */}
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!playbackSrc) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true); 
  }, [playbackSrc]);
  const clearStallWatchdog = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };
const attemptPlaybackRecovery = async (reason = "stall") => {
    if (recoveryInFlightRef.current) return;
    if (
      (!isMovie && typeof getSignedEpisodeUrl !== "function" && typeof getSignedUrl !== "function") ||
      (isMovie && typeof getSignedUrl !== "function")
    ) {
      return;
    }

    const now = Date.now();
    if (!recoveryWindowStartRef.current || now - recoveryWindowStartRef.current > recoveryWindowMs) {
      recoveryWindowStartRef.current = now;
      recoveryAttemptCountRef.current = 0;
    }
    if (recoveryAttemptCountRef.current >= recoveryMaxAttempts) return;

    let currentKey = isMovie
      ? (cleanIdForS3 ? `${cleanIdForS3}/${cleanIdForS3}.mp4` : "")
      : "";
    const hasMissingTitleInKey =
      !!cleanIdForS3 && currentKey.endsWith(`_${cleanIdForS3}_.mp4`);
    if (!currentKey || hasMissingTitleInKey) {
      try {
        const candidate = new URL(playbackSrc, window.location.origin).pathname
          .replace(/^\/+/, "");
        if (candidate.endsWith(".mp4")) {
          currentKey = decodeURIComponent(candidate);
        }
      } catch {
        // Ignore fallback parsing errors; no safe key to refresh.
      }
    }
    if (!currentKey) return;

    recoveryInFlightRef.current = true;
    recoveryAttemptCountRef.current += 1;
    const currentTimeSnapshot = Number(videoRef.current?.currentTime || 0);
    try {
      const refreshedUrl = isMovie
        ? await getSignedUrl(currentKey)
        : await resolveSignedEpisodeUrl(actualSeason, actualEpisode);
      if (!refreshedUrl) {
        setIsLoading(false);
        setMediaNotFound(true);
        clearStallWatchdog();
        return;
      }
      intendedResumeTimeRef.current = currentTimeSnapshot;
      setPlaybackSrc(refreshedUrl);
      setIsLoading(true);
      console.warn(`Playback recovery attempt (${reason})`, {
        attempt: recoveryAttemptCountRef.current,
      });
    } catch (err) {
      console.warn("Playback recovery failed:", err);
    } finally {
      recoveryInFlightRef.current = false;
    }
  };
  const armStallWatchdog = () => {
    clearStallWatchdog();
    stallTimerRef.current = setTimeout(() => {
      attemptPlaybackRecovery("watchdog-timeout");
    }, 8000);
  };
  const handleMediaLoadStart = () => {
    setIsLoading(true);
    armStallWatchdog();
  };
  const handleMediaCanPlay = () => {
    setIsLoading(false);
    setMediaNotFound(false);
    clearStallWatchdog();
  };
  const handleMediaError = () => {
    const canRecover = isMovie
      ? typeof getSignedUrl === "function"
      : typeof getSignedEpisodeUrl === "function" || typeof getSignedUrl === "function";
    if (!canRecover || recoveryAttemptCountRef.current >= recoveryMaxAttempts) {
      setIsLoading(false);
      setMediaNotFound(true);
      clearStallWatchdog();
      return;
    }
    setIsLoading(true);
    clearStallWatchdog();
    attemptPlaybackRecovery("media-error");
  };
  useEffect(() => () => clearStallWatchdog(), []);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);


  {/* Stop Countdown */}
  const cancelOutroCountdown = () => {
    setCountdown(null);
    setOutroVisible(false);
    setOutroDismissed(true);
    setCountdownAfterEnded(false);
    if (debugOutro) setDebugOutroDismissed(true);
    outroSkipRef.current = false; 
  };
  const outroCountdownMax = 10;
  const showOutroCta = (outroVisible || (debugOutro && !debugOutroDismissed)) && !isMovie && !isLastEpisode;
  const [outroSweepProgress, setOutroSweepProgress] = useState(0);
  const outroSweepPercent = Math.max(0, Math.min(outroSweepProgress, 1)) * 100;
  const outroSweepElapsedMsRef = useRef(0);
  const outroSweepLastTsRef = useRef(null);
  const outroSweepActiveRef = useRef(false);
  useEffect(() => {
    if (showOutroCta) {
      if (!outroSweepActiveRef.current) {
        outroSweepElapsedMsRef.current = 0;
        outroSweepLastTsRef.current = null;
        setOutroSweepProgress(0);
        outroSweepActiveRef.current = true;
      }
      return;
    }
    outroSweepElapsedMsRef.current = 0;
    outroSweepLastTsRef.current = null;
    setOutroSweepProgress(0);
    outroSweepActiveRef.current = false;
  }, [showOutroCta]);
  useEffect(() => {
    if (!showOutroCta || !isPlaying) {
      outroSweepLastTsRef.current = null;
      return;
    }

    let rafId = 0;
    const maxMs = outroCountdownMax * 1000;
    const step = (ts) => {
      if (outroSweepLastTsRef.current == null) {
        outroSweepLastTsRef.current = ts;
      }
      const dt = ts - outroSweepLastTsRef.current;
      outroSweepLastTsRef.current = ts;

      outroSweepElapsedMsRef.current = Math.min(
        maxMs,
        outroSweepElapsedMsRef.current + Math.max(0, dt)
      );
      setOutroSweepProgress(outroSweepElapsedMsRef.current / maxMs);

      if (outroSweepElapsedMsRef.current < maxMs) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [showOutroCta, isPlaying, outroCountdownMax]);



  return (
  <div
    ref={containerRef}
    tabIndex={0}
    className={`relative w-full h-full outline-none focus:outline-none ${cursorVisible ? "cursor-pointer" : "cursor-none"}`} 
  >
    <video
      key={playbackSrc}
      ref={videoRef}
      className={`w-full h-full object-contain rounded-2xl z-[5] ${isLoading ? "bg-black/60 backdrop-blur-2xl" : ""}`}
      preload="auto"
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      onLoadStart={handleMediaLoadStart}
      onWaiting={handleMediaLoadStart}
      onSeeking={handleMediaLoadStart}
      onStalled={handleMediaLoadStart}
      onCanPlay={handleMediaCanPlay}
      onSeeked={handleMediaCanPlay}
      onPlaying={handleMediaCanPlay}
      onError={handleMediaError}
    >
      <source src={playbackSrc} type="video/mp4" />

      {subtitleTrackSrc && (
        <track
          src={subtitleTrackSrc}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}


      Your browser does not support the video tag.
    </video>

    {mediaNotFound && (
      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="text-white/90 text-xl font-medium">
          Media Not Found. Text me and I will fix :)
        </div>
      </div>
    )}

    {!mediaNotFound && isLoading && (
      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        {spinner}
      </div>
    )}    

    <AnimatePresence>
      {isFullscreen && controlsVisible && (
        <motion.button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRestartClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileHover={{ scale: 1.14 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed top-8 left-8 text-white flex items-center justify-center cursor-pointer z-[9999] pointer-events-auto"
          aria-label="Restart video"
          title="Restart video"
        >
          {restartIcon}
        </motion.button>
      )}
    </AnimatePresence>

    {activeSubtitleCues.length > 0 && subtitlesEnabled && (
      <div className="absolute bottom-20 2xl:bottom-24 w-full text-center">
        <div
          className={`
            movie-subtitle whitespace-pre-line
            ${isFullscreen ? "text-[40px]" : "text-[30px]"} 
            transition-all duration-300
          `}
        >
          {activeSubtitleCues[0]?.text}
        </div>
      </div>
    )}

    {activeSubtitleCues.length > 1 && subtitlesEnabled && (
      <div className="absolute top-20 2xl:top-24 w-full text-center">
        <div
          className={`
            movie-subtitle whitespace-pre-line
            ${isFullscreen ? "text-[40px]" : "text-[30px]"} 
            transition-all duration-300
          `}
        >
          {activeSubtitleCues
            .slice(1)
            .map((cue) => cue.text)
            .join("\n")}
        </div>
      </div>
    )}

    {previewImage && (
      <div className="absolute top-0 left-0 rounded-2xl w-full h-full bg-black/60 backdrop-blur pointer-events-none">
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50 bg-white/60 p-1 rounded">
          <img src={previewImage} alt="Preview Frame" className="w-[350px] h-[200px] object-cover rounded" />
        </div>
      </div>
    )}

    <AnimatePresence>
      {controlsVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/75 rounded-2xl to-transparent px-6 pt-5 2xl:pt-10 pb-12 text-right elms-font uppercase pointer-events-none"
        >
          <div className="text-white text-[16px] 2xl:text-[24px] font-semibold tracking-wide leading-tight">
            {displayTitle}
          </div>
          {!isMovie && (
            <div className="mt-1 text-white/75 text-[13px] 2xl:text-[18px] font-medium tracking-wide leading-tight">
              {displayEpisodeNumber}
              {displayEpisodeTitle ? ` • ${displayEpisodeTitle}` : ""}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>

  
  <AnimatePresence>
    {controlsVisible && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 right-0 z-40 px-4 pt-44 rounded-2xl bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
      >
        <div className="relative bottom-8">
          {/* Progress Bar */}
          <div className="relative z-40 mb-5 pointer-events-auto">
            <ProgressBar videoRef={videoRef} src={playbackSrc} controlsVisible={controlsVisible} />
          </div>

          <div className="relative z-30 grid grid-cols-[1fr_auto_1fr] items-center text-white pt-1 pointer-events-auto">
            <div />
            <div className="justify-center gap-5 flex items-center">

              {!isMovie && !isFirstEpisode && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.18, y: -1 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="cursor-pointer focus-visible:outline-none text-white/90 hover:text-white"
                  onClick={handleSkipToPrevious}
                >
                  <span>{prevepIcon}</span>
                </motion.button>
              )}

                <motion.button
                  onClick={skipBackward} 
                  className="cursor-pointer focus-visible:outline-none"
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.14, y: -1 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <img src={SkipBack} alt="Skip Forward" className="size-10" />
                </motion.button>

                <div className="relative flex items-center">
                  <PlayPauseButton isPlaying={isPlaying} onToggle={togglePlay} />
                </div>

                <motion.button
                  onClick={skipForward} 
                  className="cursor-pointer focus-visible:outline-none"
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.14, y: -1 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <img src={SkipForward} alt="Skip forward" className="size-10" />
                </motion.button>

                {!isMovie && !isLastEpisode && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.18, y: -1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="cursor-pointer focus-visible:outline-none text-white/90 hover:text-white"
                    onClick={handleNextEpisode}
                  >
                    <span>{nextepIcon}</span>
                  </motion.button>
                )}
            </div>
            <div
              className={`justify-self-end grid items-center justify-items-center gap-3 ${
                hasSubtitles ? "grid-cols-3 min-w-[144px]" : "grid-cols-2 min-w-[96px]"
              }`}
            >
              {/* Volume Button */}
              <div
                className="relative flex h-10 w-10 items-center justify-center"
                onMouseEnter={() => setvolumeHovered(true)}
                onMouseLeave={() => setvolumeHovered(false)}
              >
                {/* Volume Bar */}
                <AnimatePresence mode="wait">
                  {volumeHovered && (
                    <motion.div
                      className="absolute bottom-full left-1/2 z-[120] -translate-x-1/2 cursor-pointer mb-3"
                      initial={{ opacity: 0, y: 10, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.94 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <div className="flex justify-center rounded-lg border border-white/15 bg-black/55 px-2 py-2 backdrop-blur-md">
                        <VolumeSlider
                          volume={volume}
                          muted={toggleMute}
                          setVolume={(v) => {
                            setVolume(v);
                            if (videoRef.current) {
                              videoRef.current.volume = v;
                              if (v > 0 && toggleMute) {
                                setToggleMute(false);
                                videoRef.current.muted = false;
                              }
                            }
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

                {/* Volume Icon */}
                {toggleMute ? (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.14, y: -1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="relative z-30 flex h-10 w-10 items-center justify-center cursor-pointer focus-visible:outline-none text-white/90 hover:text-white"
                    onClick={() => {
                      setToggleMute(false);
                      if (videoRef.current) videoRef.current.muted = false;
                    }}
                  >
                    {mutedIcon}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.14, y: -1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="relative z-30 flex h-10 w-10 items-center justify-center cursor-pointer focus-visible:outline-none text-white/90 hover:text-white"
                    onClick={() => {
                      setToggleMute(true);
                      if (videoRef.current) videoRef.current.muted = true;
                    }}
                  >
                    {volumeIcon}
                  </motion.button>
                )}

              </div>

              {/* Subtitles */}
              {hasSubtitles && (
                <motion.button
                  whileHover={{ scale: 1.14, }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={() => setSubtitlesEnabled((v) => !v)}
                  className={`flex items-center justify-center text-white cursor-pointer transition-colors text-2xl font-bold elms-font
                    ${subtitlesEnabled
                      ? "text-white/90 hover:text-white"
                      : "text-white/40 hover:text-white/70"
                    }
                  `}
                >
                  CC
                </motion.button>
              )}
            

              {/* Fullscreen */}
              <motion.button
                whileHover={{ scale: 1.14, y: -1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={toggleFullscreen}
                className="flex h-10 w-10 items-center justify-center cursor-pointer focus-visible:outline-none text-white/90 hover:text-white"
              >
                {isFullscreen ? fullscreenexitIcon : fullscreenIcon}
              </motion.button>
            </div>
          </div>
        </div>  
      </motion.div>
    )}
    </AnimatePresence>

    {/* Skip Intro */}
    {introVisible && (
      <div className="absolute bottom-42 right-4 flex gap-2 text-black z-30">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onFocus={(e) => e.currentTarget.blur()}
          className="bg-black/20 backdrop-blur-sm border text-white/90 hover:text-white/70 transition-colors border-white/10 inset-shadow-2xs inset-shadow-white/20 bg-opacity-90 px-5 py-3 rounded-lg text-sm font-semibold cursor-pointer tracking-wide focus:outline-none"
          onClick={handleSkipIntro}
        >
          Skip Intro
        </motion.button>
      </div>
    )}

    {/* Skip Outro */}
    <AnimatePresence>
      {showOutroCta && (
        <motion.div
          className="absolute bottom-42 right-4 flex flex-col gap-2 text-black z-30 group bg-black/20 border-1 border-white/10 backdrop-blur-2xl p-2 rounded-lg"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: isNextHovered ? 1.03 : 1,
          }}
          whileTap={{ scale: 0.9 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onHoverStart={() => setNextHovered(true)}
          onHoverEnd={() => setNextHovered(false)}
        >
          <motion.div
            className="w-48 h-24 bg-cover bg-center rounded-lg cursor-pointer"
            style={{ backgroundImage: `url(${placeholderPath})` }}
            onClick={handleSkipOutro}
          >
          </motion.div>
          <div className="relative flex flex-row justify-between items-center bg-transparent rounded-md px-2 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-md bg-white"
              style={{ width: `${outroSweepPercent}%` }}
            />
            <div className="relative z-10 flex w-full items-center justify-between mix-blend-difference">
              <motion.span
                className="tracking-widest text-md font-semibold text-white"
                onClick={handleSkipOutro}
              >
                Next Episode
              </motion.span>
              <motion.span
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                onClick={cancelOutroCountdown}
                className="text-white"
              >
                {closeIcon}
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    
  </div>
  );
};

export default Show;
