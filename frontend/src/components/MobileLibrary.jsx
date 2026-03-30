import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useNavigate } from 'react-router-dom';
import styles from './modules/cardDesign.module.scss'
import ColorThief from 'colorthief';
import SearchXIcon from "../assets/icons/SearchXIcon.svg?react"
import { SHOWS } from './mobileshowsData';
import { useAuth } from './AuthContext.jsx';



{/* Grid Scroll */}
const chunkArray = (arr, size) => {
const chunks = [];
for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
}
return chunks;
};
const colorCache = new Map();





const MobileLibrary = () => {
const { activeProfile, updateActiveProfile } = useAuth();

  const searchIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
  const playIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-10" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>
  const profileIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/></svg>
  const starIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
  const resetIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/></svg>
  const showsIcon =<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" /></svg>
  const moviesIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" /></svg>
  const rightChevron = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>

{/* Nav Bar Active State */}
const tabs = [moviesIcon, showsIcon];
const [activeTab, setActiveTab] = useState('Shows');
const [isTabSwitching, setIsTabSwitching] = useState(false);
const tabSwitchTimeoutRef = useRef(null);

const archiveNavigate = () => {
navigate("/archive");
}

{/* Loading */}
const [imageLoaded, setImageLoaded] = useState({});
const [cardLoaded, setCardLoaded] = useState(false);

const handleImageLoad = (id) => {
setImageLoaded((prev) => ({
    ...prev,
    [id]: true,
}));
};

{/* Movie/Show Tabs */}
const TAB_CONFIG = [
{ id: "Movies", icon: moviesIcon },
{ id: "Shows", icon: showsIcon },
];

{/* Route Navigation */}
const navigate = useNavigate();
const handleNavigate = () => {
    navigate("/home");
};
{/* Back to Users */}
const handleBackToProfiles = () => {
sessionStorage.removeItem("showIntroFromUser");
navigate("/home");
window.location.reload();
};

{/* Carousel State */}
const shows = SHOWS;


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

{/* Current show */}
const filteredShows = shows.filter(show => 
(activeTab === 'Movies' ? show.type === 'Movies' : show.type === 'TV') &&
show.title.toLowerCase().includes(searchTerm.toLowerCase())
);

const [currentIndex, setCurrentIndex] = useState(0);
const carouselIntervalRef = useRef(null);
const restartCarouselTimer = () => {
  if (carouselIntervalRef.current) {
    clearInterval(carouselIntervalRef.current);
    carouselIntervalRef.current = null;
  }
  if (!filteredShows.length) return;
  carouselIntervalRef.current = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % filteredShows.length);
  }, 4000);
};
useEffect(() => {
  restartCarouselTimer();
  return () => {
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = null;
    }
  };
}, [filteredShows.length]);
useEffect(() => {
  if (!filteredShows.length) {
    setCurrentIndex(0);
    return;
  }
  setCurrentIndex((prev) => prev % filteredShows.length);
}, [filteredShows.length]);
const currentShow = filteredShows.length > 0 ? filteredShows[currentIndex % filteredShows.length] : null;



const [direction, setDirection] = useState('left');
const handleSwipe = (newIndex) => {
    if (newIndex > currentIndex) setDirection('left');
    else setDirection('right');
    setCurrentIndex(newIndex);
    restartCarouselTimer();
};

const switchTab = (nextTab) => {
    if (nextTab === activeTab) return;
    if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);

    setIsTabSwitching(true);
    tabSwitchTimeoutRef.current = setTimeout(() => {
        setActiveTab(nextTab);
        setCurrentIndex(0);
        setActivePage(0);
        if (sliderRef.current) {
            sliderRef.current.scrollTo({
                left: 0,
                behavior: "smooth",
            });
        }
        setIsTabSwitching(false);
    }, 130);
};




{/* Profile Picture */}
const fileInputRef = useRef(null);
const [profileImage, setProfileImage] = useState("/images/misc/profilepictureBlank.webp");
const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
    const reader = new FileReader();
    reader.onloadend = async () => {
        setProfileImage(reader.result);
        try {
          await updateActiveProfile?.({ avatar_url: reader.result });
        } catch (err) {
          console.error("Failed to save profile image", err);
        }
    };
    reader.readAsDataURL(file);
    }
};    
useEffect(() => {
setProfileImage(activeProfile?.avatar_url || "/images/misc/profilepictureBlank.webp");
}, [activeProfile?.avatar_url]);


{/* Grid 2x1 */}
const pages = chunkArray(filteredShows, 2);
const sliderRef = useRef(null);
const [activePage, setActivePage] = useState(0);
useEffect(() => {
const slider = sliderRef.current;
if (!slider) return;
const handleScroll = () => {
    const pageWidth = slider.clientWidth;
    const newIndex = Math.round(slider.scrollLeft / pageWidth);
    setActivePage(newIndex);
};
slider.addEventListener("scroll", handleScroll);
return () => slider.removeEventListener("scroll", handleScroll);
}, []);


