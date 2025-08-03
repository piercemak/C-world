import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const PlayPauseButton = ({ isPlaying, onToggle }) => {
  const pauseIcon = (
    <motion.svg
      key="pause"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className="size-8"
      viewBox="0 0 16 16"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" />
    </motion.svg>
  );

  const playIcon = (
    <motion.svg
      key="play"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className="size-8"
      viewBox="0 0 16 16"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
    </motion.svg>
  );

  return (
    <motion.button
      onClick={onToggle}
      aria-label="Toggle play/pause"
      className="relative cursor-pointer focus-visible:outline-none"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPlaying ? pauseIcon : playIcon}
      </AnimatePresence>
    </motion.button>
  );
};

export default PlayPauseButton;
