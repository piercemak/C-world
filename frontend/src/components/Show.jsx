import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayPauseButton from "./framercomponents/PlayPauseButton";
import ProgressBar from "./ProgressBar.jsx";
import VolumeSlider from "./VolumeSlider.jsx";
import SkipForward from '../assets/icons/SkipForward.svg'
import SkipBack from '../assets/icons/SkipBack.svg'
import { getWatchProgress, saveWatchProgress, getUserVolume, saveUserVolume } from "./api.js"; 



const Show = ({ src, delayPlay = 0, onSkipToNext, showId, season, episode, skipIntro = false, hasSubtitles = false, episodeTitles, getSignedUrl = {} }) => {


  const containerRef = useRef(null)
  const videoRef = useRef(null);
  const spinner = <svg xmlns="http://www.w3.org/2000/svg" className="size-14" viewBox="0 0 200 200"><radialGradient id="a12" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="#FCFAFF"></stop><stop offset=".3" stop-color="#FCFAFF" stop-opacity=".9"></stop><stop offset=".6" stop-color="#FCFAFF" stop-opacity=".6"></stop><stop offset=".8" stop-color="#FCFAFF" stop-opacity=".3"></stop><stop offset="1" stop-color="#FCFAFF" stop-opacity="0"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a12)" stroke-width="15" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="#FCFAFF" stroke-width="15" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
  
  const fullscreenIcon = <svg xmlns="http://www.w3.org/2000/svg"  height="16" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/></svg>
  const fullscreenexitIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"/></svg>
  const volumeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12zm3.025 4a4.5 4.5 0 0 1-1.318 3.182L10 10.475A3.5 3.5 0 0 0 11.025 8 3.5 3.5 0 0 0 10 5.525l.707-.707A4.5 4.5 0 0 1 12.025 8"/></svg>
  const mutedIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0"/></svg>
  const nextepIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0z"/></svg>
  const prevepIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0z"/></svg>


  {/* Volume Control */}
  const [volumeHovered, setvolumeHovered] = useState(false);
  const [toggleMute, setToggleMute] = useState(false);
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    getUserVolume().then(setVolume);
  }, []);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    saveUserVolume(volume);
  }, [volume]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
  
    const handleVolumeChange = () => {
      const newVolume = vid.volume;
      setVolume(newVolume);
      saveUserVolume(newVolume);
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
  }, [src]); 


  {/* Fullscreen Toggle */}
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
  
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  useEffect(() => {
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

  
  const pathParts = src.split("/");
  const showKey = showId?.replace(/-/g, "").toLowerCase();
  const NO_AUTO_SKIP_INTRO_SHOWS = new Set(["jjk", "cyberpunk", "severance", "pluribus"]);
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
      1:4
    } 
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
          2: { intro: { start: 455.0, end: 477.0 }, outro: { start: 3600, skipTo: "next" } },
          3: { intro: { start: 385.0, end: 407.0 }, outro: { start: 2516, skipTo: "next" } },
          4: { intro: { start: 384.0, end: 406.0 }, outro: { start: 2490, skipTo: "next" } },
        }
      }
  },   


  };

const getActiveSkipTime = () => {
  const perEp = skipTimes[showKey]?.seasons?.[actualSeason]?.[actualEpisode];
  const defaultTimes = perEp || skipTimes[showKey]?.default;

  if (!defaultTimes) return { intro: null, outro: null };
  const rules = perEp ? [] : (skipTimes[showKey]?.rules || []);
  const matched = rules.find(rule => rule.condition(actualSeason, actualEpisode));
  return {
    intro: (matched?.intro ?? defaultTimes?.intro) || null,
    outro: (matched?.outro ?? defaultTimes?.outro) || null,
  };
};
const { intro, outro } = getActiveSkipTime();
const hasIntro = !!(intro && Number.isFinite(intro.end));

