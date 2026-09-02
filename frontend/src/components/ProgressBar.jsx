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

const ProgressBar = ({ videoRef, src, controlsVisible, getPreviewFrame }) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [hoverPreview, setHoverPreview] = useState(null);
  const barRef = useRef(null);
  const pendingDragTimeRef = useRef(null);
  const hoverPreviewRequestRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const previewBucket = hoverTime === null ? null : Math.round(hoverTime / 2) * 2;

  const getTimeFromClientX = (clientX) => {
    const bar = barRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    const offsetX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const pct = rect.width > 0 ? offsetX / rect.width : 0;
    const effectiveDuration = Number(videoRef.current?.duration || duration || 0);
    return {
      time: pct * Math.max(0, effectiveDuration),
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
    hoverPreviewRequestRef.current += 1;
    setHoverPreview(null);
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

  useEffect(() => {
    if (previewBucket === null || !getPreviewFrame) {
      setHoverPreview(null);
      return undefined;
    }

    const requestId = ++hoverPreviewRequestRef.current;
    const timeout = window.setTimeout(async () => {
      const image = await getPreviewFrame(previewBucket);
      if (requestId === hoverPreviewRequestRef.current) {
        setHoverPreview(image);
      }
    }, 70);

    return () => window.clearTimeout(timeout);
  }, [getPreviewFrame, previewBucket, src]);

  return (
    <div className="w-full relative">
      {/* Time display */}
      <div className="flex justify-end relative bottom-1 text-md text-white/80 tracking-wide font-light overflow-visible">
        {formatTime(duration - currentTime)}
      </div>

      {/* Progress bar */}
      <div
        ref={barRef}
        onClick={handleSeek}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-6 cursor-pointer overflow-visible relative"
      >
        {/* Filled Progress */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-md bg-white/20" />
        <div
          className="absolute left-0 top-1/2 h-2 -translate-y-1/2 bg-white/70 transition-all rounded-md duration-100 ease-out"
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
            className="absolute bottom-full z-50 mb-2 w-48 -translate-x-1/2 overflow-hidden rounded-lg border border-white/20 bg-black/95 shadow-2xl pointer-events-none"
            style={{ left: `${hoverX}px` }}
          >
            {hoverPreview ? (
              <img
                src={hoverPreview}
                alt={`Preview at ${formatTime(hoverTime)}`}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="aspect-video w-full animate-pulse bg-white/10" />
            )}
            <div className="px-2 py-1 text-center text-xs font-medium tabular-nums text-white">
              {formatTime(hoverTime)}
            </div>
          </div>
        </>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
