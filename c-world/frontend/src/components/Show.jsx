import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayPauseButton from "./framercomponents/PlayPauseButton";
import ProgressBar from "./ProgressBar.jsx";
import VolumeSlider from "./VolumeSlider.jsx";
import SkipForward from '../assets/icons/SkipForward.svg'
import SkipBack from '../assets/icons/SkipBack.svg'


const Show = ({ src, delayPlay = 0, onSkipToNext, showId, season, episode, skipIntro = false, episodeTitles, getSignedUrl = {} }) => {


  const containerRef = useRef(null)
  const videoRef = useRef(null);
  const spinner = <svg xmlns="http://www.w3.org/2000/svg" className="size-14" viewBox="0 0 200 200"><radialGradient id="a12" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="#FCFAFF"></stop><stop offset=".3" stop-color="#FCFAFF" stop-opacity=".9"></stop><stop offset=".6" stop-color="#FCFAFF" stop-opacity=".6"></stop><stop offset=".8" stop-color="#FCFAFF" stop-opacity=".3"></stop><stop offset="1" stop-color="#FCFAFF" stop-opacity="0"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a12)" stroke-width="15" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="#FCFAFF" stroke-width="15" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
  
  const fullscreenIcon = <svg xmlns="http://www.w3.org/2000/svg"  height="16" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/></svg>
  const fullscreenexitIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"/></svg>
  const volumeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12zm3.025 4a4.5 4.5 0 0 1-1.318 3.182L10 10.475A3.5 3.5 0 0 0 11.025 8 3.5 3.5 0 0 0 10 5.525l.707-.707A4.5 4.5 0 0 1 12.025 8"/></svg>
  const mutedIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0"/></svg>

  {/* Volume Control */}
  const [volumeHovered, setvolumeHovered] = useState(false);
  const [toggleMute, setToggleMute] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("videoVolume");
    return saved !== null ? parseFloat(saved) : 1; // default volume = 1
  });
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    localStorage.setItem("videoVolume", volume.toString());
  }, [volume]);
  // Keyboard to change volume
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
  const filename = pathParts[pathParts.length - 1];
  const match = filename.match(/S(\d+)E(\d+)/);
  const actualSeason = season || parseInt(match?.[1] || "1", 10);
  const actualEpisode = episode || parseInt(match?.[2] || "1", 10);

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

    }
  };
const showSeasonData = seasonLength[showKey];
let nextSeason = actualSeason;
let nextEpisode = actualEpisode + 1;

if (showSeasonData && nextEpisode > showSeasonData[actualSeason]) {
  nextSeason = actualSeason + 1;
  nextEpisode = 1;
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
    }    


  };

  const getActiveSkipTime = () => {
    const rules = skipTimes[showKey]?.rules || [];
    const defaultTimes = skipTimes[showKey]?.default;
  
    if (!defaultTimes) return { intro: { start: 0, end: 0 }, outro: null };
  
    const matched = rules.find(rule => rule.condition(actualSeason, actualEpisode));
    return {
      intro: matched?.intro || defaultTimes.intro,
      outro: matched?.outro || defaultTimes.outro,
    };
  };
  const { intro, outro } = getActiveSkipTime();

  useEffect(() => {
    const vid = videoRef.current;
    console.log("🎥 Video ref:", vid);
    console.log("🎬 Video src:", src);
    if (!vid) return;
    setAutoSkipDone(false); 

    const key = `${showId}-S${season}-E${episode}`;
    const savedProgress = parseFloat(localStorage.getItem(`watchProgress-${key}`) || "0");

    const startPlayback = async () => {
      try {
        await vid.load();
        vid.volume = volume;

        console.log("▶️ Attempting to play video...");
        const shouldStartFromBeginning = savedProgress >= (outro?.start || Infinity);
        const startTime = skipIntro
          ? intro.end
          : (shouldStartFromBeginning ? 0 : savedProgress);
        vid.currentTime = startTime;

        await vid.play();
        console.log("🚩 skipIntro flag:", skipIntro);
        console.log("🎯 intro skip time:", intro?.end);
        if (skipIntro) {
          console.log("⏩ Skipping intro to", intro.end);
          vid.currentTime = intro.end;
          setAutoSkipDone(true);
        }
      } catch (err) {
        console.warn("Autoplay blocked:", err);
      }
    };
    startPlayback();
  }, [src, skipIntro, intro.end]);

  // Monitor time updates
  const [countdown, setCountdown] = useState(null);

  {/* Time */}
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      const time = vid.currentTime;
      setCurrentTime(time);

      const key = `${showId}-S${season}-E${episode}`;

      setIntroVisible(time >= intro.start && time <= intro.end);

      if (time >= outro?.start) {
        setOutroVisible(true);
        if (countdown === null) setCountdown(10);

        // 🧼 Clear saved progress once we pass the outro start time
        localStorage.removeItem(`watchProgress-${key}`);
      } else {
        setOutroVisible(false);
        setCountdown(null);

        // 📝 Only save if before outro
        localStorage.setItem(`watchProgress-${key}`, time.toString());
      }
    };

    vid.addEventListener("timeupdate", handleTimeUpdate);
    return () => vid.removeEventListener("timeupdate", handleTimeUpdate);
  }, [intro, outro, countdown, showId, season, episode]);

  {/* Skipping */}
  const handleSkipIntro = () => {
    videoRef.current.currentTime = intro.end;
  };

