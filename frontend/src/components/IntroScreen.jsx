import { useState, useEffect } from "react";
import MobileLibrary from "./MobileLibrary";
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence } from "framer-motion";


const IntroScreen = () => {
  const [showHome, setShowHome] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Decide mobile vs desktop
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const HomeComponent = isMobile ? MobileLibrary : VideoPlayer;

  // Check sessionStorage once
  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
    if (hasSeenIntro === "true") {
      setShowHome(true);   // go straight to home
      setSkipIntro(true);  // just so we know why
    }
    setCheckedSession(true);
  }, []);

  const handlePlay = (e) => {
    const duration = e.target.duration;
    const offset = 0.1; // end a bit early
    setTimeout(() => {
      sessionStorage.setItem("hasSeenIntro", "true");
      setShowHome(true);
    }, (duration - offset) * 1000);
  };

  if (!checkedSession) return null; // don't render until we know

  return (
    <div className="w-full h-dvh overflow-hidden">
      <AnimatePresence mode="wait">
        {/* INTRO VIDEO */}
        {!showHome && !skipIntro ? (
          <motion.video
            key="intro"
            src="/videos/Intro/CworldIntro.mp4"
            autoPlay
            playsInline
            onLoadedMetadata={handlePlay}
            className="w-full h-full object-cover"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        ) : (
          // HOME – always animated, whether we skipped intro or not
          <motion.div
            key={isMobile ? "mobile-home" : "desktop-home"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,       // slower, more gradual
              ease: "easeInOut",
            }}
            className=""
          >
            <HomeComponent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntroScreen;
