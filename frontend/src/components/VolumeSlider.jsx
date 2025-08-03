import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

const VolumeSlider = ({ volume, setVolume, muted }) => {
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);

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
  };

  const handlePointerDown = (e) => {
    updateVolume(e.clientY);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={sliderRef}
      className="h-8 w-4 bg-white/20 backdrop-blur rounded relative cursor-pointer overflow-hidden"
      onPointerDown={handlePointerDown}
    >
      <motion.div
        className="absolute bottom-0 left-0 w-full bg-white"
        style={{ height: `${muted ? 0 : volume * 100}%` }}
        initial={false}
        animate={{ height: `${muted ? 0 : volume * 100}%` }}
        transition={{ ease: "easeOut", duration: 0.15 }}
      />
    </div>
  );
};

export default VolumeSlider;
