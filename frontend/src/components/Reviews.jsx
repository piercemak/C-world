import React from 'react'
import StarReview from './StarReview'
import AnimatedNumber from './AnimatedNumber'
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import PlusSign from './PlusSign';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { REVIEWS_SHOWS } from "../data/reviewsShowsData.js";



const shows = REVIEWS_SHOWS;

const Reviews = () => {

const dragIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></svg>
const editIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-4" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/></svg>
const calendarIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className='' viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></svg>
const filterIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className='size-5' viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>
const eyeoutlineIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className='size-5' viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>
const eyefillIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className='size-5' viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/></svg>
const plusIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className='' viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg>
const checkIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className='hover:text-green-300 transition-colors duration-200'><path fill-rule="evenodd" d="M9 1.5H5.625c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5Zm6.61 10.936a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 14.47a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" /></svg>
const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className='hover:text-green-300 transition-colors duration-200'><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>
const starIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className='hover:text-green-300 transition-colors duration-200'><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
const minusIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class=""><path fill-rule="evenodd" d="M4.25 12a.75.75 0 0 1 .75-.75h14a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /></svg>




const [reviewList, setReviewList] = useState(() => {
  const savedOrder = localStorage.getItem('reviewListOrder');
  const allEntries = Object.entries(shows);
  if (savedOrder) {
    const parsed = JSON.parse(savedOrder);
    const mapped = parsed
      .map((id) => allEntries.find(([entryId]) => entryId === id))
      .filter(Boolean);

    const missing = allEntries.filter(
      ([entryId]) => !parsed.includes(entryId)
    );

    return [...mapped, ...missing];
  }
  return allEntries;
});

const navigate = useNavigate();
  const handleNavigate = () => {
    navigate("/home");
  };



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
      const cloudKeys = [
        "misc/waterfallLoop.mp4",
      ];
      const randomIndex = Math.floor(Math.random() * cloudKeys.length);
      const selectedKey = cloudKeys[randomIndex];
      const signed = await fetchSignedUrl(selectedKey);
      setVideoUrl(signed);
    };
    getSignedUrl();
  }, []);



const [currentShowId, setCurrentShowId] = useState(reviewList[0]?.[0]);
useEffect(() => {
  if (reviewList.length === 0) return;
  const newTopId = reviewList[0][0];
  if (newTopId !== currentShowId) {
    const timeout = setTimeout(() => {
      setCurrentShowId(newTopId);
    }, 350); 
    return () => clearTimeout(timeout);
  }
}, [reviewList]);

const SortableReview = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });
  const style = {
    width: '100%',
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
);

const handleDragEnd = (event) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = reviewList.findIndex(([id]) => id === active.id);
  const newIndex = reviewList.findIndex(([id]) => id === over.id);
  const updatedList = arrayMove(reviewList, oldIndex, newIndex);
  setReviewList(updatedList);
  localStorage.setItem('reviewListOrder', JSON.stringify(updatedList.map(([id]) => id)));
};


const prevPositions = useRef({});
useEffect(() => {
  const updated = {};
  reviewList.forEach(([id], idx) => {
    updated[id] = idx;
  });
  prevPositions.current = updated;
}, [reviewList]);

{/* Add/Save a Review */}
const [reviewText, setReviewText] = useState('');
const [isEditing, setIsEditing] = useState(false);
const [reviews, setReviews] = useState(() => {
  // load all saved reviews from localStorage on mount
  const saved = localStorage.getItem('reviews');
  return saved ? JSON.parse(saved) : {};
});