const [savedProgress, setSavedProgress] = useState(0);
useEffect(() => {
  if (season != null && episode != null) {
    getWatchProgress(showId, season, episode).then(setSavedProgress);
  }
}, [showId, season, episode]);

  useEffect(() => {
    const vid = videoRef.current;
    console.log("🎥 Video ref:", vid);
    console.log("🎬 Video src:", src);
    if (!vid) return;
    setAutoSkipDone(false); 

    const key = season === null || episode === null
      ? showId
      : `${showId}-S${season}-E${episode}`;

    const startPlayback = async () => {
      try {
        vid.load();           
        vid.volume = volume;

        console.log("▶️ Attempting to play video...");
        const shouldStartFromBeginning = savedProgress >= (outro?.start ?? Infinity);

        const shouldAutoSkipIntro =
          skipIntro &&
          hasIntro &&
          !NO_AUTO_SKIP_INTRO_SHOWS.has(showKey);

        const startTime = shouldAutoSkipIntro
          ? Number(intro.end) || 0
          : (shouldStartFromBeginning ? 0 : savedProgress);

        vid.currentTime = startTime;

        await vid.play();

        console.log("🚩 skipIntro flag:", skipIntro);
        console.log("🎯 intro skip time:", intro?.end);

        if (shouldAutoSkipIntro) {
          setAutoSkipDone(true);
        }   
      } catch (err) {
        console.warn("Autoplay blocked:", err);
      }
    };
    startPlayback();
  }, [src, skipIntro, intro?.end]);
  const [countdown, setCountdown] = useState(null);

  {/* Time */}
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      const time = vid.currentTime;
      setCurrentTime(time);

      const key = season === null || episode === null
        ? `${showId}` // movie 
        : `${showId}-S${season}-E${episode}`; // show 
   

      setIntroVisible(intro ? (time >= intro.start && time <= intro.end) : false);

      const duration = vid.duration || 0;

      if (time >= outro?.start) {
        setOutroVisible(true);
        if (countdown === null) setCountdown(10);
        localStorage.removeItem(`watchProgress-${key}`);
      } else {
        setOutroVisible(false);
        setCountdown(null);

        if (outro && time >= outro.start + 5) {
          saveWatchProgress(showId, season, episode, 0);
        } else {
          saveWatchProgress(showId, season, episode, time);
        }
      }
    };

    vid.addEventListener("timeupdate", handleTimeUpdate);
    return () => vid.removeEventListener("timeupdate", handleTimeUpdate);
  }, [intro, outro, countdown, showId, season, episode]);

  {/* Skipping */}
  const handleSkipIntro = () => {
    if (intro && videoRef.current) videoRef.current.currentTime = intro.end;
  };