{/* Dot Page Click */}
const handleDotClick = (index) => {
if (!sliderRef.current) return;
const slider = sliderRef.current;
const pageWidth = slider.clientWidth;

slider.scrollTo({
    left: pageWidth * index,
    behavior: "smooth",
});
};

{/* Card Carousel */}
const mod = (n, m) => ((n % m) + m) % m;

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

useEffect(() => {
  return () => {
    if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);
  };
}, []);


  return (
    <div className='relative w-full h-dvh flex flex-col overflow-hidden bg-black '>
        <style>
            {`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap'); 
            .nunito-font { 
                font-family: 'Nunito', sans-serif; 
            }`}
        </style>

        <AnimatePresence>
            {isSearchOpen && (
                <motion.div
                ref={searchRef}
                key="searchInput"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute w-full flex items-center px-6 z-100 min-h-[10%] bg-black/20 backdrop-blur-2xl rounded-b-2xl"
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
        {filteredShows.length === 0 && (
            <div className="absolute flex w-full h-dvh z-80 bg-white/20 backdrop-blur-lg text-white/60 text-sm">
               <div className='flex flex-col w-full items-center justify-center'>
                  <span className='text-2xl font-medium'>No results found.</span> 
                  <span className='mt-2 font-medium text-white/40'> We can't find any media matching your search. </span>
                  <div 
                    onClick={() => setSearchTerm('')} 
                    className='mt-8 flex gap-2 bg-gray-400/40 shadow-lg rounded-full p-4 items-center justify-center'
                >
                     <span> {resetIcon} </span> 
                     <span className='font-bold'> Reset search </span>
                  </div>
               </div>
            </div>
        )}

        {/* Background Carousel Images */}
        <div className={`h-dvh object-cover object-center w-full flex absolute z-0 overflow-hidden min-h-[300px] transition-opacity duration-200 ${isTabSwitching ? "opacity-0" : "opacity-100"}`}>
        {filteredShows.length > 0 && (
            <motion.div
            className="flex w-full h-full"
            initial={false}
            animate={{ 
                x: `-${currentIndex * 100}%`,
            }}
            transition={{ 
                x: { duration: 0.45, ease: "easeInOut" },
            }}
            style={{ width: `${filteredShows.length * 100}%` }}
            >
            {filteredShows.map((show, index) => (
                <div key={show.id} className="w-full h-full flex-shrink-0">
                <img 
                    src={show.background} 
                    className="w-full h-full object-cover" 
                    style={{ aspectRatio: "16/9" }} 
                    alt={show.title} 
                    loading={index === currentIndex ? "eager" : "lazy"}
                    decoding="async"
                />
                </div>
            ))}
            </motion.div>
        )}
        </div>


        {/* Title Carousel */}
        <div className='w-full flex bg-black/20 backdrop-blur-xs relative z-10 flex-1 min-h-0'>
            <div className="nunito-font w-full flex flex-col items-center flex-1 min-h-0 h-full">
                {/* Top nav bar */}
                <div className='w-full flex flex-row justify-between items-center p-2 text-white gap-2'>
                    <LayoutGroup>
                        <motion.div
                        layout
                        className="flex gap-2 items-center"
                        >
                            {TAB_CONFIG.map((tab) => {
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                key={tab.id}
                                type="button"
                                onClick={() => switchTab(tab.id)}
                                className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11"
                                >
                                {isActive && (
                                    <motion.div
                                    layoutId="activeTabPill"
                                    className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {/* Icon animation */}
                                <motion.span
                                    className="relative z-10"
                                    animate={{
                                    scale: isActive ? 1.15 : 0.95,
                                    opacity: isActive ? 1 : 0.6,
                                    rotate: isActive ? 0 : 0, 
                                    }}
                                    transition={{ type: "spring", stiffness: 550, damping: 24 }}
                                >
                                    {tab.icon}
                                </motion.span>
                                </button>
                            );
                            })}
                        </motion.div>
                    </LayoutGroup>
                    <div className="flex flex-row items-center gap-2">
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
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="w-full"
                  >
                {/* Card Row Content*/}
                <div className="relative w-full flex flex-col gap-4 justify-center items-center mt-4 px-4 text-white">
                    <motion.div
                        className="relative flex items-center justify-center w-full max-w-sm h-[260px] overflow-visible"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(event, info) => {
                        if (!filteredShows.length) return;
                        if (info.offset.x < -80) {
                            handleSwipe((currentIndex + 1) % filteredShows.length);
                        } else if (info.offset.x > 80) {
                            handleSwipe((currentIndex - 1 + filteredShows.length) % filteredShows.length);
                        }
                        }}
                    >
                        {filteredShows.map((show, index) => {
                        if (!filteredShows.length) return null;

                        const total = filteredShows.length;
                        const diff = mod(index - currentIndex, total);

                        let x = 0;
                        let scale = 1;
                        let opacity = 1;
                        let rotateY = 0;
                        let zIndex = 30;
                        let pointerEvents = "auto";

                        // center card
                        if (diff === 0) {
                            x = 0;
                            scale = 1.6;
                            opacity = 1;
                            rotateY = 0;
                            zIndex = 30;
                        }
                        // next on the right
                        else if (diff === 1) {
                            x = 120;
                            scale = 0.85;
                            opacity = 0.6;
                            rotateY = -18;
                            zIndex = 20;
                        }
                        // previous on the left
                        else if (diff === total - 1) {
                            x = -120;
                            scale = 0.85;
                            opacity = 0.6;
                            rotateY = 18;
                            zIndex = 20;
                        }
                        // everything else is hidden
                        else {
                            x = 0;
                            scale = 0.7;
                            opacity = 0;
                            rotateY = 0;
                            zIndex = 0;
                            pointerEvents = "none";
                        }

                        return (
                            <motion.div
                                key={show.id}
                                className="absolute rounded-3xl overflow-hidden shadow-2xl"
                                style={{ pointerEvents }}
                                initial={false}
                                animate={{ x, scale, opacity, rotateY, zIndex }}
                                transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 26,
                                }}
                                onClick={() => {
                                if (diff === 1) {
                                    handleSwipe((currentIndex + 1) % total);
                                } else if (diff === total - 1) {
                                    handleSwipe((currentIndex - 1 + total) % total);
                                } else if (diff === 0) {
                                    navigate(`/mobile-shows/${show.id}`);
                                }
                                }}
                            >
                                <div className="relative w-[180px] h-[180px]">
                                    {/* Pulsing skeleton while loading */}
                                    {!imageLoaded[show.id] && (
                                    <div className="absolute inset-0 rounded-3xl bg-black/60 animate-pulse" />
                                    )}

                                    <img
                                    src={show.card}
                                    alt={show.title}
                                    loading="lazy"
                                    decoding="async"
                                    onLoad={() => handleImageLoad(show.id)}
                                    className={`w-full h-full object-cover rounded-3xl transition-opacity duration-300 ${
                                        imageLoaded[show.id] ? "opacity-100" : "opacity-0"
                                    }`}
                                    />
                                </div>
                            </motion.div>
                        );
                        })}
                    </motion.div>
                    
                    <div className='w-full flex flex-col justify-center items-center mt-2 alexandria-font'>
                        <span className='text-white text-2xl'>{currentShow?.title}</span>
                        <span className='text-white/60'>{currentShow?.creator}</span>
                    </div>
                </div>



                {/* 2x2 Mobile Cards */}
                {pages.length > 0 && (
                <div className="w-full">
                    <motion.div whileTap={{ scale: 0.98 }} onClick={archiveNavigate} className='flex justify-end items-center pr-2 pb-1 text-white/70 alexandria-font'> View more {rightChevron} </motion.div>
                    {/* Horizontal snapping container */}
                    <div ref={sliderRef} className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
                    <div className="flex w-full p-1">
                        {pages.map((page, pageIndex) => (
                        <div
                            key={pageIndex}
                            className="snap-center shrink-0 w-full px-2 pb-2 mx-2 rounded-2xl"
                        >
                            <div className="grid grid-cols-2 gap-3 items-center justify-center">
                            {page.map((show) => (
                                <motion.button
                                key={show.id}
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() => navigate(`/mobile-shows/${show.id}`)}
                                className="relative rounded-2xl w-full flex justify-center"
                                >
                                    <div className="relative w-[80%] aspect-[2/3]"> 
                                        {!imageLoaded[show.id] && (
                                            <div className="absolute inset-0 rounded-2xl border border-white/30 bg-black/60 animate-pulse" />
                                        )}

                                        {/* Actual image */}
                                        <img
                                            src={show.keyart}
                                            alt={show.title}
                                            loading="lazy"
                                            decoding="async"
                                            onLoad={() => handleImageLoad(show.id)}
                                            className={`w-full h-full object-cover rounded-2xl border border-white/40 transition-opacity duration-300 ${
                                            imageLoaded[show.id] ? "opacity-100" : "opacity-0"
                                            }`}
                                        />
                                    </div>

                                        
                                </motion.button>
                            ))}
                            </div>

                        </div>
                        ))}
                    </div>
                    </div>
                </div>
                )}
                {/* Page Indicator Dots */}
                <div className="flex justify-center items-center gap-2 z-900">
                {pages.map((_, i) => (
                    <motion.button
                    key={i}
                    type="button"
                    onClick={() => handleDotClick(i)}
                    className="h-2 rounded-full bg-white"
                    animate={{
                        width: activePage === i ? 8 : 8,
                        opacity: activePage === i ? 1 : 0.4,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                ))}
                </div>
                </motion.div>
                </AnimatePresence>
            </div>
        </div>

    </div>
  )
}

export default MobileLibrary
