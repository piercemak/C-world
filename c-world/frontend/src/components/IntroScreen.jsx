import { useState, useEffect } from 'react';
import Home from './Home';
import { motion, AnimatePresence } from 'framer-motion';

const IntroScreen = () => {
  const [showHome, setShowHome] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    if (hasSeenIntro === 'true') {
      setShowHome(true); // Skip intro
      setSkipIntro(true);
    }
    setCheckedSession(true); // Allow render
  }, []);

    const handlePlay = (e) => {
    const duration = e.target.duration;
    const offset = 0.1;
    setTimeout(() => {
        sessionStorage.setItem('hasSeenIntro', 'true');
        setShowHome(true);
    }, (duration - offset) * 1000);
    };

  if (!checkedSession) return null; // Wait until we know whether to skip

  return (
    <div className="w-full h-dvh overflow-hidden">
      <AnimatePresence mode="wait">
        {!showHome ? (
          <motion.video
            key="intro"
            src="/videos/Intro/CworldIntro.mp4"
            autoPlay
            playsInline
            onLoadedMetadata={handlePlay}
            className="w-full h-full object-cover"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        ) : skipIntro ? (
          <Home /> // no animation if skipping intro
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <Home />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntroScreen;
