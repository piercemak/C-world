import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SHOWS } from './mobileshowsData';

const Archive = () => {

const searchIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>
const filterIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>
const starIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
const resetIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/></svg>
const folderIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-4" viewBox="0 0 16 16"><path d="m.5 3 .04.87a2 2 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09L14.54 8h1.005l.256-2.819A2 2 0 0 0 13.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6.172 1H2.5a2 2 0 0 0-2 2m5.672-1a1 1 0 0 1 .707.293L7.586 3H2.19q-.362.002-.683.12L1.5 2.98a1 1 0 0 1 1-.98z"/><path d="M13.5 9a.5.5 0 0 1 .5.5V11h1.5a.5.5 0 1 1 0 1H14v1.5a.5.5 0 1 1-1 0V12h-1.5a.5.5 0 0 1 0-1H13V9.5a.5.5 0 0 1 .5-.5"/></svg>
const profileIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/></svg>

{/* Variants */}
const listVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 28 },
  },
};
const newest1Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 22,
      mass: 0.9,
    },
  },
};
const newest2Variants = {
  hidden: { opacity: 0, y: -60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 22,
      mass: 0.6,
      delay: 0.16,
    },
  },
};
const newest3Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 22,
      mass: 0.6,
      delay: 0.08,
    },
  },
};



{/* Current show */}
const videos = SHOWS;
const carouselShows = videos; 

{/* New Media */}
const parseAddedDate = (str) => {
  if (!str) return new Date(0); 
  const [m, d, y] = str.split("-").map(Number);
  const fullYear = y < 100 ? 2000 + y : y; 
  return new Date(fullYear, m - 1, d);
};
const latestThree = useMemo(() => {
  const withDates = videos.filter((m) => m.dateadded);
  return [...withDates]
    .sort(
      (a, b) => parseAddedDate(b.dateadded) - parseAddedDate(a.dateadded)
    )
    .slice(0, 3);
}, [videos]);

{/* Navigate */}
const navigate = useNavigate();
const handleNavigate = () => {
    navigate("/video-library");
};

const [currentIndex, setCurrentIndex] = useState(0);

useEffect(() => {
  if (!carouselShows.length) return;

  const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselShows.length);
  }, 4000);

  return () => clearInterval(interval);
}, [carouselShows.length]);

const currentShow =
  carouselShows.length > 0
    ? carouselShows[currentIndex % carouselShows.length]
    : null;


