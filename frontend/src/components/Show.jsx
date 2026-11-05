import { seasonLength } from "../data/skipTimesData.js";
import { getSkipMarkers } from "../data/mediaTiming.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { attachHls, getAudioTracks, isHlsSource, waitForHlsReady } from "../lib/hlsPlayback.js";
import { motion, AnimatePresence } from "framer-motion";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { bindPlayerCaptions } from "../lib/playerCaptions.js";
import BrowserPlayerControls, { captionDefaults, captionStyle } from "./BrowserPlayerControls.jsx";
import { queueWatchProgressSync, flushWatchProgressSync } from "../lib/watchSync.js";
import { getSubtitleTrackSrc } from "../data/subtitleTracks.js";
import {
  dispatchWatchProgressUpdate,
  readWatchProgressRaw,
  writeWatchProgress,
} from "../lib/watchProgressStorage.js";

const NO_AUTO_SKIP_INTRO_SHOWS = new Set([
  "jjk",
  "cyberpunk",
  "severance",
  "pluribus",
  "itsalwayssunny",
  "mobpsycho",
  "theericandreshow",
  "jojos",
  "attackontitan",
]);

const Show = ({
  src,
  onSkipToNext,
  showId,
  season,
  episode,
  skipIntro = false,
  hasSubtitles = false,
  episodeTitles,
  episodeMetadata,
  getSignedUrl = {},
  getSignedEpisodeUrl = null,
  resumeTime = null,
  initialVolume = null,
  initialMuted = null,
  onVolumeChange = null,
  onMutedChange = null,
  onClose = null,
}) => {


  const [controlsBusy, setControlsBusy] = useState(false);
  const [captionSettings, setCaptionSettings] = useState(() => {
    try { return { ...captionDefaults, ...JSON.parse(localStorage.getItem('cworld.browser.captions') || '{}') }; }
    catch { return captionDefaults; }
  });
  const [autoSkipOutro, setAutoSkipOutro] = useState(() => localStorage.getItem('cworld.browser.autoSkipOutro') !== 'false');
  useEffect(() => { localStorage.setItem('cworld.browser.captions', JSON.stringify(captionSettings)); }, [captionSettings]);
  useEffect(() => { localStorage.setItem('cworld.browser.autoSkipOutro', String(autoSkipOutro)); }, [autoSkipOutro]);

  const containerRef = useRef(null)
  const videoRef = useRef(null);
  const subtitleTrackRef = useRef(null);
  const [nativeCaptionsAvailable, setNativeCaptionsAvailable] = useState(false);
  const previewVideoRef = useRef(null);
  const previewFrameCacheRef = useRef(new Map());
  const previewQueueRef = useRef(Promise.resolve());
  const previewSourceRef = useRef("");
  const previewHlsCleanupRef = useRef(null);
  const previewSessionRef = useRef(0);
  const previewRequestedFrameKeyRef = useRef("");
  const previewTargetRef = useRef(null);
  const previewRequestIdRef = useRef(0);
  const previewHideTimeoutRef = useRef(null);
  const [playbackSrc, setPlaybackSrc] = useState(src);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(null);
  useEffect(() => {
    setAudioTracks([]);
    setSelectedAudioTrack(null);
    if (videoRef.current && isHlsSource(playbackSrc)) {
      return attachHls(videoRef.current, playbackSrc);
    }
  }, [playbackSrc]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHlsSource(playbackSrc)) return undefined;
    const refresh = () => {
      const tracks = getAudioTracks(video);
      setAudioTracks(tracks);
      const active = tracks.find((track) => track.selected);
      if (active) setSelectedAudioTrack(active.index);
    };
    video.addEventListener("cworldaudiotrackschange", refresh);
    video.addEventListener("loadedmetadata", refresh);
    refresh();
    return () => {
      video.removeEventListener("cworldaudiotrackschange", refresh);
      video.removeEventListener("loadedmetadata", refresh);
    };
  }, [playbackSrc]);
  useEffect(() => () => {
    previewHlsCleanupRef.current?.();
    previewHlsCleanupRef.current = null;
  }, [playbackSrc]);
  const [mediaNotFound, setMediaNotFound] = useState(false);
  const intendedResumeTimeRef = useRef(null);
  const startupResumeTimeRef = useRef(null);
  const startupResumeGuardUntilRef = useRef(0);
  const stallTimerRef = useRef(null);
  const recoveryInFlightRef = useRef(false);
  const recoveryAttemptCountRef = useRef(0);
  const recoveryWindowStartRef = useRef(0);
  const recoveryWindowMs = 45_000;
  const recoveryMaxAttempts = 2;
  useEffect(() => {
    const initialResumeTime = Number(resumeTime);
    const hasResumeTime = Number.isFinite(initialResumeTime) && initialResumeTime > 1;

    setPlaybackSrc(src);
    setMediaNotFound(!src);
    intendedResumeTimeRef.current = null;
    startupResumeTimeRef.current = hasResumeTime ? initialResumeTime : null;
    startupResumeGuardUntilRef.current = hasResumeTime ? Date.now() + 8000 : 0;
    recoveryInFlightRef.current = false;
    recoveryAttemptCountRef.current = 0;
    recoveryWindowStartRef.current = 0;
  }, [src, resumeTime]);
  useEffect(() => {
    previewSessionRef.current += 1;
    previewFrameCacheRef.current.clear();
    previewQueueRef.current = Promise.resolve();
    previewSourceRef.current = "";
    previewRequestedFrameKeyRef.current = "";
    previewTargetRef.current = null;
    window.clearTimeout(previewHideTimeoutRef.current);
    previewHideTimeoutRef.current = null;
  }, [playbackSrc]);
  const spinner = <svg xmlns="http://www.w3.org/2000/svg" className="size-14" viewBox="0 0 200 200"><radialGradient id="a12" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stopColor="#FCFAFF"></stop><stop offset=".3" stopColor="#FCFAFF" stopOpacity=".9"></stop><stop offset=".6" stopColor="#FCFAFF" stopOpacity=".6"></stop><stop offset=".8" stopColor="#FCFAFF" stopOpacity=".3"></stop><stop offset="1" stopColor="#FCFAFF" stopOpacity="0"></stop></radialGradient><circle transformOrigin="center" fill="none" stroke="url(#a12)" strokeWidth="15" strokeLinecap="round" strokeDasharray="200 1000" strokeDashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transformOrigin="center" fill="none" opacity=".2" stroke="#FCFAFF" strokeWidth="15" strokeLinecap="round" cx="100" cy="100" r="70"></circle></svg>
  
  const closeIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>

  {/* Outro Ref */}
  const outroSkipRef = useRef(false);
  useEffect(() => {
    outroSkipRef.current = false;
  }, [src]);

  {/* Volume Control */}
  const isMovie = season === null && episode === null;
  const [toggleMute, setToggleMute] = useState(() => (
    typeof initialMuted === "boolean" ? initialMuted : false
  ));
  const toggleMuteRef = useRef(toggleMute);
  const [volume, setVolume] = useState(() => {
    const providedVolume = Number(initialVolume);
    if (initialVolume != null && Number.isFinite(providedVolume)) {
      return Math.max(0, Math.min(1, providedVolume));
    }

    const saved = Number(localStorage.getItem("videoVolume") ?? 1);
    return Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : 1;
  });
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    toggleMuteRef.current = toggleMute;
  }, [toggleMute]);
  useEffect(() => {
    const providedVolume = Number(initialVolume);
    if (initialVolume == null || !Number.isFinite(providedVolume)) return;
    setVolume(Math.max(0, Math.min(1, providedVolume)));
  }, [initialVolume]);
  useEffect(() => {
    if (typeof initialMuted !== "boolean") return;
    setToggleMute(initialMuted);
  }, [initialMuted]);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    localStorage.setItem("videoVolume", volume.toString());
    onVolumeChange?.(volume);
  }, [onVolumeChange, volume]);
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
  
    const handleVolumeChange = () => {
      const newVolume = vid.volume;
      setVolume(newVolume);
      localStorage.setItem("videoVolume", newVolume.toString());
      onVolumeChange?.(newVolume);
    };
  
    vid.addEventListener("volumechange", handleVolumeChange);
    return () => vid.removeEventListener("volumechange", handleVolumeChange);
  }, [onVolumeChange, playbackSrc]);

  {/* Pause buttons */}
  const [isPlaying, setIsPlaying] = useState(false);
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
  
    if (vid.paused || vid.ended) {
      waitForHlsReady(vid).then(() => vid.play()).catch((err) => console.warn("HLS playback failed:", err));
    } else {
      vid.pause();
    }
  }, []);
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
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
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
  const [, setCurrentTime] = useState(0);
  const [introVisible, setIntroVisible] = useState(false);
  const [outroVisible, setOutroVisible] = useState(false);
  const [, setAutoSkipDone] = useState(false); 
  const lastProgressPersistAtRef = useRef(0);
  const lastPersistedTimeRef = useRef(-1);
  const outroProgressResetRef = useRef(false);

  
  const showKey = showId?.replace(/-/g, "").toLowerCase();

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
const buildEpisodeS3Key = useCallback((targetSeason, targetEpisode) => {
  if (!cleanIdForS3) return "";
  const seasonNum = Number(targetSeason);
  const episodeNum = Number(targetEpisode);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return "";
  const seasonStr = `S${String(seasonNum).padStart(2, "0")}`;
  const episodeStr = `E${String(episodeNum).padStart(2, "0")}`;
  const titleRaw = episodeTitles?.[seasonNum]?.[episodeNum - 1] || "";
  return `${cleanIdForS3}/season${seasonNum}-mp4s/${seasonStr}${episodeStr}_${cleanIdForS3}_${titleRaw}.mp4`;
}, [cleanIdForS3, episodeTitles]);
const resolveSignedEpisodeUrl = useCallback(async (targetSeason, targetEpisode) => {
  if (typeof getSignedEpisodeUrl === "function") {
    return getSignedEpisodeUrl(showId, targetSeason, targetEpisode);
  }
  if (typeof getSignedUrl === "function") {
    return getSignedUrl(buildEpisodeS3Key(targetSeason, targetEpisode));
  }
  return "";
}, [buildEpisodeS3Key, getSignedEpisodeUrl, getSignedUrl, showId]);
const { intro, outro } = getSkipMarkers(showKey, actualSeason, actualEpisode);
const hasIntro = !!(intro && Number.isFinite(intro.end));
const debugOutro =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debugOutro") === "1";
const [debugOutroDismissed, setDebugOutroDismissed] = useState(false);
useEffect(() => {
  setDebugOutroDismissed(false);
}, [src, debugOutro]);
const readProgressRawWithMigration = useCallback(() => (
  readWatchProgressRaw({ showId, season, episode })
), [episode, season, showId]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (intendedResumeTimeRef.current != null) return;
    setAutoSkipDone(false); 

  const raw = readProgressRawWithMigration();
  let savedProgress = 0;
  try {
    const obj = raw ? JSON.parse(raw) : null;
    savedProgress = Number(obj?.t ?? obj?.currentTime ?? 0) || 0;
  } catch {
    savedProgress = Number(raw) || 0;
  }

  const startupResumeTime = Number(startupResumeTimeRef.current);
  if (Number.isFinite(startupResumeTime) && startupResumeTime > 1) {
    savedProgress = Math.max(savedProgress, startupResumeTime);
  }


    const startPlayback = async () => {
      try {
        if (!isHlsSource(playbackSrc)) vid.load();
        vid.volume = volumeRef.current;
        vid.muted = toggleMuteRef.current;
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

        await waitForHlsReady(vid);
        await vid.play();

        if (shouldAutoSkipIntro) {
          setAutoSkipDone(true);
        }   
      } catch (err) {
        console.warn("Autoplay blocked:", err);
      }
    };
    startPlayback();
  }, [hasIntro, intro?.end, outro?.start, playbackSrc, readProgressRawWithMigration, showKey, skipIntro]);
  useEffect(() => {
    const vid = videoRef.current;
    const resumeAt = intendedResumeTimeRef.current;
    if (!vid || resumeAt == null) return;

    const handleResumeReady = async () => {
      try {
        await waitForHlsReady(vid);
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

      const duration = vid.duration || 0;
      const tSafe = Math.min(time, Math.max(duration - 0.25, 0));
      const now = Date.now();

      const persistProgress = (t, d) => {
        const guardedResumeTime = Number(startupResumeTimeRef.current);
        const guardActive = startupResumeGuardUntilRef.current > now
          && Number.isFinite(guardedResumeTime)
          && guardedResumeTime > 1;

        if (guardActive && t < Math.max(0, guardedResumeTime - 2)) {
          return;
        }

        if (guardActive && t >= Math.max(0, guardedResumeTime - 1)) {
          startupResumeGuardUntilRef.current = 0;
          startupResumeTimeRef.current = null;
        }

        writeWatchProgress({
          showId,
          season,
          episode,
          currentTime: t,
          duration: d,
          updatedAt: now,
        });
        queueWatchProgressSync({
          showId,
          season,
          episode,
          currentTime: t,
          duration: d,
        });

        dispatchWatchProgressUpdate({ showId, season, episode, t, d });
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
        if (autoSkipOutro && countdownRef.current === null) setCountdown(5);
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
  }, [autoSkipOutro, debugOutro, episode, intro, isLastEpisode, isMovie, outro, outroDismissed, season, showId]);
  
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const syncDuration = () => {
      const d = Number(vid.duration || 0);
      if (!d || !Number.isFinite(d)) return;

      let obj = {};
      try {
        obj = JSON.parse(readProgressRawWithMigration() || "{}");
      } catch {
        obj = {};
      }
      const storedTime = Number(obj?.t ?? obj?.currentTime ?? 0) || 0;
      const guardedResumeTime = Number(startupResumeTimeRef.current);
      const currentTime = Number.isFinite(guardedResumeTime) && guardedResumeTime > 1
        ? Math.max(storedTime, guardedResumeTime)
        : storedTime;

      writeWatchProgress({
        showId,
        season,
        episode,
        currentTime,
        duration: d,
      });
      flushWatchProgressSync({
        showId,
        season,
        episode,
        currentTime,
        duration: d,
      });

      dispatchWatchProgressUpdate({ showId, season, episode, t: currentTime, d });
    };

    vid.addEventListener("loadedmetadata", syncDuration);
    vid.addEventListener("durationchange", syncDuration);
    return () => {
      vid.removeEventListener("loadedmetadata", syncDuration);
      vid.removeEventListener("durationchange", syncDuration);
    };
  }, [episode, readProgressRawWithMigration, season, showId, src]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onEnded = () => {
      const d = Number.isFinite(vid.duration) ? vid.duration : 0;

      if (countdownRef.current !== null) {
        setCountdownAfterEnded(true);
      }

      writeWatchProgress({
        showId,
        season,
        episode,
        currentTime: 0,
        duration: d,
      });
      flushWatchProgressSync({
        showId,
        season,
        episode,
        currentTime: 0,
        duration: d,
      });

      dispatchWatchProgressUpdate({ showId, season, episode, t: 0, d });
    };

    vid.addEventListener("ended", onEnded);
    return () => vid.removeEventListener("ended", onEnded);
  }, [episode, season, showId, src]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const flushProgress = () => {
      const d = Number(vid.duration || 0);
      if (!d || !Number.isFinite(d)) return;
      const tSafe = Math.min(Number(vid.currentTime || 0), Math.max(d - 0.25, 0));

      writeWatchProgress({
        showId,
        season,
        episode,
        currentTime: tSafe,
        duration: d,
      });
      flushWatchProgressSync({
        showId,
        season,
        episode,
        currentTime: tSafe,
        duration: d,
      });

      dispatchWatchProgressUpdate({ showId, season, episode, t: tSafe, d });

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
  }, [episode, season, showId, src]);




  {/* Skipping */}
  const handleSkipIntro = () => {
    if (intro && videoRef.current) videoRef.current.currentTime = intro.end;
  };