{/* Date Picker */}
const [selectedRating, setSelectedRating] = useState({});
const [watchedDate, setWatchedDate] = useState('');
const inputRef = useRef(null);
const handelSaveReview = (showId) => {
  const updated = {
    ...reviews,
    [showId]: {
      text: reviewText,
      date: watchedDate,
      genres: selectedGenres,
    }
  };
  setReviews(updated);
  localStorage.setItem('reviews', JSON.stringify(updated));
  setIsEditing(false); 
};
useEffect(() => {
  const savedReview = reviews[currentShowId];
  if (savedReview) {
    setReviewText(savedReview.text || '');
    setWatchedDate(savedReview.date || '');
    setSelectedGenres(savedReview.genres || []);
  } else {
    setReviewText('');
    setWatchedDate('');
  }
}, [currentShowId, reviews]);

{/* Watchlist */}
const [watchlistFilter, setWatchlistFilter] = useState('all'); 
const [showFilterBox, setShowFilterBox] = useState(false);
const [watchlist, setWatchlist] = useState(() => {
  const saved = localStorage.getItem('watchlist');
  return saved ? JSON.parse(saved) : [];
});
const toggleWatchlist = (id) => {
  setWatchlist((prev) => {
    const updated = prev.includes(id)
      ? prev.filter((item) => item !== id)
      : [...prev, id];
    localStorage.setItem('watchlist', JSON.stringify(updated));
    return updated;
  });
};
const WatchlistToggleButton = ({ id }) => {
  const isInWatchlist = watchlist.includes(id);
  return (
    <motion.button
      className={`group relative p-2 rounded-full transition-all cursor-pointer ${
        isInWatchlist ? "text-green-300/60 hover:text-red-300/60" : "text-white"
      }`}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      onClick={() => toggleWatchlist(id)}
    >
      {isInWatchlist ? (
        eyefillIcon
      ) : (
        <span className="relative block size-5">
          <span className="absolute inset-0 opacity-100 transition-opacity duration-200">
            {eyeoutlineIcon}
          </span>
          <span className="absolute inset-0 text-green-300/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {eyefillIcon}
          </span>
        </span>
      )}
    </motion.button>
  );
};


{/* Logo Interaction */}
const leftReviewRef = useRef(null);
const handleLogoClick = (id) => {
  if (id !== currentShowId) {
    setCurrentShowId(id);
  }

  setTimeout(() => {
    leftReviewRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, 300);
};

{/* Genre Tags */}
const [selectedGenres, setSelectedGenres] = useState([]);
const [genreInput, setGenreInput] = useState('');
const allGenres = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy',
  'Crime', 'Documentary', 'Drama', 'Fantasy', 'Historical',
  'Horror', 'Musical', 'Mystery', 'Romance', 'Sci-Fi',
  'Thriller', 'War', 'Western', 'Family', 'Superhero',
  'Psychological', 'Sports', 'Coming-of-Age', 'Slice of Life'
];



{/* Pagination */}
const [showBlankPage, setShowBlankPage] = useState(false);
const [pageIndex, setPageIndex] = useState(1); // 0 = Default, 1 = Blank, 2 = Custom
const [dropdownOpen, setDropdownOpen] = useState(false);
const pageOptions = ["Main", "Watched", "Custom Page"];
const pageIcons = [
  homeIcon,    
  starIcon,   
  checkIcon,    
];


{/* Film grid */}
const [filmGrid, setFilmGrid] = useState(() => {
  const saved = localStorage.getItem('filmGrid');
  return saved ? JSON.parse(saved) : [];
});
useEffect(() => {
  localStorage.setItem('filmGrid', JSON.stringify(filmGrid));
}, [filmGrid]);
const [showLibraryModal, setShowLibraryModal] = useState(false);

const location = useLocation();
useEffect(() => {
  if (location.pathname === '/home') {
    setPageIndex(0);
  }
}, [location.pathname]);