{/* Search Functionality */}
const searchRef = useRef(null);
const [searchTerm, setSearchTerm] = useState('');
const [isSearchOpen, setIsSearchOpen] = useState(false);
useEffect(() => {
    const handleClickOutside = (event) => {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setIsSearchOpen(false);
            setSearchTerm(''); 
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, []);


{/* Filtering */}
const [filterOpen, setFilterOpen] = useState(false);
const filterRef = useRef(null);
const [sortMode, setSortMode] = useState("newest"); 
const [typeFilter, setTypeFilter] = useState("all"); 
const filteredVideos = useMemo(() => {
  let result = [...videos];
  const search = searchTerm.trim().toLowerCase();
  if (search) {
    result = result.filter((v) =>
      (v.title || "").toLowerCase().includes(search) ||
      (v.creator || "").toLowerCase().includes(search)
    );
  }
  if (typeFilter === "TV") {
    result = result.filter((v) => v.type === "TV");
  } else if (typeFilter === "Movies") {
    result = result.filter((v) => v.type === "Movies");
  }
  result.sort((a, b) => {
    switch (sortMode) {
      case "newest":
        return parseAddedDate(b.dateadded) - parseAddedDate(a.dateadded);
      case "oldest":
        return parseAddedDate(a.dateadded) - parseAddedDate(b.dateadded);
      case "ratingHigh":
        return parseFloat(b.ratings || 0) - parseFloat(a.ratings || 0);
      case "ratingLow":
        return parseFloat(a.ratings || 0) - parseFloat(b.ratings || 0);
      case "alpha":
        return (a.title || "").localeCompare(b.title || "");
      default:
        return 0;
    }
  });
  return result;
}, [videos, sortMode, typeFilter, searchTerm]); 
useEffect(() => {
  setSortMode("newest");
  setTypeFilter("all");
  setFilterOpen(false);
}, []);
useEffect(() => {
  if (!filterOpen) return;
  const handleClick = (e) => {
    if (filterRef.current && !filterRef.current.contains(e.target)) {
      setFilterOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, [filterOpen]);



{/* Profile Picture */}
const fileInputRef = useRef(null);
const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || "/images/misc/profilepictureBlank.webp");
const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
        setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
    }
};    
useEffect(() => {
localStorage.setItem('profileImage', profileImage);
}, [profileImage]);



{/* Profile/User Interaction */}
const [expanded, setExpanded] = useState(false);
const profileRef = useRef(null);
useEffect(() => {
const handleClick = (e) => {
    if (profileRef.current && !profileRef.current.contains(e.target)) {
    setExpanded(false);
    }
};
document.addEventListener("mousedown", handleClick);
return () => document.removeEventListener("mousedown", handleClick);
}, []);


{/* Back to Users */}
const handleBackToProfiles = () => {
sessionStorage.removeItem("showIntroFromUser");
navigate("/home");
window.location.reload();
};



  return (
    <div className="relative w-full min-h-dvh alexandria-font">
        {/* Home Nav */}
        <div className="flex flex-row z-90 fixed items-center">
            <motion.div
                whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)" }} 
                transition={{
                    type: "spring",
                    stiffness: 600,
                    damping: 20    
                }}     
                onClick={handleNavigate}
                className="size-10 z-90 m-2 text-white bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-full shadow-md"
            >
                {homeIcon}
            </motion.div>
        </div>
        {/* Search Icon */}
        <div className="flex justify-end">
          <div className="fixed z-90 m-2 text-white flex flex-row items-center gap-2">
              <motion.div
                  ref={profileRef}
                  className="flex flex-row items-center bg-white/20 gap-2 px-2 py-1 rounded-full cursor-pointer overflow-hidden"
                  initial={false}
                  animate={{ width: expanded ? 140 : 70 }}  
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  onClick={() => setExpanded(true)}
              >
                  {/* Profile Image */}
                  <div
                  className={
                      expanded
                      ? "pointer-events-auto w-8 h-8 flex-shrink-0"
                      : "pointer-events-none w-8 h-8 flex-shrink-0"
                  }
                  >
                  <img
                      src={profileImage}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-md"
                      onClick={() => fileInputRef.current.click()}
                  />
                  <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                  />
                  </div>

                  {/* Ping dot */}
                  <div className="size-2 rounded-full bg-green-400/40">
                  <div className="size-2 rounded-full bg-green-400 animate-ping" />
                  </div>

                  {/* Right-side content – always rendered, just animated */}
                  <motion.div
                  className="flex flex-row items-center gap-4 ml-1"
                  initial={false}
                  animate={{
                      opacity: expanded ? 1 : 0,
                      x: expanded ? 0 : 8,
                  }}
                  style={{ pointerEvents: expanded ? "auto" : "none" }}
                  transition={{ duration: 0.2 }}
                  >
                  <motion.span 
                      className="text-white flex justify-end"
                      whileTap={{ scale: 0.9 }}
                      onClick={handleBackToProfiles}
                  >
                      {profileIcon}
                  </motion.span>
                  <button
                      onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(false);
                      }}
                      className="text-white/50"
                  >
                      ✕
                  </button>
                  </motion.div>
              </motion.div>

              <motion.span
                  whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)" }}
                  transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 20,
                  }}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                  {searchIcon}
              </motion.span>
          </div>
        </div>


        {/* Search Dropdown */}
        <AnimatePresence>
            {isSearchOpen && (
                <motion.div
                ref={searchRef}
                key="searchInput"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="fixed w-full flex items-center p-6 z-100  bg-black/20 backdrop-blur-2xl rounded-b-2xl"
                >
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 relative rounded-xl bg-white/10 text-white backdrop-blur-md focus:outline-none"
                />
                </motion.div>
            )}
        </AnimatePresence>
        {filteredVideos.length === 0 && (
        <div className="absolute flex w-full h-dvh z-80 bg-white/20 backdrop-blur-lg text-white/60 text-sm">
            <div className='flex flex-col w-full items-center justify-center'>
            <span className='text-2xl font-medium'>No results found.</span> 
            <span className='mt-2 font-medium text-white/40'>
                We can't find any media matching your search.
            </span>
            <div 
                onClick={() => setSearchTerm('')} 
                className='mt-8 flex gap-2 bg-gray-400/40 shadow-lg rounded-full p-4 items-center justify-center'
            >
                <span>{resetIcon}</span> 
                <span className='font-bold'>Reset search</span>
            </div>
            </div>
        </div>
        )}

        {/* Background Carousel Images */}
        <div className="absolute inset-0 -z-10 flex overflow-hidden min-h-full">
        {carouselShows.length > 0 && (
            <motion.div
            className="flex w-full h-full"
            initial={false}
            animate={{ 
                x: `-${currentIndex * 100}%`,
            }}
            transition={{ 
                x: { duration: 0.45, ease: "easeInOut" },
            }}
            style={{ width: `${carouselShows.length * 100}%` }}
            >
            {carouselShows.map((show) => (
                <div key={show.id} className="w-full h-full flex-shrink-0">
                <img 
                    src={show.background} 
                    className="w-full h-full object-cover" 
                    style={{ aspectRatio: "16/9" }} 
                    alt={show.title} 
                />
                </div>
            ))}
            </motion.div>
        )}
        </div>

        {/* Centered overlay card */}
       <div className="relative z-10 flex items-start justify-center w-full min-h-dvh">
             <div className="w-full min-h-dvh bg-black/20 backdrop-blur-sm">
               <motion.div
                className="flex flex-col p-6 mt-8 gap-8"
                layout
                transition={{
                    layout: { duration: 0.45, ease: "easeInOut" },
                }}
                >
                    
                    {/* New Media */}
                    <AnimatePresence mode="wait">
                    {searchTerm.trim() === "" && (
                        <motion.div
                        key="new-media"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="mt-2"
                        >
                        <div className="flex flex-row justify-between items-center">
                            <span className="text-white text-2xl">New Media</span>
                            <div className="flex flex-row gap-2 text-white/80 text-sm items-center">
                                Recently added {folderIcon}
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-center gap-2 mt-2">
                            {latestThree[0] && (
                            <motion.div
                                variants={newest1Variants}
                                initial="hidden"
                                animate="visible"
                                onClick={() => navigate(`/mobile-shows/${latestThree[0].id}`)}
                                className="size-60 rounded-2xl shadow-xl bg-cover bg-center"
                                style={{
                                backgroundImage: `url(${
                                    latestThree[0].card ||
                                    latestThree[0].keyart ||
                                    latestThree[0].mobilebackground
                                })`,
                                }}
                            >
                                <div className="size-12 p-2 bg-black/20 backdrop-blur-xs border border-white/30 rounded-tl-2xl rounded-br-2xl text-white text-xl">
                                {latestThree[0].ratings}
                                </div>
                            </motion.div>
                            )}

                            <div className="flex flex-col gap-2">
                            {latestThree[1] && (
                                <motion.div
                                variants={newest2Variants}
                                initial="hidden"
                                animate="visible"
                                onClick={() => navigate(`/mobile-shows/${latestThree[1].id}`)}
                                className="size-30 rounded-2xl shadow-lg bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${
                                    latestThree[1].card ||
                                    latestThree[1].keyart ||
                                    latestThree[1].mobilebackground
                                    })`,
                                }}
                                >
                                <div className="size-12 p-2 bg-black/20 backdrop-blur-xs border border-white/30 rounded-tl-2xl rounded-br-2xl text-white text-xl">
                                    {latestThree[1].ratings}
                                </div>
                                </motion.div>
                            )}

                            {latestThree[2] && (
                                <motion.div
                                variants={newest3Variants}
                                initial="hidden"
                                animate="visible"
                                onClick={() => navigate(`/mobile-shows/${latestThree[2].id}`)}
                                className="size-30 rounded-2xl shadow-lg bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${
                                    latestThree[2].card ||
                                    latestThree[2].keyart ||
                                    latestThree[2].mobilebackground
                                    })`,
                                }}
                                >
                                <div className="size-12 p-2 bg-black/20 backdrop-blur-xs border border-white/30 rounded-tl-2xl rounded-br-2xl text-white text-xl">
                                    {latestThree[2].ratings}
                                </div>
                                </motion.div>
                            )}
                            </div>
                        </div>
                        </motion.div>
                    )}
                    </AnimatePresence>



                    {/* All Media */}
                    <motion.div layout>
                        <div className="flex flex-row justify-between items-center mt-4 relative">
                            <span className="text-white text-2xl">All Media</span>

                            <div className="flex flex-row text-white/80 text-lg items-center relative">
                                <motion.button
                                type="button"
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setFilterOpen((v) => !v)}
                                className=""
                                >
                                {filterIcon}
                                </motion.button>

                                <AnimatePresence>
                                {filterOpen && (
                                    <motion.div
                                    ref={filterRef}
                                    initial={{ opacity: 0, x: 10, }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.28 }}
                                    className="absolute right-10 z-900 w-56 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 p-3 text-sm text-white space-y-2"
                                    >
                                    <div className="text-xs uppercase tracking-wide text-white/60 mb-1">
                                        Sort by
                                    </div>
                                    {[
                                        { id: "newest", label: "Newest" },
                                        { id: "oldest", label: "Oldest" },
                                        { id: "ratingHigh", label: "Highest Rated" },
                                        { id: "ratingLow", label: "Lowest Rated" },
                                        { id: "alpha", label: "Alphabetical (A–Z)" },
                                    ].map((opt) => (
                                        <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            setSortMode(opt.id);
                                            setFilterOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-xl transition ${
                                            sortMode === opt.id
                                            ? "bg-white/15 text-white"
                                            : "text-white/70 hover:bg-white/10"
                                        }`}
                                        >
                                        {opt.label}
                                        </button>
                                    ))}

                                    <div className="mt-2 text-xs uppercase tracking-wide text-white/60">
                                        Type
                                    </div>

                                    <div className="flex gap-2 mt-1">
                                        <button
                                        type="button"
                                        onClick={() => setTypeFilter("all")}
                                        className={`flex-1 px-2 py-1.5 rounded-xl text-xs transition ${
                                            typeFilter === "all"
                                            ? "bg-white/20 text-white"
                                            : "bg-white/5 text-white/70 hover:bg-white/10"
                                        }`}
                                        >
                                        All
                                        </button>

                                        <button
                                        type="button"
                                        onClick={() => setTypeFilter("TV")}
                                        className={`flex-1 px-2 py-1.5 rounded-xl text-xs transition ${
                                            typeFilter === "TV" 
                                            ? "bg-white/20 text-white"
                                            : "bg-white/5 text-white/70 hover:bg-white/10"
                                        }`}
                                        >
                                        TV
                                        </button>

                                        <button
                                        type="button"
                                        onClick={() => setTypeFilter("Movies")}
                                        className={`flex-1 px-2 py-1.5 rounded-xl text-xs transition ${
                                            typeFilter === "Movies" 
                                            ? "bg-white/20 text-white"
                                            : "bg-white/5 text-white/70 hover:bg-white/10"
                                        }`}
                                        >
                                        Movies
                                        </button>
                                    </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        key={`${sortMode}-${typeFilter}`} 
                        className="flex flex-col gap-2"
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredVideos.map((media) => (
                            <motion.div
                            key={media.id}
                            variants={itemVariants}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(`/mobile-shows/${media.id}`)}
                            className="flex flex-row items-center bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20 shadow-lg"
                            >
                                <img
                                    src={media.card || media.keyart || media.mobilebackground}
                                    alt={media.title}
                                    className="size-20 object-cover rounded-xl shadow-xl mb-2"
                                />

                                <div className="flex flex-col ml-2">
                                    <span className="text-white text-xl font-bold">
                                        {media.title}
                                    </span>
                                    <div className="flex flex-row items-center gap-2">
                                        <span className="text-white/60 text-sm">{media.creator}</span>
                                        <div className="flex flex-row text-sm items-center gap-1 text-white/60 font-light relative ">
                                            <span>{starIcon}</span>
                                            <span className="">{media.ratings}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </div>
    </div>

  )
}

export default Archive