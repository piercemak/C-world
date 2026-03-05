import React, { useEffect, useRef, useState } from "react";

const formatTime = (seconds) => {
  if (isNaN(seconds)) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const paddedMins = hrs > 0 ? String(mins).padStart(2, "0") : mins;
  const paddedSecs = String(secs).padStart(2, "0");

  return hrs > 0
    ? `${hrs}:${paddedMins}:${paddedSecs}`
    : `${paddedMins}:${paddedSecs}`;
};

const ProgressBar = ({ videoRef, src, controlsVisible }) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const barRef = useRef(null);
  const pendingDragTimeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const getTimeFromClientX = (clientX) => {
    const bar = barRef.current;
    if (!bar || !duration) return null;
    const rect = bar.getBoundingClientRect();
    const offsetX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const pct = rect.width > 0 ? offsetX / rect.width : 0;
    return {
      time: pct * duration,
      offsetX,
      pct,
    };
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncProgress = () => {
      const ct = Number(video.currentTime || 0);
      const dur = Number(video.duration || 0);

      setCurrentTime(ct);
      setDuration(dur);

      if (!dur || !Number.isFinite(dur)) {
        setProgress(0);
        return;
      }

      const pct = Math.max(0, Math.min(ct / dur, 1));
      setProgress(pct * 100);
    };

    video.addEventListener("timeupdate", syncProgress);
    video.addEventListener("loadedmetadata", syncProgress);
    video.addEventListener("durationchange", syncProgress);

    return () => {
      video.removeEventListener("timeupdate", syncProgress);
      video.removeEventListener("loadedmetadata", syncProgress);
      video.removeEventListener("durationchange", syncProgress);
    };
  }, [videoRef, src]);

  const handleSeek = (e) => {
    if (isDragging) return;
    const point = getTimeFromClientX(e.clientX);
    if (!point || !videoRef.current) return;
    videoRef.current.currentTime = point.time;
  };
  const handleMouseMove = (e) => {
    const point = getTimeFromClientX(e.clientX);
    if (!point) return;
    setHoverTime(point.time);
    setHoverX(point.offsetX);

    if (isDragging) {
      pendingDragTimeRef.current = point.time;
      setCurrentTime(point.time);
      setProgress(point.pct * 100);
    }
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const point = getTimeFromClientX(e.clientX);
    if (!point) return;
    pendingDragTimeRef.current = point.time;
    setHoverTime(point.time);
    setHoverX(point.offsetX);
    setCurrentTime(point.time);
    setProgress(point.pct * 100);
  };
  useEffect(() => {
    const handleCommitUp = () => {
      if (videoRef.current && pendingDragTimeRef.current != null) {
        videoRef.current.currentTime = pendingDragTimeRef.current;
      }
      setIsDragging(false);
    };
    document.addEventListener("mouseup", handleCommitUp);
    return () => {
      document.removeEventListener("mouseup", handleCommitUp);
    };
  }, [videoRef]);

  useEffect(() => {
    if (controlsVisible && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      const dur = videoRef.current.duration || 0;
      setDuration(dur);
      setProgress(dur > 0 ? (videoRef.current.currentTime / dur) * 100 : 0);
    }
  }, [controlsVisible]);

  return (
    <div className="w-full relative">
      {/* Time display */}
      <div className="flex justify-end relative bottom-4 text-md text-white/80 tracking-wide font-light overflow-visible">
        {formatTime(duration - currentTime)}
      </div>

      {/* Progress bar */}
      <div
        ref={barRef}
        onClick={handleSeek}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-2 cursor-pointer bg-white/20 rounded-md overflow-visible relative"
      >
        {/* Filled Progress */}
        <div
          className="h-full bg-white/70 transition-all rounded-md duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />

      {/* Scrubber Circle (visible only on hover) */}
      {hoverTime !== null && (
        <>
          <div
            className="absolute top-1/2 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md pointer-events-none"
            style={{ left: `${hoverX}px` }}
          />
          <div
            className="absolute -top-6 text-xs px-1 py-0.5 bg-black text-white rounded-sm pointer-events-none whitespace-nowrap"
            style={{ left: `${hoverX}px`, transform: "translateX(-50%)" }}
          >
            {formatTime(hoverTime)}
          </div>
        </>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
