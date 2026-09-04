import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

const VolumeSlider = ({ volume, setVolume, muted }) => {
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);
  const displayVolume = muted ? 0 : volume;
  const thumbBottomPx = 1 + displayVolume * 96;

  const updateVolume = useCallback((clientY) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const offsetY = clientY - rect.top;
    const newVolume = 1 - offsetY / rect.height;
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, [setVolume]);

  const handlePointerMove = (e) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => updateVolume(e.clientY));
  };

  const handlePointerUp = () => {
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    updateVolume(e.clientY);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={sliderRef}
      className="group relative flex h-28 w-9 cursor-pointer touch-none select-none items-center justify-center"
      onPointerDown={handlePointerDown}
      role="slider"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(displayVolume * 100)}
    >
      <div className="relative h-24 w-2.5 overflow-hidden rounded-full border border-white/18 bg-white/12 shadow-[inset_0_1px_8px_rgba(255,255,255,0.08)] backdrop-blur-md transition-colors group-hover:bg-white/18">
        <motion.div
          className="absolute bottom-0 left-0 w-full rounded-full bg-gradient-to-t from-white/88 to-white shadow-[0_0_14px_rgba(255,255,255,0.34)]"
          initial={{ height: 0, opacity: 0.55 }}
          animate={{ height: `${displayVolume * 100}%` }}
          transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.34 }}
        />
      </div>
      <motion.div
        className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/75 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.38)]"
        initial={{ bottom: 1, opacity: 0, scale: 0.72 }}
        animate={{ bottom: thumbBottomPx, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.75 }}
      />
    </div>
  );
};

export default VolumeSlider;
