import React, { useEffect, useState } from "react";

const WatchProgressBar = ({ storageKey, duration = 690, progressOverride = null }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progressOverride !== null) {
      setProgress(Math.min(progressOverride / duration, 1));
      return;
    }

    const saved = localStorage.getItem(`watchProgress-${storageKey}`);
    if (saved) {
      setProgress(Math.min(parseFloat(saved) / duration, 1));
    }
  }, [storageKey, duration, progressOverride]);

  if (progress === 0 || progress >= 0.99) return null;

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
