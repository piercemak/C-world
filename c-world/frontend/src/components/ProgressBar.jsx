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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const updateDuration = () => {
      const dur = video.duration || 0;
      setDuration(dur);
      setProgress((video.currentTime / dur) * 100);
    };

    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("loadedmetadata", updateDuration);

    return () => {
      video.removeEventListener("timeupdate", updateProgress);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [src]);

  const handleSeek = (e) => {
    const bar = barRef.current;
    const rect = bar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
  
    if (duration > 0 && videoRef.current) {
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
    }
  };
  const handleMouseMove = (e) => {
    const bar = barRef.current;
    const rect = bar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);
    const time = percentage * duration;
  
    setHoverTime(time);
    setHoverX(offsetX);
  
    if (isDragging && videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const [isDragging, setIsDragging] = useState(false);
  const handleMouseDown = () => {
    setIsDragging(true);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    document.addEventListener("mouseup", handleUp);
    return () => document.removeEventListener("mouseup", handleUp);
  }, []);

  useEffect(() => {
    if (controlsVisible && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      const dur = videoRef.current.duration || 0;
      setDuration(dur);
      setProgress((videoRef.current.currentTime / dur) * 100);
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
