import React, { useEffect, useState } from "react";

const WatchProgressBar = ({ storageKey, duration = null, progressOverride = null }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const readProgress = () => {
      const raw = localStorage.getItem(`watchProgress-${storageKey}`);
      if (!raw) return { t: 0, d: 0 };

      try {
        const obj = JSON.parse(raw);
        const t = Number(obj?.t ?? obj?.currentTime ?? 0);
        const d = Number(obj?.d ?? obj?.duration ?? 0);
        return {
          t: Number.isFinite(t) ? t : 0,
          d: Number.isFinite(d) ? d : 0,
        };
      } catch {
        const t = Number(raw);
        return { t: Number.isFinite(t) ? t : 0, d: 0 };
      }
    };

    const ls = readProgress();

    const t =
      typeof progressOverride === "number" && Number.isFinite(progressOverride)
        ? progressOverride
        : ls.t;

    const d =
      (typeof duration === "number" && Number.isFinite(duration) && duration > 0)
        ? duration
        : ls.d;

    if (!d || d <= 0) {
      setProgress(0);
      return;
    }

    const pct = Math.max(0, Math.min(t / d, 1));
    setProgress(pct);
  }, [storageKey, duration, progressOverride]);

  if (progress <= 0) return null;

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