const handleSkipOutro = async () => {
  if (outro?.skipTo === "next") {
    const opts = { source: "outro" };
    if (getSignedUrl && typeof getSignedUrl === "function") {
      const cleanId = showId.replace(/-/g, "");
      const seasonStr = `S${String(nextSeason).padStart(2, "0")}`;
      const episodeStr = `E${String(nextEpisode).padStart(2, "0")}`;
      const titleRaw = episodeTitles?.[nextSeason]?.[nextEpisode - 1] || "";
      const s3Key = `${cleanId}/season${nextSeason}-mp4s/${seasonStr}${episodeStr}_${cleanId}_${titleRaw}.mp4`;
      const signedUrl = await getSignedUrl(s3Key);

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
    if (typeof getSignedUrl === "function") {
      const cleanId = showId.replace(/-/g, "");
      const seasonStr = `S${String(targetS).padStart(2, "0")}`;
      const episodeStr = `E${String(targetE).padStart(2, "0")}`;
      const safeTitle = (episodeTitles?.[targetS]?.[targetE - 1] || "").replace(/\s+/g, "_");
      const s3Key = `${cleanId}/season${targetS}-mp4s/${seasonStr}${episodeStr}_${cleanId}_${safeTitle}.mp4`;
      const signedUrl = await getSignedUrl(s3Key);
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

  if (getSignedUrl && typeof getSignedUrl === "function") {
    const cleanId = showId.replace(/-/g, "");
    const seasonStr = `S${String(prevSeason).padStart(2, "0")}`;
    const episodeStr = `E${String(prevEpisode).padStart(2, "0")}`;
    const titleRaw = episodeTitles?.[prevSeason]?.[prevEpisode - 1] || "";
    const s3Key = `${cleanId}/season${prevSeason}-mp4s/${seasonStr}${episodeStr}_${cleanId}_${titleRaw}.mp4`;
    const signedUrl = await getSignedUrl(s3Key);
    onSkipToNext?.(prevSeason, prevEpisode, signedUrl);
  } else {
    onSkipToNext?.(prevSeason, prevEpisode);
  }
};

const isFirstEpisode = currS === 1 && currE === 1;
const isLastEpisode =
  currE === (episodeTitles?.[currS]?.length || 0) &&
  currS === Object.keys(episodeTitles || {}).length;


  {/* Placeholder Images */}
  const isMovie = season === null && episode === null;
  const cleanShowId = showId?.replace(/-/g, "");
  const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
  const placeholderPath = `${cloudFrontDomain}/${cleanShowId}/placeholders/season${nextSeason}/S${nextSeason}E${nextEpisode}_${cleanShowId}_placeholder.png`

  { /* Episode Title */}
  let nextTitleRaw = episodeTitles?.[nextSeason]?.[nextEpisode - 1];
  let nextTitleFormatted = nextTitleRaw
    ? nextTitleRaw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : (isMovie ? showId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
              : `Episode ${nextEpisode}`);

  const formattedShowTitle = showId
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

      const [s, e] = parseSE(src);
      setDispS(Number.isFinite(s) ? s : (Number.isFinite(season) ? season : null));
      setDispE(Number.isFinite(e) ? e : (Number.isFinite(episode) ? episode : null));
    }, [src, season, episode]);

    const currentTitleRaw = dispS && dispE && episodeTitles?.[dispS]?.[dispE - 1];
    const currentTitleFormatted = currentTitleRaw
      ? currentTitleRaw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      : (dispE != null ? `Episode ${dispE}` : "");

    const displayEpisodeNumber = dispE != null ? `E${dispE}` : "";
    const displayTitle = formattedShowTitle;
    const displayEpisodeTitle = currentTitleFormatted;
 

  {/* Auto-skip Countdown */}
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      handleSkipOutro(); // Trigger the skip
      return;
    }
  
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, isPlaying]);


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

  {/* Frame Preview Handling */}
  const [isPreviewing, setIsPreviewing] = useState(false);
  const generateFramePreview = async (time) => {
    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous'; 
    tempVideo.src = new URL(src).toString();
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
  const [subtitleText, setSubtitleText] = useState("");

  useEffect(() => {
  setSubtitlesEnabled(hasSubtitles);
  setSubtitleText("");
  }, [hasSubtitles, src]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const track = vid.textTracks[0];
    if (!track) return;

    if (!subtitlesEnabled) {
      track.mode = "disabled";
      setSubtitleText("");
      return;
    }

    track.mode = "hidden"; 

    const handleCueChange = () => {
      const activeCues = track.activeCues;
      if (activeCues.length > 0) {
        setSubtitleText(activeCues[0].text);
      } else {
        setSubtitleText("");
      }
    };

    track.addEventListener("cuechange", handleCueChange);

    return () => {
      track.removeEventListener("cuechange", handleCueChange);
    };
  }, [src]);

  {/* Loading Pulse State */}
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setIsLoading(true); 
  }, [src]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  return (
  <div
    ref={containerRef}
    tabIndex={0}
    className={`relative w-full h-full outline-none focus:outline-none ${cursorVisible ? "cursor-pointer" : "cursor-none"}`} 
  >
    <video
      key={src}
      ref={videoRef}
      className={`w-full h-full object-contain rounded-2xl z-[5] ${isLoading ? "animate-pulse bg-black/60" : ""}`}
      preload="auto"
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      onCanPlay={() => setIsLoading(false)}
    >
      <source src={src} type="video/mp4" />

      {showId === "perfect-blue" && (
        <track
          src={`/videos/perfectblue/perfectblue.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "paprika" && (
        <track
          src={`/videos/paprika/paprikaSub.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "neon-genesis" && season && episode && (
        <track
          src={`/subtitles/neongenesis/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "mob-psycho" && season && episode && (
        <track
          src={`/subtitles/mobpsycho/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "fmab" && season && episode && (
        <track
          src={`/subtitles/fmab/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )} 

      {showId === "jjk" && season && episode && (
        <track
          src={`/subtitles/jjk/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}                    

      {showId === "the-vanishing" && (
        <track
          src={`/videos/thevanishing/thevanishing_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "ghost-in-the-shell" && (
        <track
          src={`/videos/ghostintheshell/ghostintheshell_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "tokyo-godfathers" && (
        <track
          src={`/videos/tokyogodfathers/tokyogodfathers_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}  

      {showId === "cyberpunk" && season && episode && (
        <track
          src={`/subtitles/cyberpunk/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )} 

      {showId === "solaris" && (
        <track
          src={`/videos/solaris/solaris_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}

      {showId === "demons" && (
        <track
          src={`/videos/demons/demons_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}     

      {showId === "severance" && season && episode && (
        <track
          src={`/subtitles/severance/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}     

      {showId === "pluribus" && season && episode && (
        <track
          src={`/subtitles/pluribus/season${season}/S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`}
          kind="subtitles"
          srcLang="en"
          label="English"
        />
      )}     

      Your browser does not support the video tag.
    </video>

    {isLoading && (
      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        {spinner}
      </div>
    )}    

    {subtitleText && subtitlesEnabled && (
      <div className="absolute bottom-20 2xl:bottom-24 w-full text-center">
        <div
          className={`
            movie-subtitle 
            ${isFullscreen ? "text-[40px]" : "text-[30px]"} 
            transition-all duration-300
          `}
        >
          {subtitleText}
        </div>
      </div>
    )}  

    {previewImage && (
      <div className="absolute top-0 left-0 rounded-2xl w-full h-full bg-black/60 backdrop-blur">
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50 bg-white/60 p-1 rounded">
          <img src={previewImage} alt="Preview Frame" className="w-[350px] h-[200px] object-cover rounded" />
        </div>
      </div>
    )}

  
  <AnimatePresence>
    {controlsVisible && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 right-0 z-20 px-4 pt-44 rounded-2xl bg-gradient-to-t from-black/80 to-transparent pointer-events-auto"
      >
        <div className="relative bottom-8">
          {/* Progress Bar */}
          <div className="flex-grow bottom-4 relative">
            <ProgressBar videoRef={videoRef} src={src} controlsVisible={controlsVisible} />
          </div>

          <div className="flex w-full items-center gap-4 text-white relative ">

          <div className="flex flex-wrap text-white absolute items-center max-w-[40%] leading-none">
            <span className="font-bold italic poppinsfont text-[14px]">{displayTitle}</span>
            {!isMovie && (
              <>
                <span className="ml-[6px] text-[14px] font-extralight">{displayEpisodeNumber}</span>
                <span className="mx-2">-</span>
                <span className="text-[14px] font-extralight tracking-wide">{displayEpisodeTitle}</span>
              </>
            )}
          </div>

            {/* Play/Pause */}
              <div className="w-full justify-center gap-4 flex items-center relative left-8">

              {!isMovie && !isFirstEpisode && (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleSkipToPrevious}
                >
                  <span>{prevepIcon}</span>
                </motion.div>
              )}

                <motion.div onClick={skipBackward} 
                  className="cursor-pointer focus-visible:outline-none"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <img src={SkipBack} alt="Skip Forward" className="size-7" />
                </motion.div>

                  <div className="relative flex items-center">
                    <PlayPauseButton isPlaying={isPlaying} onToggle={togglePlay} />
                  </div>

                <motion.div onClick={skipForward} 
                  className="cursor-pointer focus-visible:outline-none"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <img src={SkipForward} alt="Skip forward" className="size-7" />
                </motion.div>

                {!isMovie && !isLastEpisode && (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={handleNextEpisode}
                  >
                    <span>{nextepIcon}</span>
                  </motion.div>
                )}

              </div>


            <div className="flex flex-row gap-2 ">
              {/* Volume Button */}
              <div
                className="relative flex flex-col items-center"
                onMouseEnter={() => setvolumeHovered(true)}
                onMouseLeave={() => setvolumeHovered(false)}
              >
                {/* Volume Bar */}
                <AnimatePresence mode="wait">
                  {volumeHovered && (
                    <motion.div
                      className="absolute bottom-12 right-[2px] w-8 h-10 z-20 cursor-pointer"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 3 }}
                      exit={{ scaleY: 0 }}
                      transition={{ duration: 1.0, type: "spring", bounce: 0.25 }}
                      originY={0} // grow from bottom only
                    >
                      <div className="w-full h-full flex justify-center">  
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
                  <button
                    className="relative z-30 cursor-pointer focus-visible:outline-none"
                    onClick={() => {
                      setToggleMute(false);
                      if (videoRef.current) videoRef.current.muted = false;
                    }}
                  >
                    {mutedIcon}
                  </button>
                ) : (
                  <button
                    className="realtive z-30 cursor-pointer focus-visible:outline-none"
                    onClick={() => {
                      setToggleMute(true);
                      if (videoRef.current) videoRef.current.muted = true;
                    }}
                  >
                    {volumeIcon}
                  </button>
                )}

              </div>

              {/* Subtitles */}
              {hasSubtitles && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSubtitlesEnabled((v) => !v)}
                  className={` text-white cursor-pointer transition-colors mr-2 text-lg font-bold elms-font
                    ${subtitlesEnabled
                      ? "text-white/90 border-white hover:text-white/80"
                      : "text-white/40 border-white/40 hover:text-white/50"
                    }
                  `}
                >
                  CC
                </motion.button>
              )}
            

              {/* Fullscreen */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleFullscreen}
                className="cursor-pointer focus-visible:outline-none"
              >
                {isFullscreen ? fullscreenexitIcon : fullscreenIcon}
              </motion.button>
            </div>
          </div>
          {/* Skip Buttons Overlay */}
        
            {introVisible && (
              <div className="absolute bottom-30 right-4 flex gap-2 text-black z-10"> 
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="bg-black/20 backdrop-blur-sm border text-white/90 hover:text-white/70 transition-colors border-white/10 inset-shadow-2xs inset-shadow-white/20 bg-opacity-90 px-5 py-3 rounded-lg text-sm font-semibold cursor-pointer tracking-wide"
                  onClick={handleSkipIntro}
                >
                  Skip Intro
                </motion.button>
              </div>
            )}

            {outroVisible && (
              <div className="absolute bottom-28 right-4 flex gap-2 text-black z-10 group"> 
              <motion.span 
                animate={{
                  scale: isNextHovered ? 1.05 : 1,
                  y: isNextHovered ?-8 : 0,
                }} 
                
                className="absolute top-[-28px] text-white font-bold tracking-wider text-lg"
              >
                Next... {countdown !== null ? `${countdown}` : ""}
              </motion.span>
                <motion.div
                  onHoverStart={() => setNextHovered(true)}
                  onHoverEnd={() => setNextHovered(false)}
                  whileHover={{ 
                    scale: 1.1,
                    boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="w-48 h-24 bg-cover bg-center rounded-lg top cursor-pointer"
                  style={{ backgroundImage: `url(${placeholderPath})` }}
                  onClick={handleSkipOutro}
                >
                  <motion.div
                    className="absolute bottom-0 w-full text-white font-normal tracking-wide text-sm p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
                      borderBottomLeftRadius: '0.5rem',
                      borderBottomRightRadius: '0.5rem',
                    }}
                  >
                    {nextTitleFormatted}
                  </motion.div>
                  
                </motion.div>
              </div>
            )}
          </div>
          
        </motion.div>
      )}
    </AnimatePresence>

  </div>
  );
};

export default Show;