return (
    <div className="relative h-dvh w-full overflow-hidden">
        {/* Background Video */}
        {videoUrl && (
            <video
                className="absolute top-0 left-0 w-full h-dvh object-cover z-[2]"
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
            />
        )} 

        {/* Foreground Content */}
        <div className="relative z-10 flex justify-center items-center h-full px-12">
            <div className="flex flex-row review-border backdrop-blur-sm bg-transparent w-full h-[98%] 2xl:h-[750px]">              
                {/* Review Content */}
                <div className='w-[60%] 2xl:w-[45%] h-full rounded-l-[15px] justify-center flex items-center'>
                    <div className="absolute top-0 right-0 justify-end p-8 z-50 2xl:block hidden">
                        <motion.div>
                            <PlusSign 
                                pageOptions={pageIcons}
                                pageIndex={pageIndex}
                                setPageIndex={setPageIndex}                                
                            />
                        </motion.div>

                        <AnimatePresence>
                            {dropdownOpen && (
                            <motion.ul
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 mt-2 w-40 bg-black/70 border border-white/10 rounded-md shadow-md text-sm overflow-hidden"
                            >
                                {pageIcons.map((label, i) => (
                                <li
                                    key={label}
                                    className={`px-4 py-2 text-white/80 hover:bg-white/20 cursor-pointer transition-all ${
                                    i === pageIndex ? "bg-white/10" : ""
                                    }`}                                   
                                >
                                    {label}
                                </li>
                                ))}
                            </motion.ul>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="absolute top-58 -right-[46px] justify-end flex flex-col gap-6 p-2 z-50 2xl:hidden bg-transparent backdrop-blur-3xl border border-white/80 rounded-full">
                        <motion.span 
                            whileTap={{
                            scale: 0.9,
                            transition: {
                            type: 'spring',
                            stiffness: 500,
                            damping: 10,
                            },
                            }}
                            whileHover={{
                                scale: 1.05,
                                transition: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 10,
                                },
                            }} 
                            onClick={handleNavigate}     
                            className='text-white size-6 cursor-pointer'
                        >
                            {homeIcon}
                        </motion.span>
                        <motion.span 
                            whileTap={{
                            scale: 0.9,
                            transition: {
                            type: 'spring',
                            stiffness: 500,
                            damping: 10,
                            },
                            }}
                            whileHover={{
                                scale: 1.05,
                                transition: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 10,
                                },
                            }} 
                            onClick={() => setPageIndex(1)} 
                            className={`size-6 cursor-pointer ${
                                pageIndex === 1 ? 'text-green-300/70' : 'text-white'
                            }`}
                        >
                            {starIcon}
                        </motion.span>
                        <motion.span 
                            whileTap={{
                            scale: 0.9,
                            transition: {
                            type: 'spring',
                            stiffness: 500,
                            damping: 10,
                            },
                            }}
                            whileHover={{
                                scale: 1.05,
                                transition: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 10,
                                },
                            }} 
                            onClick={() => setPageIndex(2)} 
                            className={`size-6 cursor-pointer ${
                                pageIndex === 2 ? 'text-green-300/70' : 'text-white'
                            }`}
                        >
                            {checkIcon}
                        </motion.span>
                    </div>                                           
                <AnimatePresence mode="wait">
                    {pageIndex === 1 && (
                        <motion.div
                        key="review"
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.4 }}
                        className="bg-black/30 w-full h-[90%] mx-8 rounded-2xl border-t-2 border-t-white/50"
                        >
                        <div 
                        style={{
                            backgroundImage: `url(${shows[currentShowId]?.background})`
                        }}                        
                        className='w-full h-[55%] flex flex-row justify-center items-end bg-cover bg-center rounded-t-2xl'
                        >
                        <motion.span
                            key={currentShowId} 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            className="text-white font-bold text-[60px] p-2"
                            style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.6)' }}
                            >
                            {shows[currentShowId]?.title}
                        </motion.span>                     
                        </div>
                        <div className='flex flex-row w-full h-full'>
                        <div className='w-[50%] h-[45%] flex justify-center items-center'>
                            <div className='bg-white/10 w-[90%] h-[90%] rounded-2xl p-2'>
                               <div className='w-full flex justify-between h-[15%] items-center'>
                                    {/* Date Picker */}
                                    <div 
                                        className='w-full flex flex-row items-center'
                                        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.focus()}
                                    >
                                        <span className='text-white/70 text-[14px] font-semibold'>Watched on</span>
                                        <motion.div
                                        whileTap={{
                                        scale: 0.9,
                                        transition: {
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 10,
                                        },
                                        }}
                                        whileHover={{
                                            scale: 1.05,
                                            transition: {
                                            type: 'spring',
                                            stiffness: 300,
                                            damping: 10,
                                            },
                                        }}                                          
                                        >
                                        </motion.div>
                                        {isEditing ? (
                                        <>
                                            <input
                                            type="date"
                                            ref={inputRef}
                                            className="text-blue-200/90 pl-1 rounded outline-none focus:ring-0 text-[14px] font-semibold cursor-pointer w-[98px] select-none"
                                            value={watchedDate}
                                            onChange={(e) => setWatchedDate(e.target.value)}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                inputRef.current?.showPicker?.(); 
                                            }}
                                            />    
                                            <span 
                                            className='size-4 text-blue-200/90 cursor-pointer'
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                inputRef.current?.showPicker?.(); 
                                            }}                                            
                                            >
                                            {calendarIcon}
                                            </span>
                                        </>
                                        ) : (
                                        <span className="text-blue-200/90 pl-2 text-[14px] font-semibold">
                                            {reviews[currentShowId]?.date || "Not set"}
                                        </span>
                                        )}
                                    </div>
                                    
                                    <motion.div 
                                        className='flex flex-row gap-1 items-center font-semibold cursor-pointer text-white/70'
                                        whileTap={{
                                        scale: 0.9,
                                        transition: {
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 10,
                                        },
                                        }}
                                        whileHover={{
                                            scale: 1.05,
                                            transition: {
                                            type: 'spring',
                                            stiffness: 300,
                                            damping: 10,
                                            },
                                        }} 
                                        onClick={() => {
                                            setIsEditing(true); 
                                            const saved = reviews[currentShowId];
                                            if (saved) {
                                            setReviewText(saved.text || '');
                                            setWatchedDate(saved.date || '');
                                            }
                                        }}                                                                            
                                    >
                                        <span className='text-[14px]'>Edit</span>
                                        {editIcon}
                                    </motion.div>
                               </div>
                                {reviews[currentShowId]?.text && !isEditing ? (
                                <div className='w-full h-[80%] flex flex-col justify-between bg-white/20 p-4 rounded-xl text-white'>
                                    <div className='text-sm whitespace-pre-line flex flex-col justify-center items-center h-full text-center text-white/90 font-bold italic'>
                                        {reviews[currentShowId].text}
                                        <div className='flex flex-row mt-2'>
                                            <span className='font-normal'>Watched by</span>
                                            <span className='font-bold pl-1 text-white'>Ceara</span>
                                            <span className='pl-1 text-white font-normal'>{reviews[currentShowId].date}</span>
                                        </div>                                                                    
                                    </div>

                                    <div className="flex flex-row justify-center gap-2 mb-2 ">
                                        {reviews[currentShowId]?.genres?.map((g) => (
                                        <motion.span 
                                            key={g} 
                                            className="bg-green-300/20 hover:bg-green-400/20 hover:text-green-300/80 not-italic text-white/90 font-bold text-xs px-2 py-1 rounded-lg cursor-pointer flex items-center gap-[7px]"
                                            whileHover={{
                                                scale: 1.1,
                                                transition: { type:"spring", stiffness: 300 }
                                            }}

                                        >
                                            <span className='size-[6px] bg-green-500 rounded-full'>
                                            </span>
                                            <span className='absolute size-[6px] bg-green-300 rounded-full animate-ping'> </span>
                                            <span>{g}</span>
                                        </motion.span>
                                        ))}
                                    </div>  

                                    <div className="flex justify-between items-center pointer-events-none">
                                    <StarReview showId={currentShowId} />
                                    </div>
                                </div>
                                ) : (
                                <div className='w-full h-[80%] flex flex-col bg-white/20 p-2 rounded-xl'>                                                                                                   
                                    <textarea
                                    className="w-full h-full resize-none p-2 rounded text-white/70 outline-none focus:outline-none scrollbar-hidden"
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Add a review..."
                                    />

                                    {/* 🔽 INSERT GENRE AUTOFILL INPUTS HERE */}
                                    <div className="w-[full] flex flex-row overflow-x-scroll scrollbar-hidden gap-2 h-[60%] items-center">
                                        {/* Input with autocomplete */}
                                        <input
                                            type="text"
                                            value={genreInput}
                                            onChange={(e) => setGenreInput(e.target.value)}
                                            placeholder="Add tags..."
                                            className="px-3 py-1 rounded-full text-sm text-white/80 bg-black/30 border border-white/20 outline-none"
                                        />

                                        {/* Autofill suggestions */}
                                        <div className="flex flex-row overflow-clip gap-2 items-center">
                                            {allGenres
                                            .filter(
                                                (g) =>
                                                g.toLowerCase().startsWith(genreInput.toLowerCase()) &&
                                                !selectedGenres.includes(g)
                                            )
                                            .slice(0, 5)
                                            .map((genre) => (
                                                <span
                                                key={genre}
                                                className={`px-2 py-1 rounded-lg text-xs cursor-pointer transition-all text-nowrap ${
                                                    selectedGenres.length >= 3
                                                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                                                    : "bg-white/10 text-white hover:bg-white/20"
                                                }`}
                                                onClick={() => {
                                                    if (selectedGenres.length >= 3) return;
                                                    setSelectedGenres([...selectedGenres, genre]);
                                                    setGenreInput('');
                                                }}
                                                >
                                                {genre}
                                                </span>
                                            ))}
                                        </div>
                                    </div> 
                                    {/* Selected genre tags with animation */}
                                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                        <AnimatePresence>
                                            {selectedGenres.map((genre) => (
                                            <motion.span
                                                key={genre}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.6, opacity: 0 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                                className="bg-green-300/20 text-white px-2 py-1 rounded-lg text-xs cursor-pointer hover:bg-green-400/20"
                                                onClick={() =>
                                                setSelectedGenres((prev) => prev.filter((g) => g !== genre))
                                                }
                                            >
                                                <span className='font-bold'>{genre}</span>
                                                <span className='ml-2'>✕</span>
                                            </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </div>                    

                                    <div className='flex w-full justify-between'>
                                    <StarReview showId={currentShowId} />
                                    <motion.button
                                        whileTap={{
                                        scale: 0.9,
                                        transition: { type: 'spring', stiffness: 500, damping: 10 },
                                        }}
                                        className="mt-2 bg-white/20 text-white py-1 px-4 rounded-full hover:bg-white/30 w-20 cursor-pointer"
                                        onClick={() => handelSaveReview(currentShowId)} 
                                    >
                                        Save
                                    </motion.button>
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>


                        <div className='w-[50%] h-[45%] flex justify-center items-center'>
                            <div className='bg-white/10 w-[90%] h-[90%] rounded-2xl p-2'>
                               <div className='w-full flex justify-between h-[15%] items-center'>
                                    {/* Watchlist */}
                                    <div className='w-full flex flex-row items-center'>
                                        <span className='text-white/70 text-[14px] font-semibold'>Watchlist</span>
                                    </div>                                  
                                    <div className="relative">
                                        <motion.div 
                                            className='flex flex-row gap-1 items-center font-semibold cursor-pointer text-white/70'
                                            whileTap={{
                                            scale: 0.9,
                                            transition: { type: 'spring', stiffness: 500, damping: 10 },
                                            }}
                                            whileHover={{
                                            scale: 1.05,
                                            transition: { type: 'spring', stiffness: 300, damping: 10 },
                                            }}
                                            onClick={() => setShowFilterBox(prev => !prev)} 
                                        >
                                            <span className='text-[14px]'>Filter</span>
                                            {filterIcon}
                                        </motion.div>

                                        <AnimatePresence>
                                            {showFilterBox && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                className="absolute right-0 mt-2 bg-black/30 backdrop-blur-3xl rounded-md p-2 shadow-lg z-50 w-32 text-white text-sm"
                                            >
                                                <div 
                                                onClick={() => { setWatchlistFilter('all'); setShowFilterBox(false); }} 
                                                className="hover:bg-white/20 px-3 py-1 rounded cursor-pointer"
                                                >
                                                All
                                                </div>
                                                <div 
                                                onClick={() => { setWatchlistFilter('show'); setShowFilterBox(false); }} 
                                                className="hover:bg-white/20 px-3 py-1 rounded cursor-pointer"
                                                >
                                                Shows
                                                </div>
                                                <div 
                                                onClick={() => { setWatchlistFilter('movie'); setShowFilterBox(false); }} 
                                                className="hover:bg-white/20 px-3 py-1 rounded cursor-pointer"
                                                >
                                                Movies
                                                </div>
                                            </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                               </div>
                                <div className='w-full h-[80%] flex flex-col bg-white/20 p-2 rounded-xl'>
                                <div
                                    className="w-full h-full resize-none p-2 rounded text-black outline-none focus:outline-none overflow-y-scroll review-scrollbar">
                                    <AnimatePresence>
                                    {watchlist
                                    .filter((id) => {
                                        if (watchlistFilter === 'all') return true;
                                        const show = shows[id];
                                        return show?.type === watchlistFilter;
                                    })
                                    .map((id) => {
                                        const show = shows[id];
                                        if (!show) return null;
                                        return (
                                        <motion.div
                                            key={id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            layout
                                            className="flex items-center justify-between mb-2 p-2 bg-white/10 rounded-xl"
                                        >
                                            <div className="flex items-center gap-2">
                                            <img src={show.logo} alt={show.title} className="w-10 h-10 object-contain rounded-md" />
                                            <span className="text-white text-sm font-medium">{show.title}</span>
                                            </div>
                                            <WatchlistToggleButton id={id} />
                                        </motion.div>
                                        );
                                    })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>  
                </div>                                                
            </motion.div>
            )}

            {pageIndex === 2 && (
                <motion.div
                key="films"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
                className="bg-black/30 w-full h-[90%] mx-8 rounded-2xl border-t-2 border-t-white/50 p-6 overflow-y-scroll review-scrollbar relative"
                >
                {filmGrid.length === 0 ? (
                    <div className="w-full h-full flex flex-col justify-center items-center gap-y-8">
                        <div className='flex flex-col gap'>
                            <span className='text-white text-center font-bold text-[28px]'>Watched films</span>
                            <span className='text-white/60 text-center font-normal mt-2 text-[15px]'>Select from a list of your films/TV shows and add them to your collection here</span>
                        </div>
                        <motion.div 
                            className='size-[260px] border-3 border-green-300/60 bg-white/20 backdrop-blur-2xl rounded-2xl flex flex-col items-center justify-center cursor-pointer group'       
                            whileTap={{
                                scale: 0.9,
                                transition: {
                                type: 'spring',
                                stiffness: 500,
                                damping: 10,
                                },
                            }}
                            whileHover={{
                                scale:1.05
                            }}
                            onClick={() => setShowLibraryModal(true)}                                                                                                                            
                        >
                            <div className='size-20 bg-green-200/40 rounded-full flex items-center justify-center'>
                                <span className='size-12 text-green-300/70'>{plusIcon}</span>
                            </div>
                            <span 
                                className='mt-8 text-white text-[24px] font-bold group-hover:text-green-300 duration-300 transition-colors'
                            >
                                Add Film
                            </span>
                        </motion.div>
                    </div>
                    ) : (
                    
                    <div className="grid grid-cols-3 gap-6 mt-10">
                        <span className='w-full h-[1px] left-0 -mt-4 bg-white/60 absolute'></span>
                        <span className='absolute top-2 left-4 size-10 flex items-center text-white text-[20px] font-bold tracking-wide'>Watched</span>
                        <motion.div
                            className='absolute text-white top-2 right-12 size-10 cursor-pointer hover:text-white/60 duration-300 transition-colors'
                            whileTap={{
                                scale: 0.9,
                                transition: {
                                type: 'spring',
                                stiffness: 500,
                                damping: 10,
                                },
                            }}
                            whileHover={{
                                scale: 1.05,
                            }}
                            onClick={() => {
                                setFilmGrid((prev) => prev.slice(0, -1)); // remove last item
                            }}
                            >
                            <span>{minusIcon}</span>
                        </motion.div>

                        <motion.div 
                            className='absolute text-white top-2 right-2 size-10 cursor-pointer hover:text-white/60 duration-300 transition-colors'
                            whileTap={{
                                scale: 0.9,
                                transition: {
                                type: 'spring',
                                stiffness: 500,
                                damping: 10,
                                },
                            }}
                            whileHover={{
                                scale:1.05
                            }}
                            onClick={() => setShowLibraryModal(true)}                              
                        >                     
                            <span className=''>{plusIcon}</span>
                        </motion.div>
                        <AnimatePresence>
                            {filmGrid.map((id) => {
                                const item = shows[id];
                                if (!item) return null;

                                return (
                                <motion.div
                                    key={id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative bg-white/10 rounded-xl p-4 flex flex-col items-center hover:bg-white/20 transition-all cursor-pointer"
                                    onClick={() => handleLogoClick(id)}
                                >
                                    {item.logo && (
                                    <img
                                        src={item.logo}
                                        alt={item.title}
                                        className="w-32 h-32 object-contain mb-4"
                                    />
                                    )}
                                    <div className="flex items-center justify-center w-full">
                                    <span className="text-white font-bold text-center text-sm">
                                        {item.title}
                                    </span>
                                    </div>
                                    <span className="text-white/60 text-xs italic mt-1">
                                    {item.genre}
                                    </span>
                                </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}


                {/* Library Modal */}
                <AnimatePresence>
                    {showLibraryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex rounded-xl justify-center items-center"
                        onClick={() => setShowLibraryModal(false)}
                    >
                        <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-black/90 rounded-xl p-6 max-h-[80vh] w-[600px] overflow-y-auto text-white review-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                        >
                        <h2 className="text-xl mb-4 font-bold text-center">Add from Library</h2>
                        <div className="grid grid-cols-2 gap-4">
                        {Object.entries(shows).map(([id, item]) => {
                            const isAlreadyAdded = filmGrid.includes(id);
                            return (
                                <div
                                key={id}
                                onClick={() => {
                                    if (isAlreadyAdded) return;
                                    setFilmGrid((prev) => [...prev, id]);
                                    setShowLibraryModal(false);
                                }}
                                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                                    isAlreadyAdded
                                    ? "bg-white/5 text-white/40 cursor-not-allowed"
                                    : "bg-white/10 hover:bg-white/20 cursor-pointer"
                                }`}
                                >              
                                    <img
                                        src={item.logo}
                                        alt={item.title}
                                        className={`w-10 h-10 object-contain ${
                                        isAlreadyAdded ? "opacity-30 grayscale" : ""
                                        }`}
                                    />
                                    <div>
                                        <div className={`font-semibold ${isAlreadyAdded ? "text-white/40" : ""}`}>
                                        {item.title}
                                        </div>
                                        <div className="text-xs text-white/60">{item.genre}</div>
                                    </div>  
                                    {isAlreadyAdded && (
                                        <motion.div
                                        className="ml-auto text-white size-6 cursor-pointer hover:text-white/60 duration-300 transition-colors"
                                        whileTap={{
                                            scale: 0.9,
                                            transition: {
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 10,
                                            },
                                        }}
                                        whileHover={{
                                            scale: 1.05,
                                        }}
                                        onClick={() => {

                                            setFilmGrid((prev) => prev.filter((entry) => entry !== id));
                                        }}
                                        >
                                        <span>{minusIcon}</span>
                                        </motion.div>
                                    )}                                    
                                                                       
                                </div>
                            );
                        })}
                        </div>
                        </motion.div>
                    </motion.div>
                    )}
                </AnimatePresence>
                </motion.div>
            )}


            {pageIndex === 3 && (
                <motion.div
                key="custom"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.4 }}
                className="bg-black/30 w-full h-[90%] mx-8 rounded-2xl border-t-2 border-t-white/50 flex justify-center items-center"
                >
                <span className="text-white/50 text-xl italic">Custom Page Content</span>
                </motion.div>
            )}

            </AnimatePresence>
                </div>

                <div className='flex flex-col items-center pt-10 pr-16 w-[40%] 2xl:w-[55%] h-full rounded-r-[15px] overflow-y-auto review-scrollbar'>
                {/* DYNAMIC REVIEWS LIST: Clones of the above */}
                <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={reviewList.map(([id]) => id)} strategy={verticalListSortingStrategy}>
                        {reviewList
                        .map(([id, show], index) => {
                            const previousIndex = prevPositions.current[id];
                            const hasMoved = previousIndex !== undefined && previousIndex !== index;

                            return (
                            <SortableReview key={id} id={id}>
                                <div className='flex flex-row justify-between items-center w-full h-40 px-8'>
                                {/* Left: Key Art + Title/Genre */}
                                <div className="flex flex-row items-center">
                                    <AnimatePresence mode="wait">
                                    {hasMoved ? (
                                        <motion.div
                                        key={`${id}-${index}`}
                                        initial={{ y: -10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 10, opacity: 0 }}
                                        transition={{ 
                                            duration: 0.5,
                                            delay: index * 0.25 
                                        }}
                                        className="mr-4 text-white font-bold"
                                        >
                                        {index + 1}
                                        </motion.div>
                                    ) : (
                                        <div className="mr-4 text-white font-bold">{index + 1}</div>
                                    )}
                                    </AnimatePresence>

                                    <motion.img
                                    src={show.logo}
                                    className="size-28 object-cover rounded-lg cursor-pointer hover:opacity-70"
                                    alt={show.title}
                                    onClick={() => handleLogoClick(id)}
                                    whileTap={{
                                        scale:0.9,
                                        transition: { type: 'spring', stiffness: 500, damping: 0 },
                                    }}
                                    />

                                    <div className='flex flex-col ml-8'>
                                    <span className='text-white font-bold'>{show.title}</span>
                                    <span className='text-white/40 font-light'>{show.genre}</span>
                                    <div className='pointer-events-none top-4 -left-1 2xl:top-0 2xl:left-0 relative 2xl:hidden'><StarReview showId={id} /></div>
                                    </div>
                                </div>

                                <div className='flex flex-row items-center relative left-18 2xl:left-0'>
                                   <div className='mr-4 pointer-events-none relative md:hidden 2xl:block'><StarReview showId={id} /></div>
                                    <div className='mr-0 2xl:mr-4'>
                                        <WatchlistToggleButton id={id} />
                                    </div>
                                    <span className='text-white/40 cursor-pointer'>{dragIcon}</span>
                                </div>
                                </div>

                                <div className='flex w-full justify-center'>
                                    <div className='w-[95%] h-[2px] rounded-full bg-white/40 mt-2 mb-7' />
                                </div>
                            </SortableReview>
                            );
                        })}

                    </SortableContext>
                </DndContext>            
                </div>
            </div>
        </div>
    </div>
)
}

export default Reviews