const handleSkipOutro = useCallback(async () => {
  if (outroSkipRef.current) return;
  outroSkipRef.current = true;
  setCountdown(null);
  setOutroVisible(false);

  if (outro?.skipTo === "next") {
    const opts = { source: "outro" };
    if (typeof getSignedEpisodeUrl === "function" || typeof getSignedUrl === "function") {
      const signedUrl = await resolveSignedEpisodeUrl(nextSeason, nextEpisode);
      if (!signedUrl) return;
      onSkipToNext?.(nextSeason, nextEpisode, signedUrl, opts);
    } else {
      onSkipToNext?.(nextSeason, nextEpisode, undefined, opts);
    }
  } else {
    if (videoRef.current) {
      videoRef.current.currentTime = outro?.skipTo;
    }
  }
}, [getSignedEpisodeUrl, getSignedUrl, nextEpisode, nextSeason, onSkipToNext, outro?.skipTo, resolveSignedEpisodeUrl]);
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
      if (!signedUrl) return;
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

    const currentTitleRaw = dispS && dispE && (
      episodeMetadata?.[dispS]?.[dispE - 1]?.title || episodeTitles?.[dispS]?.[dispE - 1]
    );
    const currentTitleFormatted = currentTitleRaw
      ? currentTitleRaw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      : (dispE != null ? `Episode ${dispE}` : "");

    const displayEpisodeNumber =
      dispS != null && dispE != null
        ? `S${dispS}E${dispE}`
        : (dispE != null ? `E${dispE}` : "");
    const displayTitle = formattedShowTitle;
    const displayEpisodeTitle = currentTitleFormatted;
 

  useEffect(() => {
    if (!autoSkipOutro) {
      setCountdown(null);
      setCountdownAfterEnded(false);
    }
  }, [autoSkipOutro]);

  {/* Auto-skip Countdown */}
  useEffect(() => {
    if (!autoSkipOutro || countdown === null) return;
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
  }, [autoSkipOutro, countdown, isPlaying, countdownAfterEnded]);


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
  const [previewImage, setPreviewImage] = useState(null);
  const getPreviewFrame = useCallback((requestedTime) => {
    const previewVideo = previewVideoRef.current;
    if (!previewVideo || !playbackSrc) return Promise.resolve(null);

    const frameInterval = 2;
    const frameTime = Math.max(0, Math.round(Number(requestedTime || 0) / frameInterval) * frameInterval);
    const cacheKey = `${playbackSrc}:${frameTime}`;
    previewRequestedFrameKeyRef.current = cacheKey;
    const cachedFrame = previewFrameCacheRef.current.get(cacheKey);
    if (cachedFrame) return Promise.resolve(cachedFrame);

    const session = previewSessionRef.current;
    const waitFor = (eventName) => new Promise((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timeout);
        previewVideo.removeEventListener(eventName, onSuccess);
        previewVideo.removeEventListener("error", onError);
      };
      const onSuccess = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Preview video could not load."));
      };
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Preview frame timed out."));
      }, 8000);
      previewVideo.addEventListener(eventName, onSuccess, { once: true });
      previewVideo.addEventListener("error", onError, { once: true });
    });

    const renderFrame = async () => {
      if (previewRequestedFrameKeyRef.current !== cacheKey) return null;
      if (previewSourceRef.current !== playbackSrc) {
        previewSourceRef.current = playbackSrc;
        previewHlsCleanupRef.current?.();
        previewHlsCleanupRef.current = null;
        if (isHlsSource(playbackSrc)) {
          previewHlsCleanupRef.current = attachHls(previewVideo, playbackSrc);
        } else {
          previewVideo.src = playbackSrc;
          previewVideo.load();
        }
      }

      if (previewVideo.readyState < 1 || !Number.isFinite(previewVideo.duration)) {
        await waitFor("loadedmetadata");
      }
      if (session !== previewSessionRef.current) return null;
      if (previewRequestedFrameKeyRef.current !== cacheKey) return null;

      const targetTime = Math.min(frameTime, Math.max(0, Number(previewVideo.duration || frameTime)));
      if (Math.abs(previewVideo.currentTime - targetTime) > 0.05) {
        const seeked = waitFor("seeked");
        previewVideo.currentTime = targetTime;
        await seeked;
      }
      if (session !== previewSessionRef.current) return null;
      if (previewRequestedFrameKeyRef.current !== cacheKey) return null;

      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 270;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.82);

      const cache = previewFrameCacheRef.current;
      cache.set(cacheKey, image);
      if (cache.size > 90) cache.delete(cache.keys().next().value);
      return image;
    };

    const queuedFrame = previewQueueRef.current
      .then(renderFrame, renderFrame)
      .catch((error) => {
        console.debug("Preview frame unavailable.", error);
        return null;
      });
    previewQueueRef.current = queuedFrame.then(() => undefined);
    return queuedFrame;
  }, [playbackSrc]);

  const clearPreviewOverlay = useCallback(() => {
    window.clearTimeout(previewHideTimeoutRef.current);
    previewHideTimeoutRef.current = null;
    previewRequestIdRef.current += 1;
    previewTargetRef.current = null;
    setPreviewImage(null);
    setIsPreviewing(false);
  }, []);

  const schedulePreviewClear = useCallback((delay = 900) => {
    window.clearTimeout(previewHideTimeoutRef.current);
    previewHideTimeoutRef.current = window.setTimeout(() => {
      clearPreviewOverlay();
    }, delay);
  }, [clearPreviewOverlay]);

  const seekVideoBySeconds = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    clearPreviewOverlay();
    const newTime = Math.min(
      Math.max(video.currentTime + seconds, 0),
      video.duration
    );
    video.currentTime = newTime;
  }, [clearPreviewOverlay]);

  const handleArrowScrubPreview = useCallback((direction) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    const startingTime = isPreviewing && previewTargetRef.current != null
      ? previewTargetRef.current
      : video.currentTime;
    const newTime = Math.min(
      Math.max(startingTime + (direction === "forward" ? 15 : -15), 0),
      video.duration
    );

    previewTargetRef.current = newTime;
    setIsPreviewing(true);
    setPreviewImage(null);
    video.currentTime = newTime;

    const requestId = ++previewRequestIdRef.current;
    schedulePreviewClear(900);
    getPreviewFrame(newTime).then((preview) => {
      if (requestId === previewRequestIdRef.current && preview) {
        setPreviewImage(preview);
        schedulePreviewClear(900);
      }
    });
  }, [getPreviewFrame, isPreviewing, schedulePreviewClear]);

  useEffect(() => {
    return () => window.clearTimeout(previewHideTimeoutRef.current);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.target?.closest('input,select,textarea,button,[contenteditable="true"],[role="dialog"]')) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleArrowScrubPreview("forward");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleArrowScrubPreview("backward");
      } else if (e.key === "Enter" && isPreviewing) {
        e.preventDefault();
        videoRef.current?.play();
        clearPreviewOverlay();
      } else if (e.key === " ") {
        e.preventDefault();
        clearPreviewOverlay();
        togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [clearPreviewOverlay, handleArrowScrubPreview, isPreviewing, togglePlay]);


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
    onMutedChange?.(toggleMute);
  }, [onMutedChange, toggleMute]);


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
        if (isPlaying && !isPreviewing && !controlsBusy) {
          setControlsVisible(false);
          setCursorVisible(false); 
        }
      }, 3000);
    };
  
    window.addEventListener("mousemove", resetInactivity);
    containerRef.current?.addEventListener("keydown", resetInactivity);
    const surface = containerRef.current;
    resetInactivity(); 
    return () => {
      window.removeEventListener("mousemove", resetInactivity);
      surface?.removeEventListener("keydown", resetInactivity);
      clearTimeout(inactivityTimer.current);
    };
  }, [isPlaying, isPreviewing, controlsBusy]);

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => localStorage.getItem('cworld.browser.captions.enabled') !== 'false');
  const changeSubtitlesEnabled = (enabled) => {
    localStorage.setItem('cworld.browser.captions.enabled', String(enabled));
    setSubtitlesEnabled(enabled);
  };
  const [activeSubtitleCues, setActiveSubtitleCues] = useState([]);
  const subtitleTrackSrc = getSubtitleTrackSrc({ showId, season, episode });

  useEffect(() => {
  setSubtitlesEnabled(localStorage.getItem("cworld.browser.captions.enabled") !== "false");
  setActiveSubtitleCues([]);
  }, [hasSubtitles, playbackSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    return bindPlayerCaptions(video, {
      sidecar: subtitleTrackRef.current,
      enabled: subtitlesEnabled,
      onCues: setActiveSubtitleCues,
      onAvailable: setNativeCaptionsAvailable,
    });
  }, [playbackSrc, subtitleTrackSrc, subtitlesEnabled]);

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
  const outroCountdownMax = 5;
  const showOutroCta = (outroVisible || (debugOutro && !debugOutroDismissed)) && !isMovie && !isLastEpisode;
  const [outroSweepProgress, setOutroSweepProgress] = useState(0);
  const outroSweepPercent = Math.max(0, Math.min(outroSweepProgress, 1)) * 100;
  const outroSweepElapsedMsRef = useRef(0);
  const outroSweepLastTsRef = useRef(null);
  const outroSweepActiveRef = useRef(false);
  const sweepAvailable = showOutroCta && autoSkipOutro && countdown !== null;
  useEffect(() => {
    if (sweepAvailable) {
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
  }, [sweepAvailable]);
  const sweepRunning = autoSkipOutro && countdown !== null && showOutroCta && isPlaying;
  useEffect(() => {
    if (!sweepRunning) {
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
  }, [sweepRunning, outroCountdownMax]);



  return (
  <div
    ref={containerRef}
    tabIndex={0}
    className={`browser-player ${controlsVisible ? "controls-visible" : "controls-hidden"} relative w-full h-full outline-none focus:outline-none ${cursorVisible ? "cursor-pointer" : "cursor-none"}`}
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
      {!isHlsSource(playbackSrc) && <source src={playbackSrc} type="video/mp4" />}

      {subtitleTrackSrc && (
        <track
          key={subtitleTrackSrc}
          ref={subtitleTrackRef}
          src={subtitleTrackSrc}
          kind="subtitles"
          srcLang="en"
          label="CWorld English"
        />
      )}


      Your browser does not support the video tag.
    </video>

    <video
      ref={previewVideoRef}
      className="pointer-events-none absolute h-px w-px opacity-0"
      crossOrigin="anonymous"
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    />

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

    {subtitlesEnabled && activeSubtitleCues.length > 0 && <div className={`browser-player-caption ${controlsVisible ? 'controls-visible' : introVisible || showOutroCta ? 'skip-visible' : ''}`}>
      <span className="browser-player-caption-text" style={captionStyle(captionSettings)}>{activeSubtitleCues.map(cue => cue.text).join('\n')}</span>
    </div>}

    {previewImage && (
      <div className="absolute top-0 left-0 rounded-2xl w-full h-full bg-black/60 backdrop-blur pointer-events-none">
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50 bg-white/60 p-1 rounded">
          <img src={previewImage} alt="Preview Frame" className="w-[350px] h-[200px] object-cover rounded" />
        </div>
      </div>
    )}

    <AnimatePresence>
      {controlsVisible && <motion.div className="browser-player-controls"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.25}}>
        <BrowserPlayerControls videoRef={videoRef} src={playbackSrc} title={displayTitle}
          episodeLabel={isMovie ? null : [displayEpisodeNumber,displayEpisodeTitle].filter(Boolean).join(' · ')}
          onClose={onClose ? async () => { if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{}); onClose(); } : null}
          restart={handleRestartClick} isPlaying={isPlaying} toggle={togglePlay} seek={seekVideoBySeconds}
          previous={!isMovie && !isFirstEpisode ? handleSkipToPrevious : null}
          next={!isMovie && !isLastEpisode ? handleNextEpisode : null}
          volume={volume} muted={toggleMute} toggleMute={()=>setToggleMute(value=>!value)}
          setVolume={value=>{setVolume(value);setToggleMute(value===0);if(videoRef.current)videoRef.current.volume=value;}}
          tracks={audioTracks} selectedTrack={selectedAudioTrack} setSelectedTrack={setSelectedAudioTrack}
          hasSubtitles={Boolean(hasSubtitles || subtitleTrackSrc || nativeCaptionsAvailable)} subtitlesEnabled={subtitlesEnabled} setSubtitlesEnabled={changeSubtitlesEnabled}
          settings={captionSettings} setSettings={setCaptionSettings}
          autoSkipOutro={autoSkipOutro} setAutoSkipOutro={setAutoSkipOutro}
          fullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} getPreviewFrame={getPreviewFrame} onBusy={setControlsBusy}/>
      </motion.div>}
    </AnimatePresence>

    {/* Skip Intro */}
    {introVisible && (
      <div className="browser-player-skip absolute flex gap-2 text-black z-50">
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
          className="browser-player-skip absolute flex flex-col gap-2 text-black z-50 group bg-black/20 border-1 border-white/10 backdrop-blur-2xl p-2 rounded-lg"
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
              style={{ width: `${autoSkipOutro && countdown !== null ? outroSweepPercent : 0}%` }}
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
