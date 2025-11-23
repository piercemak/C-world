import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SHOWS } from './mobileshowsData';

const Archive = () => {

const rightChevron = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
const searchIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>


{/* Current show */}
const videos = SHOWS;
const carouselShows = videos; 

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


  return (
    <div className="relative w-full h-dvh alexandria-font">
        {/* Home Nav */}
        <motion.div
            whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)" }} 
            transition={{
                type: "spring",
                stiffness: 600,
                damping: 20    
            }}     
            onClick={handleNavigate}
            className="size-10 z-90 fixed m-2 text-white bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-full shadow-md"
        >
            {homeIcon}
        </motion.div>

        {/* Search */}
        <AnimatePresence>
            {isSearchOpen && (
                <motion.div
                ref={searchRef}
                key="searchInput"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-20 w-full px-6 z-100"
                >
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white/10 text-white backdrop-blur-md focus:outline-none"
                />
                </motion.div>
            )}
        </AnimatePresence>
        {carouselShows.length === 0 && (
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
        <div className='h-dvh object-cover object-center w-full flex absolute z-0 overflow-hidden min-h-[300px]'>
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
        <div className="relative z-10 flex items-center justify-center w-full h-full">
            <div className="w-full h-full bg-black/20 backdrop-blur-sm ">
                <div className="flex flex-col p-6">
                    {/* Top nav bar */}
                    <div className='w-full flex flex-row justify-end p-2 text-white gap-2 mb-4'>
                        <motion.span 
                            whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)" }} 
                            transition={{
                                type: "spring",
                                stiffness: 600,
                                damping: 20,    
                            }}
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className=''
                        > 
                            {searchIcon} 
                        </motion.span>
                    </div>

                    {/* New Media */}
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-white text-2xl">New Media</span>
                        <div className="flex flex-row text-white/80 text-lg items-center">More {rightChevron}</div>
                    </div>
                    <div className="flex flex-row items-center justify-center gap-2 mt-8">
                        <div className="size-60 bg-red-500 rounded-2xl"></div>
                        <div className="flex flex-col gap-2">
                            <div className="size-30 bg-green-500 rounded-2xl"></div>
                            <div className="size-30 bg-blue-500 rounded-2xl"></div>
                        </div>
                    </div>

                    {/* All Media */}
                    <div className="flex flex-row justify-between items-center mt-8">
                        <span className="text-white text-2xl">All Media</span>
                        <div className="flex flex-row text-white/80 text-lg items-center">More {rightChevron}</div>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        {videos.map((media) => (
                            <motion.div
                            key={media.id}
                            whileTap={{ scale: 0.97 }}
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
                                    <span className="text-white/60 text-sm">
                                        {media.creator}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>


                </div>
            </div>
        </div>
    </div>

  )
}

export default Archive