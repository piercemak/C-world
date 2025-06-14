import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom';


const MobileHome = () => {

const hdIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-5" viewBox="0 0 16 16"><path d="M10.53 5.968h-.843v4.06h.843c1.117 0 1.622-.667 1.622-2.02 0-1.354-.51-2.04-1.622-2.04"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm5.396 3.001V11H6.209V8.43H3.687V11H2.5V5.001h1.187v2.44h2.522V5h1.187zM8.5 11V5.001h2.188c1.824 0 2.685 1.09 2.685 2.984C13.373 9.893 12.5 11 10.69 11z"/></svg>
const downChevron = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.553 6.776a.5.5 0 0 1 .67-.223L8 9.44l5.776-2.888a.5.5 0 1 1 .448.894l-6 3a.5.5 0 0 1-.448 0l-6-3a.5.5 0 0 1-.223-.67"/></svg>

const [showDropdown, setShowDropdown] = useState(false);

const navigate = useNavigate();
const handleNavigate = () => {
    navigate("/video-library");
  };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.4,
      ease: 'easeInOut',
    },
  },
};
const childVariants = {
    hidden: { opacity: 0, y: -100 },
    visible: { opacity: 1, y: 0 },
    transition: { ease: 'easeInOut', duration: 0.3 }
  };

{/* Dropdown */}
const dropdownRef = useRef(null);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };
  if (showDropdown) {
    document.addEventListener("mousedown", handleClickOutside);
  } else {
    document.removeEventListener("mousedown", handleClickOutside);
  }
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showDropdown]);


{/* AWS Signed Urls */}
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const fetchSignedUrl = async (s3Key) => {
const bucketName = "all-shows";
  try {
    const res = await fetch(`${API_BASE}/api/signed-url/?key=${encodeURIComponent(s3Key)}&bucket=${bucketName}`);
    const data = await res.json();
    return data.url;
  } catch (err) {
    console.error("❌ Failed to fetch signed URL:", err);
    return ""; 
  }
};  
const [videoUrl, setVideoUrl] = useState("");
useEffect(() => {
  const getSignedUrl = async () => {
    const signed = await fetchSignedUrl("misc/cartoonMashup1.mp4");
    setVideoUrl(signed);
  };
  getSignedUrl();
}, [])

  return (
    <div className="relative w-full h-dvh overflow-hidden">
        {videoUrl && (
          <video
            className="absolute top-0 left-0 w-full h-dvh object-cover"
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        <span
        onClick={() => setShowDropdown(prev => !prev)}
        className="text-gray-400 absolute flex justify-center w-full cursor-pointer z-50"
        >
            {downChevron}
        </span>    

        {/* Your foreground content */}
        <motion.div
        className="relative z-10 flex flex-col h-full text-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        >
            
        {/* Wrapper with fade */}
        <div className="relative flex-1 w-full">

        {/* Fade overlay ABOVE the black box */}
        <div className="absolute bottom-[320px] left-0 w-full h-60 bg-gradient-to-t from-black to-transparent z-0 pointer-events-none" />

        {/* Solid black section with content */}
        <div className="absolute bottom-0 left-0 w-full h-[320px] bg-black z-40">
            <div className="flex flex-col items-center justify-end gap-8 h-full relative z-20 px-4 text-white text-center">
            <motion.h1
                className="text-6xl font-bold tracking-wider"
                variants={childVariants}
            >
                What are we<br />
                Watching<br />
                Today?
            </motion.h1>

            <motion.span
                variants={childVariants}
                className="w-full text-sm"
            >
                Watch anytime, anywhere. Explore your library of shows and movies.
            </motion.span>

            <span className="flex flex-row justify-center gap-2">
                <span className="w-3 h-1 bg-sky-300 rounded-full" />
                <span className="size-1 rounded-full bg-white" />
                <span className="size-1 rounded-full bg-white" />
                <span className="size-1 rounded-full bg-white" />
            </span>

            <motion.button
                onClick={handleNavigate}
                whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)"  }}
                transition={{
                    type: "spring",
                    stiffness: 600,
                    damping: 20    
                }}
                className="bg-sky-300 p-6 w-full mb-8 rounded-full text-2xl font-bold tracking-wide"
            >
                Start Watching
            </motion.button>
            </div>
        </div>
        </div>



        {/* Bottom section: fixed height box at bottom */}

        </motion.div>

</div>
  )
}

export default MobileHome