const handleSkipOutro = async () => {
  if (outro?.skipTo === "next") {
    if (getSignedUrl && typeof getSignedUrl === "function") {
      const cleanId = showId.replace(/-/g, "");
      const seasonStr = `S${String(nextSeason).padStart(2, "0")}`;
      const episodeStr = `E${String(nextEpisode).padStart(2, "0")}`;
      const titleRaw = episodeTitles?.[nextSeason]?.[nextEpisode - 1] || "";
      const s3Key = `${cleanId}/season${nextSeason}-mp4s/${seasonStr}${episodeStr}_${cleanId}_${titleRaw}.mp4`;
      const signedUrl = await getSignedUrl(s3Key);

      onSkipToNext?.(nextSeason, nextEpisode, signedUrl);
    } else {
      onSkipToNext?.(nextSeason, nextEpisode);
    }
  } else {
    // Standard time-based outro skip
    if (videoRef.current) {
      videoRef.current.currentTime = outro?.skipTo;
    }
  }
};

  {/* Placeholder Images */}
  const isMovie = season === null && episode === null;
  const cleanShowId = showId?.replace(/-/g, "");
  const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
  const placeholderPath = `${cloudFrontDomain}/${cleanShowId}/placeholders/season${nextSeason}/S${nextSeason}E${nextEpisode}_${cleanShowId}_placeholder.png`
  //Episode Title
  let nextS = null;
  let nextE = null;
  let nextTitleRaw = "";
  let nextTitleFormatted = "";

  if (season !== null && episode !== null && episodeTitles) {
    nextS = actualEpisode + 1 > (episodeTitles[actualSeason]?.length || 0)
      ? actualSeason + 1
      : actualSeason;

    nextE = actualEpisode + 1 > (episodeTitles[actualSeason]?.length || 0)
      ? 1
      : actualEpisode + 1;

    nextTitleRaw = episodeTitles?.[nextS]?.[nextE - 1] || `Episode ${nextE}`;
    nextTitleFormatted = nextTitleRaw
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  } else {
    nextTitleFormatted = showId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

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
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case "ArrowRight":
          handleSkipPreview('forward');
          break;
        case "ArrowLeft":
          handleSkipPreview('backward');
          break;
        case "Enter":
          if (isPreviewing) {
            videoRef.current.play();
            setIsPreviewing(false);
            setPreviewImage(null);
          }
          break;
        case " ":
        case "Spacebar": 
          e.preventDefault();
          togglePlay();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewing]);


  {/* Frame Preview Handling */}
  const [isPreviewing, setIsPreviewing] = useState(false);
  const generateFramePreview = async (time) => {
    const tempVideo = document.createElement('video');
    tempVideo.src = src;
    tempVideo.crossOrigin = "anonymous";
    tempVideo.preload = 'auto';
    tempVideo.currentTime = time;
  
    return new Promise((resolve) => {
      tempVideo.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 854; // set preview dimensions
        canvas.height = 480;
  
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        resolve(dataUrl);
      }, { once: true });
  
      // Wait until metadata is loaded before setting time
      tempVideo.addEventListener('loadedmetadata', () => {
        tempVideo.currentTime = Math.min(time, tempVideo.duration);
      }, { once: true });
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
    setIsPreviewing(true); // keep track that we are showing preview
  
    videoRef.current.currentTime = newTime;
    videoRef.current.pause(); // pause on skip
  };
  useEffect(() => {
    if (isPlaying && isPreviewing) {
      setPreviewImage(null);
      setIsPreviewing(false);
    }
  }, [isPlaying, isPreviewing]);
  //Enter Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        handleSkipPreview('forward');
      } else if (e.key === "ArrowLeft") {
        handleSkipPreview('backward');
      } else if (e.key === "Enter" && isPreviewing) {
        // resume playback from previewed time
        videoRef.current.play();
        setIsPreviewing(false); // hide preview
        setPreviewImage(null);
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        setControlsVisible(false);
        setCursorVisible(false); 
      }, 3000);
    };
  
    window.addEventListener("mousemove", resetInactivity);
    resetInactivity(); 
    return () => {
      window.removeEventListener("mousemove", resetInactivity);
      clearTimeout(inactivityTimer.current);
    };
  }, []);


  const [subtitleText, setSubtitleText] = useState("");
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const track = vid.textTracks[0];
    if (!track) return;

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



  return (
  <div
    ref={containerRef}
    className={`relative w-full h-full ${cursorVisible ? "cursor-pointer" : "cursor-none"}`}
  >
    <video
      key={src}
      ref={videoRef}
      className={`w-full h-full object-cover rounded-2xl z-[5] ${isLoading ? "animate-pulse bg-black/60" : ""}`}
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
      Your browser does not support the video tag.
    </video>

    {isLoading && (
      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        {spinner}
      </div>
    )}    

    {subtitleText && (
      <div className="absolute bottom-24 w-full text-center">
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
            {/* Play/Pause */}
              <div className="w-full justify-center gap-4 flex items-center relative left-8">
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
                  className="bg-white bg-opacity-90 px-3 py-2 rounded-full text-sm font-semibold cursor-pointer tracking-wide"
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
