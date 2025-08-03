import React, { useEffect, useState } from "react";

const WatchProgressBar = ({ storageKey, duration = null, progressOverride = null }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Detect if it's a movie (no season/episode in key)
    const isMovie = !/S\d+E\d+/.test(storageKey);
    const fallbackDuration = isMovie ? 3600 : 690; // 1 hr movie vs 11.5 min show
    const finalDuration = duration || fallbackDuration;

    const saved = parseFloat(localStorage.getItem(`watchProgress-${storageKey}`)) || 0;
    const computed = progressOverride !== null ? progressOverride : saved;
    const computedProgress = Math.min(computed / finalDuration, 1);

    console.log("📺 WatchProgressBar Debug:", {
      storageKey,
      isMovie,
      finalDuration,
      progressOverride,
      localStorageValue: saved,
      computedProgress
    });

    setProgress(computedProgress);
  }, [storageKey, duration, progressOverride]);

  if (progress === 0) return null;

  return (
    <div className="absolute bottom-0 ml-2 left-0 w-[90%] h-[4px] z-10 rounded-full overflow-hidden">
      <div
        className="h-full bg-red-500/90 transition-all duration-500 rounded-full"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
};

export default WatchProgressBar;
