import React, { useEffect, useState, useRef, useMemo } from "react";
import styles from './modules/videoLibrary.module.scss'
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GradientPickerModal from "./GradientPickerModal";
import ColorPicker from "./ColorPicker";
import Menu from './framercomponents/Menu.jsx'
import { allEpisodeTitles } from "./episodeTitles.js";
import { newMedia } from "./newMedia.js";
import RandomCoverCarousel from "./RandomCoverCarousel";

import { useSnow } from "./SnowContext.jsx"; 




const DEFAULT_GRADIENT = 'conic-gradient(from .5turn at bottom center in oklab, #add8e6, #fff)'; //ORIGINAL COLOR




const VideoPlayer = () => {
    const navigate = useNavigate();
    
    const { snowEnabled, setSnowEnabled } = useSnow(); // REMOVE AFTER HOLDAYS //


    const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z"/><path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z"/></svg>
    const paintIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-paint-bucket" viewBox="0 0 16 16"><path d="M6.192 2.78c-.458-.677-.927-1.248-1.35-1.643a3 3 0 0 0-.71-.515c-.217-.104-.56-.205-.882-.02-.367.213-.427.63-.43.896-.003.304.064.664.173 1.044.196.687.556 1.528 1.035 2.402L.752 8.22c-.277.277-.269.656-.218.918.055.283.187.593.36.903.348.627.92 1.361 1.626 2.068.707.707 1.441 1.278 2.068 1.626.31.173.62.305.903.36.262.05.64.059.918-.218l5.615-5.615c.118.257.092.512.05.939-.03.292-.068.665-.073 1.176v.123h.003a1 1 0 0 0 1.993 0H14v-.057a1 1 0 0 0-.004-.117c-.055-1.25-.7-2.738-1.86-3.494a4 4 0 0 0-.211-.434c-.349-.626-.92-1.36-1.627-2.067S8.857 3.052 8.23 2.704c-.31-.172-.62-.304-.903-.36-.262-.05-.64-.058-.918.219zM4.16 1.867c.381.356.844.922 1.311 1.632l-.704.705c-.382-.727-.66-1.402-.813-1.938a3.3 3.3 0 0 1-.131-.673q.137.09.337.274m.394 3.965c.54.852 1.107 1.567 1.607 2.033a.5.5 0 1 0 .682-.732c-.453-.422-1.017-1.136-1.564-2.027l1.088-1.088q.081.181.183.365c.349.627.92 1.361 1.627 2.068.706.707 1.44 1.278 2.068 1.626q.183.103.365.183l-4.861 4.862-.068-.01c-.137-.027-.342-.104-.608-.252-.524-.292-1.186-.8-1.846-1.46s-1.168-1.32-1.46-1.846c-.147-.265-.225-.47-.251-.607l-.01-.068zm2.87-1.935a2.4 2.4 0 0 1-.241-.561c.135.033.324.11.562.241.524.292 1.186.8 1.846 1.46.45.45.83.901 1.118 1.31a3.5 3.5 0 0 0-1.066.091 11 11 0 0 1-.76-.694c-.66-.66-1.167-1.322-1.458-1.847z"/></svg>
    const editIcon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-pencil-fill" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/></svg>
    const starIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>
    const profileIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/></svg>
    const searchIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-4" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
    const xIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>);
    const continueIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.249 12 8.689v2.34L5.055 7.061Z" /></svg>
    const rightArrow = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-5" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5z"/></svg>



    {/* Profile Manipulation */}
    const [profileName, setProfileName] = useState(() => localStorage.getItem('profileName') || "User");
    const [profileEmail, setProfileEmail] = useState(() => localStorage.getItem('profileEmail') || "User Bio");
    const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || "/images/misc/profilepictureBlank.webp");
    const [editField, setEditField] = useState(null);
    const [hoverField, setHoverField] = useState(null);
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
        localStorage.setItem('profileName', profileName);
      }, [profileName]);
      
      useEffect(() => {
        localStorage.setItem('profileEmail', profileEmail);
      }, [profileEmail]);
      
      useEffect(() => {
        localStorage.setItem('profileImage', profileImage);
      }, [profileImage]);

    {/* Navigation */}
    const handleNavigate = () => {
      sessionStorage.removeItem("showIntroFromUser");
      navigate('/home');
      window.location.reload();
    };    
    const handleReviewNavigate = () => {
      navigate("/reviews");
    };

    {/* Input Editing State */}
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef(null);


    {/* Sidebar Nav State */}
    const [clickedCard, setClickedCard] = useState(null);
    const sidebarItems = [
      { title: "Steven Universe",           cardId: "card-2"  },
      { title: "Adventure Time",            cardId: "card-3"  },
      { title: "Over the Garden Wall",      cardId: "card-1"  },
      { title: "Perfect Blue",              cardId: "card-4"  },
      { title: "Paprika",                   cardId: "card-5"  },
      { title: "Princess Mononoke",         cardId: "card-6"  },

      { title: "Aniara",                    cardId: "card-8" },
      { title: "Weapons",                   cardId: "card-17"  },
      { title: "The Vanishing",             cardId: "card-9"  },
      { title: "The Lighthouse",            cardId: "card-10" },
      { title: "A Ghost Story",             cardId: "card-11" },
      { title: "Little Miss Sunshine",      cardId: "card-12" },

      { title: "Ghost in the Shell",        cardId: "card-13" },
      { title: "Mob Psycho 100",            cardId: "card-14" },
      { title: "Fullmetal Alchemist",       cardId: "card-15" },
      { title: "Jujutsu Kaisen",            cardId: "card-16" },
      { title: "Neon Genesis Evangelion",   cardId: "card-7"  },
      { title: "Cyberpunk: Edgerunners",    cardId: "card-21" },

      { title: "Solaris",                   cardId: "card-19" },
      { title: "Event Horizon",             cardId: "card-20" },
      { title: "Tokyo Godfathers",          cardId: "card-18" },
      { title: "Love Death + Robots",       cardId: "card-22" },
      { title: "Demons",                    cardId: "card-23" },
      { title: "Black Mirror",              cardId: "card-24" },

      { title: "Severance",                 cardId: "card-25" },
      { title: "Pluribus",                  cardId: "card-26" },
      { title: "Akira",                     cardId: "card-27" },
      { title: "Ex Machina",                cardId: "card-28" },
      { title: "Annihilation",              cardId: "card-29" },
      { title: "It's Always Sunny In Philadelphia",    cardId: "card-30" },

      { title: "The Twilight Zone",         cardId: "card-31" },
      { title: "Redline",                   cardId: "card-32" },

    ];

    const cardIdToSlug = {
        "card-2":  "steven-universe",
        "card-3":  "adventure-time",
        "card-1":  "over-the-garden-wall",
        "card-4":  "perfect-blue",
        "card-5":  "paprika",
        "card-6":  "princess-mononoke",

        "card-8": "aniara",
        "card-17":  "weapons",
        "card-9":  "the-vanishing",
        "card-10": "the-lighthouse",
        "card-11": "a-ghost-story",
        "card-12": "little-miss-sunshine",

        "card-13": "ghost-in-the-shell",
        "card-14": "mob-psycho",
        "card-15": "fmab",
        "card-16": "jjk",
        "card-7":  "neon-genesis",
        "card-21": "cyberpunk",

        "card-19": "solaris",
        "card-20": "event-horizon",
        "card-18": "tokyo-godfathers",
        "card-22": "lovedeathandrobots",
        "card-23": "demons",
        "card-24": "blackmirror",

        "card-25": "severance",
        "card-26": "pluribus",
        "card-27": "akira",
        "card-28": "exmachina",
        "card-29": "annihilation",
        "card-30": "itsalwayssunny",

        "card-31": "thetwilightzone",
        "card-32": "redline",

      };

    const runWithViewTransition = (callback) => {
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        document.startViewTransition(callback);
      } else {
        callback();
      }
    };
    
    const handleCardClick = (cardId) => {
      const card = document.querySelector(`.${styles[cardId]}`);
      const mainContent = document.querySelector(`.${styles['main-content']}`);
    
      if (!card || !mainContent) return;
    
      runWithViewTransition(() => {
        if (clickedCard === cardId) {
          const slug = cardIdToSlug[cardId];
          if (slug) {
            navigate(`/video-library/${slug}`);
          }
        } else {
          setClickedCard(cardId);
          mainContent.classList.add(styles.expanded);
    
          const allCards = document.querySelectorAll(`.${styles.card}`);
          allCards.forEach((c) => c.classList.remove(styles.active));
    
          card.classList.add(styles.active);
        }
      });
    };

      


    
    {/* Pagination */}
    const cardsPerPage = 6;
    const mainContentRef = useRef(null);
    const wasContinueOpenRef = useRef(false);
  
    const handleMainScroll = () => {
      const el = mainContentRef.current;
      if (!el) return;

      const pageWidth = el.clientWidth;
      const newPageIndex = Math.floor((el.scrollLeft + pageWidth / 2) / pageWidth);

      setCurrentPage(newPageIndex);
      setClickedCard(null); // clear selection when swiping
    };
    const pages = [];
    
    for (let i = 0; i < sidebarItems.length; i += cardsPerPage) {
      pages.push(sidebarItems.slice(i, i + cardsPerPage));
    }
    const [currentPage, setCurrentPage] = useState(0);



    {/* Gradient Switcher Logic */}
    const [showPicker, setShowPicker] = useState(false);
    const [gradientValue, setGradientValue] = useState(() => {
      if (typeof window === 'undefined') return DEFAULT_GRADIENT;
      const saved = localStorage.getItem('userGradient');
      return saved || DEFAULT_GRADIENT;
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    useEffect(() => {
      document.documentElement.style.setProperty('--gradient-9', gradientValue);
      localStorage.setItem('userGradient', gradientValue);
    }, [gradientValue]);
    const handleGradientChange = (newGradient) => {
      setGradientValue(newGradient);
    };

    {/* Menu Pointer Events */}
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    {/* Request Modal */}
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [mediaRequest, setMediaRequest] = useState('');
    const [languageSubs, setLanguageSubs] = useState('');
    const handleSubmit = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/send-request/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mediaRequest,
            languageSubs,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert('Request submitted successfully!');
          setMediaRequest('');
          setLanguageSubs('');
          setIsRequestOpen(false);
        } else {
          alert('Failed to send request.');
        }
      } catch (err) {
        console.error(err);
        alert('Error sending request.');
      }
    };    

    
  {/* Search Bar */}
  const [searchOpen, setSearchOpen] = useState(false);
  const searchMainRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const [searchType, setSearchType] = useState("shows"); 
  const SEARCH_PAGE_SIZE = searchType === "episodes" ? 9 : 6;
  const [searchPage, setSearchPage] = useState(0);
  const [isClosingSearch, setIsClosingSearch] = useState(false);
  const CLOSE_MS = 260;

  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  useEffect(() => {
    setSearchPage(0);
  }, [searchQuery, searchType]);
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [searchOpen]);
  const resetCardClickState = () => {
    setClickedCard(null);
    const mainContent = document.querySelector(`.${styles["main-content"]}`);
    if (mainContent) mainContent.classList.remove(styles.expanded);
    const allCards = document.querySelectorAll(`.${styles.card}`);
    allCards.forEach((c) => c.classList.remove(styles.active));
  };
  const resetSearchState = () => {
    setSearchQuery("");
    setSearchType("shows");
    setSearchPage(0);

    const el = searchMainRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  };

  const closeSearch = () => {
    if (!searchOpen || isClosingSearch) return;
    setIsClosingSearch(true);
    setSearchOpen(false);
    window.setTimeout(() => {
      resetSearchState();
      resetCardClickState();
      setIsClosingSearch(false);
    }, CLOSE_MS);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSearch();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);

    };
  }, []);
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "/") {
        e.preventDefault();
        resetCardClickState();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  {/* Helpers */}
  const normalize = (s = "") =>
    s
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const toTitle = (s = "") =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const cleanShowId = (id = "") => id.replace(/-/g, "");
  const showIndex = useMemo(() => {
    return sidebarItems.map(({ title, cardId }) => {
      const slug = cardIdToSlug[cardId];
      return {
        kind: "show",
        title,
        cardId,
        slug,
        searchText: normalize(`${title} ${slug || ""}`),
      };
    });
  }, [sidebarItems]);

  const showResults = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return [];
    return showIndex.filter((s) => s.searchText.includes(q));
  }, [searchQuery, showIndex]);
  const slugToTitle = useMemo(() => {
    const map = {};
    sidebarItems.forEach(({ title, cardId }) => {
      const slug = cardIdToSlug[cardId];
      if (slug) map[slug] = title;
    });
    return map;
  }, [sidebarItems]);

  {/* Episode Indexing */}
  const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
  const episodeIndex = useMemo(() => {
    const out = [];
    for (const [showSlug, seasonsObj] of Object.entries(allEpisodeTitles)) {
      const cleaned = cleanShowId(showSlug);
      for (const [seasonStr, titles] of Object.entries(seasonsObj)) {
        const season = parseInt(seasonStr, 10);
        titles.forEach((rawTitle, i) => {
          const episode = i + 1;
          const placeholderPath = `${cloudFrontDomain}/${cleaned}/placeholders/season${season}/S${season}E${episode}_${cleaned}_placeholder.png`;
          out.push({
            kind: "episode",
            showSlug,
            season,
            episode,
            rawTitle,
            displayTitle: toTitle(rawTitle),
            searchText: normalize(
              `${showSlug} ${rawTitle} season ${season} episode ${episode}`
            ),
            placeholderPath,
          });
        });
      }
    }
    return out;
  }, []);
  const episodeResults = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return [];
    return episodeIndex
      .filter((ep) => ep.searchText.includes(q))
      .slice(0, 60); 
  }, [searchQuery, episodeIndex]);
  const isSearching = !!normalize(searchQuery) && searchOpen && !isClosingSearch;

  const activeResults = useMemo(() => {
    if (!isSearching) return [];
    return searchType === "shows" ? showResults : episodeResults;
  }, [isSearching, searchType, showResults, episodeResults]);

  const searchPages = useMemo(() => {
    return chunk(activeResults, SEARCH_PAGE_SIZE);
  }, [activeResults]);

  const visibleSearchResults = searchPages[searchPage] || [];
  const totalSearchPages = searchPages.length;

  useEffect(() => {
    setSearchPage(0);
    const el = searchMainRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [searchQuery, searchType]);


  {/* Episode Search */}
  const isEpisodeSearch = isSearching && searchType === "episodes";
  const searchColsClass = isEpisodeSearch ? "grid-cols-3" : "grid-cols-3";
  const [loadedThumbs, setLoadedThumbs] = useState({});
  const handleThumbLoad = (key) => {
    setLoadedThumbs((prev) => ({ ...prev, [key]: true }));
  };

  {/* Search Content Exit */}
  const qNorm = useMemo(() => normalize(searchQuery), [searchQuery]);
  const contentMode = searchOpen && !isClosingSearch && qNorm ? "search" : "default";
  const isSearchMode = contentMode === "search";
  useEffect(() => {
    if (!qNorm) {
      setCurrentPage(0);
      requestAnimationFrame(() => {
        const el = mainContentRef.current;
        if (!el) return;
        el.scrollTo({ left: 0, behavior: "auto" });
      });
    }
  }, [qNorm]);

  const handleSearchScroll = () => {
    const el = searchMainRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth;
    const newIndex = Math.floor((el.scrollLeft + pageWidth / 2) / pageWidth);
    setSearchPage(newIndex);
    resetCardClickState();
  };
  const sidebarDisplayItems = useMemo(() => {
    if (!isSearchMode) {
      return (pages[currentPage] ?? []).map(({ title, cardId }) => ({
        kind: "show",
        title,
        cardId,
        slug: cardIdToSlug[cardId],
      }));
    }
    const currentSearchPageItems = searchPages[searchPage] ?? [];
    if (searchType === "shows") {
      return currentSearchPageItems.filter((x) => x.kind === "show");
    }

    return currentSearchPageItems.filter((x) => x.kind === "episode");
  }, [isSearchMode, pages, currentPage, searchPages, searchPage, searchType, cardIdToSlug]);
  const hardCloseSearch = () => {
    setIsClosingSearch(false);
    setSearchOpen(false);
    resetSearchState();
    resetCardClickState();
  };

  

  {/* Continue Watching */}
  const [continueOpen, setContinueOpen] = useState(false);
  const openContinue = () => setContinueOpen(true);
  const closeContinue = () => setContinueOpen(false);
  const [loadedContinueThumbs, setLoadedContinueThumbs] = useState({});
  const parseWatchProgress = (raw) => {
    if (!raw) return { fraction: 0, updatedAt: 0 };
    try {
      const data = JSON.parse(raw);
      const currentTime =
        Number(data.currentTime ?? data.t ?? data.time ?? data.progress ?? 0);
      const duration =
        Number(data.duration ?? data.d ?? data.len ?? 0);
      const updatedAt =
        Number(data.updatedAt ?? data.updated ?? data.watchedAt ?? 0);
      const fraction =
        duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
      return {
        fraction,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
        currentTime: Number.isFinite(currentTime) ? currentTime : 0,
        duration: Number.isFinite(duration) ? duration : 0,
      };
    } catch {
      const n = Number(raw);
      return { fraction: Number.isFinite(n) ? 0 : 0, updatedAt: 0 };
    }
  };


const buildPlaceholderCandidates = (showSlug) => {
  const cleaned = cleanShowId(showSlug);
  const localBases = [
    `/images/${showSlug}/placeholders/${showSlug}_placeholder`,
    `/images/${cleaned}/placeholders/${cleaned}_placeholder`,
    `/images/${showSlug}/placeholders/${cleaned}_placeholder`,
    `/images/${cleaned}/placeholders/${showSlug}_placeholder`,
  ];
  const cfBases = [
    `${cloudFrontDomain}/${cleaned}/placeholders/${cleaned}_placeholder`,
    `${cloudFrontDomain}/${showSlug}/placeholders/${showSlug}_placeholder`,
    `${cloudFrontDomain}/${showSlug}/placeholders/${cleaned}_placeholder`,
    `${cloudFrontDomain}/${cleaned}/placeholders/${showSlug}_placeholder`,
  ];
  const exts = [".png", ".webp", ".jpg", ".jpeg"];
  const out = [];
  [...localBases, ...cfBases].forEach((b) => exts.forEach((e) => out.push(b + e)));
  out.push("/images/misc/placeholder.png");
  return out;
};


const continueItems = useMemo(() => {
  if (typeof window === "undefined") return [];

  const rawHistory = localStorage.getItem("lastWatched");

  if (!rawHistory) return [];

  let history = [];
  try {
    history = JSON.parse(rawHistory) || [];
  } catch {
    return [];
  }
  const byShow = new Map();
  for (const entry of history) {
    if (!entry?.showId || !entry?.watchedAt) continue;
    const existing = byShow.get(entry.showId);
    if (!existing || entry.watchedAt > existing.watchedAt) {
      byShow.set(entry.showId, entry);
    }
  }
  const toRouteSlug = (id = "") => {
    if (slugToTitle?.[id]) return id;
    const cleaned = cleanShowId(id);
    const found = Object.keys(slugToTitle || {}).find(
      (slug) => cleanShowId(slug) === cleaned
    );
    return found || id;
  };
  const buildMoviePlaceholderCandidates = (showSlug) => {
    const cleaned = cleanShowId(showSlug);

    const bases = [
      `/images/${cleaned}/placeholders/${cleaned}_placeholder`,
    ];
    const exts = [".png", ".webp", ".jpg", ".jpeg"];
    const out = [];
    bases.forEach((b) => exts.forEach((e) => out.push(b + e)));
    out.push("/images/misc/placeholder.png");
    return out;
  };



  const merged = Array.from(byShow.values())
    .map((entry) => {
      const showSlug = toRouteSlug(entry.showId);

      const isSeries =
        !!allEpisodeTitles?.[showSlug] &&
        entry.lastSeason != null &&
        entry.lastEpisode != null;

      const progressKey =
        entry.lastSeason != null && entry.lastEpisode != null
          ? `watchProgress-${showSlug}-S${Number(entry.lastSeason)}-E${Number(entry.lastEpisode)}`
          : `watchProgress-${showSlug}`;

      const prog = parseWatchProgress(localStorage.getItem(progressKey));
      const cleaned = cleanShowId(showSlug);
      let candidates = [];
      let img = "";
      if (isSeries) {
        const cleaned = cleanShowId(showSlug);
        const season = Number(entry.lastSeason) || 1;
        const episode = Number(entry.lastEpisode) || 1;
        const episodeImg = `${cloudFrontDomain}/${cleaned}/placeholders/season${season}/S${season}E${episode}_${cleaned}_placeholder.png`;
        candidates = [episodeImg];
        img = candidates[0];
      } 
      else {
        candidates = buildMoviePlaceholderCandidates(showSlug);
        img = candidates[0];
      }

      let subtitle = "";
      let episodeTitle = null;
      if (isSeries) {
        const season = Number(entry.lastSeason) || 1;
        const episode = Number(entry.lastEpisode) || 1;

        const episodeImg = `${cloudFrontDomain}/${cleaned}/placeholders/season${season}/S${season}E${episode}_${cleaned}_placeholder.png`;
        candidates = [episodeImg, ...buildPlaceholderCandidates(showSlug)];
        img = candidates[0];
        const titlesBySeason = allEpisodeTitles?.[showSlug] || {};
        const seasonKeyNum = season;
        const seasonKeyStr = String(season);
        const seasonKeyPref = `season${season}`;

        const titlesForSeason =
          titlesBySeason[seasonKeyNum] ||
          titlesBySeason[seasonKeyStr] ||
          titlesBySeason[seasonKeyPref] ||
          [];
        const rawTitle = titlesForSeason[episode - 1] || null;
        if (rawTitle) {
          episodeTitle = rawTitle
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
        subtitle = `S${season}E${episode}${
          episodeTitle ? ` — ${episodeTitle}` : ""
        }`;
      }
      return {
        key: `${showSlug}-${entry.lastSeason || 0}-${entry.lastEpisode || 0}`,
        showSlug,
        watchedAt: entry.watchedAt,
        title: slugToTitle[showSlug] ?? showSlug.replace(/-/g, " "),
        subtitle,
        img,
        imgCandidates: candidates, 
        progress: prog.fraction,
        to: isSeries
          ? `/video-library/${showSlug}?season=${Number(entry.lastSeason) || 1}&episode=${Number(entry.lastEpisode) || 1}`
          : `/video-library/${showSlug}?movie=1`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));

    return merged.slice(0, 10);
  }, [slugToTitle, cloudFrontDomain, allEpisodeTitles]);


  {/* Cover Randomizer */}
  const coverModules = import.meta.glob(
    "../images/**/**Cover.{jpg,jpeg,png,svg,webp}",
    { eager: true, import: "default" }
  );  
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };















  return (
   <div className={styles['body']}>
    {/*
      <motion.div 
        className={isMenuOpen ? 'z-80' : 'z-20'}
      >
      <Menu closeMenu={() => setIsMenuOpen(false)} />
      </motion.div>
    */}
        <div className={styles['app']}>
            <div className={`${styles["sidebar"]} overflow-y-hidden`}>
                
            <div className={styles['user']}>
                {/* Profile Image Section */}
                <div 
                className="relative group w-fit"
                onMouseEnter={() => setHoverField('image')}
                onMouseLeave={() => setHoverField(null)}
                >
                <img 
                    src={profileImage} 
                    alt="user photo" 
                    className={styles['user-photo']} 
                />

                {/* Blurred Overlay and Edit Icon */}
                <AnimatePresence mode="wait">
                {hoverField === 'image' && (
                    <motion.div
                    key="image-hover-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="size-[54px] absolute inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center rounded-[10px] z-10"
                    >
                    <motion.button
                        whileHover={{
                        scale: 1.05,
                        color: "#5c5c5c",
                        transition: {
                            duration: 0.3,
                            ease: "easeInOut",
                        },
                        }}
                        className="w-full h-full text-white justify-center items-center flex cursor-pointer p-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {editIcon}
                    </motion.button>
                    </motion.div>
                )}
                </AnimatePresence>

                {/* Hidden Input */}
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                    handleImageChange(e);
                    setEditField(null);
                    }}
                    className="hidden"
                />
                </div>

                {/* Name Section */}
                <div 
                className="relative mt-2 h-6 flex items-center"
                onMouseEnter={() => setHoverField('name')}
                onMouseLeave={() => setHoverField(null)}
                >
                <AnimatePresence mode="wait">
                    {editField === 'name' ? (
                        <motion.input 
                        key="profile-input"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                          width: '100%',
                          opacity: 1,
                          transition: { duration: 0.5, ease: 'easeInOut' }
                        }}
                        exit={{
                          width: 0,
                          opacity: 0,
                          transition: { duration: 0.4, ease: 'easeInOut' }
                        }}
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        onBlur={() => setEditField(null)}
                        autoFocus
                        className='absolute left-0 w-full focus:outline-none focus:ring-0 border-1 rounded-lg focus:border-blue-500 p-1'
                        />
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <AnimatePresence mode="wait">
                                    {editField !== 'name' && (
                                        <motion.div
                                        key="profile-name"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        >
                                        {profileName}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <AnimatePresence mode="wait">
                                {hoverField === 'name' && (
                                    <motion.div 
                                    key="name-edit-icon"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    whileHover={{
                                        scale: 1.05,
                                        color: "#5c5c5c",
                                        transition: {
                                        duration: 0.3,
                                        ease: "easeInOut",
                                        },
                                    }}
                                    className="text-xs text-white rounded cursor-pointer mb-1"
                                    onClick={() => setEditField('name')}
                                    >
                                    {editIcon}
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </AnimatePresence>
                </div>

                {/* Email Section */}
                <div 
                className="relative mt-4 h-6 flex items-center"
                onMouseEnter={() => setHoverField('email')}
                onMouseLeave={() => setHoverField(null)}
                >
                <AnimatePresence mode="wait">
                    {editField === 'email' ? (
                        <motion.input 
                        key="email-input"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                          width: '100%',
                          opacity: 1,
                          transition: { duration: 0.5, ease: 'easeInOut' }
                        }}
                        exit={{
                          width: 0,
                          opacity: 0,
                          transition: { duration: 0.4, ease: 'easeInOut' }
                        }}
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        onBlur={() => setEditField(null)}
                        autoFocus
                        className={`${styles['user-mail']} absolute left-0 w-full focus:outline-none focus:ring-0 border-1 rounded-lg focus:border-blue-500 p-1`}
                        />
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        className={styles['user-mail']}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {profileEmail}
                                    </motion.div>
                                </AnimatePresence>
                                <AnimatePresence mode="wait">
                                    {hoverField === 'email' && (
                                    <motion.div 
                                        key="email-edit-icon"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        whileHover={{
                                        scale: 1.05,
                                        color: "#5c5c5c",
                                        transition: {
                                            duration: 0.3,
                                            ease: "easeInOut",
                                        },
                                        }}
                                        className="rounded cursor-pointer mb-1"
                                        onClick={() => setEditField('email')}
                                    >
                                        {editIcon}
                                    </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </AnimatePresence>
                </div>

            </div>

            <div className={`${styles["sidebar-menu"]} text-nowrap cursor-pointer `}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${isSearchMode ? "search" : "default"}-${
                    isSearchMode ? searchPage : currentPage
                  }-${searchType}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col"
                >
                  {/* ✅ Media List */}
                  <div className="flex flex-col">
                    {sidebarDisplayItems
                      .filter((item) => item.kind === "show")
                      .map((item) => {
                        const { title, cardId } = item;

                        const words = title.split(" ");
                        const displayTitle =
                          words.length > 4 ? (
                            <>
                              {words.slice(0, 4).join(" ")} <br />
                              {words.slice(4).join(" ")}
                            </>
                          ) : (
                            title
                          );

                        return (
                          <a
                            key={cardId}
                            className={`${styles["sidebar-menu__link"]} ${
                              clickedCard === cardId ? styles.active : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleCardClick(cardId);
                            }}
                          >
                            {displayTitle}
                          </a>
                        );
                      })}
                  </div>

                  {/* ✅ Episode List */}
                  <div className="flex flex-col min-h-0 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 sidebar-scrollbar">
                    {sidebarDisplayItems
                      .filter((item) => item.kind === "episode")
                      .map((item) => {
                        const key = `${item.showSlug}-S${item.season}-E${item.episode}`;
                        const showTitle =
                          slugToTitle[item.showSlug] ?? item.showSlug.replace(/-/g, " ");

                        return (
                          <a
                            key={key}
                            className={styles["sidebar-menu__link"]}
                            onClick={(e) => {
                              e.preventDefault();
                              hardCloseSearch();
                              navigate(
                                `/video-library/${item.showSlug}?season=${item.season}&episode=${item.episode}`
                              );
                            }}
                          >
                            <motion.div 
                              whileTap={{ scale: 0.9 }}
                              whileHover={{ scale: 1.01, x: 6 }}
                              className="leading-4"
                            >
                              <div className="text-white/90 text-[13px] font-semibold truncate">
                                {showTitle}
                              </div>
                              <div className="text-white/60 text-[12px] truncate">
                                S{item.season}E{item.episode} — {item.displayTitle}
                              </div>
                            </motion.div>
                          </a>
                        );
                      })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

              <div className="fixed bottom-20">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  className="group flex flex-row items-center gap-2 bg-white/5 border border-white/5 px-2.5 py-1.5 text-sm tracking-wide rounded-lg ring-1 ring-white/10 shadow-lg/30 cursor-pointer text-white/70 hover:text-white transition-colors duration-300"
                  onClick={() => {
                    if (continueOpen) {
                      setContinueOpen(false);
                      setCurrentPage(0);

                      requestAnimationFrame(() => {
                        const el = mainContentRef.current;
                        if (!el) return;
                        el.scrollTo({ left: 0, behavior: "auto" });
                      });

                      setClickedCard(null);
                      const mainContent = document.querySelector(`.${styles["main-content"]}`);
                      if (mainContent) mainContent.classList.remove(styles.expanded);
                      const allCards = document.querySelectorAll(`.${styles.card}`);
                      allCards.forEach((c) => c.classList.remove(styles.active));
                    } else {
                      setContinueOpen(true);
                    }
                  }}

                >
                  <span>{continueIcon}</span>
                  <span className="">Recently Watched</span>
                </motion.button>
              </div>
              
            </div>
            
            <div className={`${styles["main"]} min-w-0`}>
              <div className={styles['main-header']}>
                <div className="flex flex-row">
                  <div className={styles['main-header__title']}>Library</div>
                  <div className={styles['main-header__avatars']}>
                      <div className={styles['main-header__avatar']} alt="avatar" />
                      <div className={styles['main-header__avatar']} alt="avatar" />
                      <div className={styles['main-header__avatar']} alt="avatar" />
                      <motion.button
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
                        className={styles['add-button']}
                        onClick={() => setIsRequestOpen(true)}
                      >
                          <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>                        
                      </motion.button>
                      <motion.div 
                        className="ml-2 text-white/70 cursor-pointer"
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
                      > 
                          {profileIcon} 
                      </motion.div>                   
                  </div>
                </div>

              <AnimatePresence>
                {isRequestOpen && (
                  <motion.div
                    key="color-picker"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-[1000]"
                  >
                    <div className="w-[600px] h-[500px] bg-white flex items-center justify-center text-black rounded-2xl p-4 shadow-2xl border-2 border-black/20">
                      <div className="w-full h-full flex flex-col p-4">
                        <span className="text-4xl font-bold"> Requests </span>
                        <span className="text-sm leading-5 mt-2 text-black/70"> Want to watch something that isn't on this site? Make a request down below and i'll make sure to add it as soon as I have time. </span>
                        <div className="flex flex-col mt-4">
                          <span className="mb-2"> Media Request </span>
                          <input 
                            placeholder="Enter request here"
                            value={mediaRequest}
                            onChange={(e) => setMediaRequest(e.target.value)}                            
                            className="bg-black/10 h-14 p-2 rounded-lg"/>
                            <span className="text-xs text-blue-500/60 leading-3 mt-2 p-1"> Enter a request for any media type such as shows or movies. Or if you experience any bugs feel free to notify me here as well. </span>
                        </div>
                        <div className="flex flex-col mt-8">
                          <span className="mb-2"> Language/Subtitles </span>
                          <input 
                            placeholder="Write content here"
                            value={languageSubs}
                            onChange={(e) => setLanguageSubs(e.target.value)}                            
                            className="bg-black/10 h-14 p-2 rounded-lg"/>
                            <span className="text-xs text-blue-500/60 leading-4 mt-2 p-1"> If you are requesting something that requires subtitles or a different language please notify me here. (Ex. English,Sub) </span>
                        </div>
                        <div className="w-full flex justify-end mt-4 items-center gap-4">
                          <motion.button 
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
                            onClick={() => setIsRequestOpen(false)} 
                            className="w-26 h-10 bg-gray-500/80 text-white rounded-3xl p-4 flex items-center justify-center cursor-pointer"
                          >
                            Close
                          </motion.button>                          
                          <motion.button
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
                            onClick={handleSubmit}                             
                            className="w-26 h-10 bg-blue-600 text-white text-sm font-semibold rounded-full p-4 items-center justify-center flex cursor-pointer"
                          > 
                            Submit 
                          </motion.button>                      
                        </div>  
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>  


              {/* Gradient Switcher & SearchBar */}
              <div className="flex flex-row gap-4 items-center">
                
                {/* Search Bar */}
                <motion.div
                  className="relative flex items-center justify-end"
                  initial={false}
                  animate={{ width: searchOpen ? 470 : 40 }}
                  transition={{ type: "spring", stiffness: 220, damping: 32, ease: "easeInOut" }}
                  style={{ transformOrigin: "right center" }} 
                >
                  {/* Background shell */}
                  <motion.div
                    ref={searchWrapRef}
                    className="h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center overflow-hidden"
                    initial={false}
                    animate={{ width: searchOpen ? "100%" : 40 }}
                    transition={{ type: "spring", stiffness: 220, damping: 32 }}
                  >
                    {/* Left search icon (always visible) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (searchOpen) closeSearch();
                        else setSearchOpen(true), closeContinue(true);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white/50 transition-colors duration-300 shrink-0 cursor-pointer"
                    >
                      {searchOpen ? xIcon : searchIcon}
                    </button>

                    {/* Input area */}
                    <AnimatePresence mode="wait">
                      {searchOpen && (
                        <motion.div
                          key="search-input"
                          className="flex items-center w-full pr-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <AnimatePresence mode="wait">
                            {searchOpen && (
                              <motion.div
                                key="search-input"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="w-full flex items-center"
                              >
                                <motion.input
                                  ref={searchInputRef}
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="What are you looking for?"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.8, ease: "easeInOut" }}
                                  className="w-full bg-transparent outline-none text-white placeholder:text-white/40 text-sm"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        {searchOpen && (
                          <div className="flex gap-2">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              whileHover={{ scale: 1.05 }}
                              onClick={() => setSearchType("shows")}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md cursor-pointer
                                ${searchType === "shows"
                                  ? "text-white bg-white/15 border-white/25 hover:text-white/80"
                                  : "text-white/60 bg-white/5 border-white/10 hover:text-white/80"
                                }`}
                            >
                              Media
                            </motion.button>

                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              whileHover={{ scale: 1.05 }}                              
                              onClick={() => setSearchType("episodes")}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md cursor-pointer
                                ${searchType === "episodes"
                                  ? "text-white bg-white/15 border-white/25 hover:text-white/80"
                                  : "text-white/60 bg-white/5 border-white/10 hover:text-white/80"
                                }`}
                            >
                              Episodes
                            </motion.button>
                          </div>
                        )}

                          {/* little keycap style */}
                          <div className="ml-2 flex items-center gap-0.5 text-white/50 text-[10px] cursor-default">
                            <span className="w-6 h-6 flex items-center justify-center rounded-md bg-white/10 border border-white/15">
                              ⌘
                            </span>
                            +
                            <span className="w-6 h-6 flex items-center justify-center rounded-md bg-white/10 border border-white/15">
                              /
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>



                {/* Gradient */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={styles['main-header__add']}
                  onClick={() => setIsModalOpen(true)}
                >
                  {paintIcon}
                </motion.button>

                <AnimatePresence>
                  {isModalOpen && (
                    <motion.div
                      key="color-picker"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-[1000]"
                    >
                      <ColorPicker
                        initialValue={gradientValue}
                        onSave={handleGradientChange}
                        onClose={() => setIsModalOpen(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>

              <AnimatePresence initial={false}>
                {!continueOpen && (
                  <motion.div
                    key="page-nav"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <div className={styles["main-header-nav"]}>
                      {isSearching ? (
                        totalSearchPages > 1 ? (
                          Array.from({ length: totalSearchPages }).map((_, i) => (
                            <a
                              key={i}
                              className={`${styles["nav-item"]} ${searchPage === i ? styles.active : ""}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setSearchPage(i);
                                resetCardClickState();

                                const el = searchMainRef.current;
                                if (!el) return;
                                el.scrollTo({
                                  left: i * el.clientWidth,
                                  behavior: "smooth",
                                });
                              }}
                            >
                              Page {i + 1}
                            </a>
                          ))
                        ) : null
                      ) : (
                        pages.map((_, pageIndex) => (
                          <a
                            key={pageIndex}
                            className={`${styles["nav-item"]} ${currentPage === pageIndex ? styles.active : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const mainContent = document.querySelector(`.${styles["main-content"]}`);
                              if (!mainContent) return;
                              mainContent.scrollTo({
                                left: pageIndex * mainContent.clientWidth,
                                behavior: "smooth",
                              });
                              setCurrentPage(pageIndex);
                            }}
                          >
                            Page {pageIndex + 1}
                          </a>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
              {contentMode === "search" ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="w-full h-full"
                >
              
                  {/* ✅ Search Results Grid */}
                  <div
                    ref={searchMainRef}
                    onScroll={handleSearchScroll}
                    className={`${styles["main-content"]} overflow-x-auto overflow-y-hidden safaribar-hidden scroll-smooth snap-x snap-mandatory w-full h-full flex`}
                  >
                    {searchPages.map((pageItems, pageIndex) => (
                      <div
                        key={pageIndex}
                        className={`grid ${searchColsClass} gap-[24px] snap-start min-w-full flex-shrink-0 transition-opacity duration-300 ${
                          pageIndex === searchPage ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                      >
                        {pageItems.length === 0 ? (
                          <div className="col-span-3 text-white/70 text-sm p-6">
                            No results found.
                          </div>
                        ) : (
                          
                          pageItems.map((item) => {
                          const thumbKey =
                            item.kind === "episode"
                              ? `${item.showSlug}-S${item.season}-E${item.episode}`
                              : item.cardId;                          
                            if (item.kind === "show") {
                              return (
                                <div
                                  key={thumbKey}
                                  className={`${styles.card} ${styles[item.cardId]} ${styles["card-img"]} cursor-pointer ${
                                    clickedCard === item.cardId ? styles.active : ""
                                  }`}
                                  onClick={() => handleCardClick(item.cardId)}
                                />
                              );
                            }

                            return (
                              <motion.div
                                key={thumbKey}
                                whileHover={{
                                  scale: 0.95,
                                  boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                                  transition: { duration: 0.3, ease: "easeInOut" }
                                }}
                                whileTap={{
                                    scale: 0.90,
                                    transition: {
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 10,
                                    },
                                }}                                  
                                className={`${styles.card} ${styles["card-img"]} cursor-pointer
                                ${!loadedThumbs[thumbKey] ? "animate-pulse bg-gray-800/60" : ""}`}
                                style={{
                                  width: isEpisodeSearch ? "14rem" : undefined,  
                                  height: isEpisodeSearch ? "7rem" : undefined,
                                  backgroundImage: `url(${item.placeholderPath})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                                onClick={() =>
                                  navigate(
                                    `/video-library/${item.showSlug}?season=${item.season}&episode=${item.episode}`
                                  )
                                }
                              >
                                    <img
                                      src={item.placeholderPath}
                                      alt=""
                                      className="hidden"
                                      onLoad={() => handleThumbLoad(thumbKey)}
                                      onError={() => handleThumbLoad(thumbKey)}
                                    />
                                <div className="w-full h-full flex items-end">
                                  <div className="w-full text-white text-xs font-semibold p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-[inherit]">
                                    <div className="truncate">{slugToTitle[item.showSlug] ?? item.showSlug.replace(/-/g, " ")}</div>
                                    <div className="truncate">
                                      S{item.season}E{item.episode} — {item.displayTitle}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
                
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  {continueOpen ? (
                    <motion.div
                      key="continue-view"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 14 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="w-full h-full flex flex-col"
                    >

                      <div className="w-full">
                        <RandomCoverCarousel />
                      </div>   

                      {/* ✅ NEW CONTAINER VIEW */}
                      <div className="w-full h-full flex flex-col justify-end gap-4 mb-2">
                        <div className="">
                          {/* header row / extra space */}
                          <div className="w-full mb-2 flex items-center justify-between">
                            <div className="text-white/90 text-xl font-semibold tracking-wide flex flex-row items-center gap-1 cursor-pointer hover:text-white/60 transition-colors duration-300">
                              <span>Recently Watched</span>
                              {rightArrow}
                            </div>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.03 }}
                              onClick={closeContinue}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            >
                              Back
                            </motion.button>
                          </div>

                          {/* ✅ Recently watched */}
                          <div className="flex flex-row gap-3 overflow-x-auto w-full max-w-full min-w-0 snap-x snap-mandatory scroll-smooth recent-scrollbar pb-2">
                            <div className="flex flex-nowrap gap-3 w-max">
                              {continueItems.map((item) => {
                                const isLoading = !loadedContinueThumbs[item.key];
                                return (
                                  <motion.div
                                    key={item.key}
                                    whileHover={{
                                      scale: 0.95,
                                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                                      transition: { duration: 0.3, ease: "easeInOut" }
                                    }}
                                    whileTap={{
                                        scale: 0.90,
                                        transition: {
                                        type: 'spring',
                                        stiffness: 200,
                                        damping: 10,
                                        },
                                    }} 
                                    onClick={() => {
                                      setContinueOpen(false);
                                      navigate(item.to);
                                    }}
                                    className="relative w-52 h-28 shrink-0 rounded-2xl overflow-hidden snap-start border border-white/10 bg-white/5 cursor-pointer"
                                  >
                                    {/* Loader */}
                                    <div
                                      className={`w-full h-full ${isLoading ? "animate-pulse bg-white/5" : ""}`}
                                      style={
                                        !isLoading
                                          ? {
                                              backgroundImage: `url(${item.img})`,
                                              backgroundSize: "cover",
                                              backgroundPosition: "center",
                                            }
                                          : {}
                                      }
                                    >
                                      <img
                                        src={item.img}
                                        alt=""
                                        className="hidden"
                                        onLoad={() =>
                                          setLoadedContinueThumbs((p) => ({ ...p, [item.key]: true }))
                                        }
                                        onError={() =>
                                          setLoadedContinueThumbs((p) => ({ ...p, [item.key]: true }))
                                        }
                                      />
                                    </div>

                                    {/* bottom overlay */}
                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end">
                                      <div className="px-3 pb-1 text-white font-semibold truncate text-sm">
                                        {item.title}
                                      </div>
                                      <div className="px-3 pb-2 text-white/70 text-xs truncate">
                                        {item.subtitle}
                                      </div>

                                      {/* progress bar */}
                                      <div className="w-full h-1 bg-white/20 overflow-hidden">
                                        <div
                                          className="h-full bg-white"
                                          style={{ width: `${Math.round((item.progress || 0) * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div>
                          {/* New on Cearaworld */}
                          <div className="w-full mb-2 flex items-center justify-between">
                            <div className="text-white/90 text-xl font-semibold tracking-wide flex flex-row items-center gap-1 cursor-pointer hover:text-white/60 transition-colors duration-300">
                             <span>New on CearaWorld</span>
                             {rightArrow}
                            </div>
                          </div>

                          <div className="flex flex-row gap-3 overflow-x-auto w-full max-w-full min-w-0 snap-x snap-mandatory scroll-smooth recent-scrollbar pb-2">
                            <div className="flex flex-nowrap gap-3 w-max">
                              {newMedia.map((item) => {
                                const isLoading = !loadedContinueThumbs[item.key];
                                return (                                
                                  <motion.div
                                    key={`${item.kind}-${item.showSlug}-${item.season ?? "m"}-${item.episode ?? "m"}`}
                                    whileHover={{
                                      scale: 0.95,
                                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                                      transition: { duration: 0.3, ease: "easeInOut" }
                                    }}
                                    whileTap={{
                                        scale: 0.90,
                                        transition: {
                                        type: 'spring',
                                        stiffness: 200,
                                        damping: 10,
                                        },
                                    }} 
                                    onClick={() => {
                                      setContinueOpen(false);
                                      navigate(item.to);
                                    }}
                                    className="relative w-52 h-28 shrink-0 rounded-2xl overflow-hidden snap-start border border-white/10 bg-white/5 cursor-pointer"
                                  >

                                    {/* Loader */}
                                    <div
                                      className={`w-full h-full ${isLoading ? "animate-pulse bg-white/5" : ""}`}
                                      style={
                                        !isLoading
                                          ? {
                                              backgroundImage: `url(${item.placeholder})`,
                                              backgroundSize: "cover",
                                              backgroundPosition: "center",
                                            }
                                          : {}
                                      }
                                    >
                                      <img
                                        src={item.placeholder}
                                        alt=""
                                        className="hidden"
                                        onLoad={() =>
                                          setLoadedContinueThumbs((p) => ({ ...p, [item.key]: true }))
                                        }
                                        onError={() =>
                                          setLoadedContinueThumbs((p) => ({ ...p, [item.key]: true }))
                                        }
                                      />
                                    </div>

                                    {/* Top Right Overlay */}
                                    <div
                                      className="
                                        absolute top-0 right-0
                                        flex items-center gap-2
                                        px-3.5 py-1
                                        rounded-bl-full
                                        bg-black/55
                                        border border-white/25
                                        shadow-lg
                                        text-white
                                      "
                                    >
                                      <span className="text-[11px] font-semibold tracking-wide uppercase">
                                        New
                                      </span>

                                      <span className="relative flex items-center justify-center">
                                        {/* ping behind */}
                                        <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400/60 animate-ping" />
                                        {/* solid dot */}
                                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                                      </span>
                                    </div>

                                    {/* Bottom Overlay */}
                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end">
                                      <div className="px-3 pb-1 text-white font-semibold truncate text-sm">
                                        {item.showTitle}
                                      </div>
                                      <div className="px-3 pb-2 text-white/70 text-xs truncate">
                                        {item.kind === "episode"
                                          ? `S${item.season}E${item.episode} — ${item.episodeTitle ?? ""}`
                                          : ""}
                                      </div>
                                    </div>
                                  </motion.div>
                                );                                
                              })}
                            </div>
                          </div>
                        </div>



                        {/* empty state */}
                        {continueItems.length === 0 && (
                          <div className="text-white/60 text-sm mt-4">
                            No recently watched items yet.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default-grid"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="w-full h-full"
                    >
                      {/* Default pages grid */}
                      <div
                        ref={mainContentRef}
                        onScroll={handleMainScroll}
                        className={`${styles["main-content"]} ${
                          clickedCard ? styles.expanded : ""
                        } overflow-x-auto overflow-y-hidden safaribar-hidden scroll-smooth snap-x snap-mandatory w-full h-full flex`}
                      >
                        {pages.map((page, pageIndex) => (
                          <div
                            key={pageIndex}
                            className={`grid grid-cols-3 gap-[24px] snap-start w-full flex-shrink-0 transition-opacity duration-500 ${
                              pageIndex === currentPage
                                ? "opacity-100"
                                : "opacity-0 pointer-events-none"
                            }`}
                          >
                            {page.map(({ cardId }) => (
                              <div
                                key={cardId}
                                className={`${styles.card} ${styles[cardId]} ${styles["card-img"]} ${
                                  clickedCard === cardId ? styles.active : ""
                                }`}
                                onClick={() => handleCardClick(cardId)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </AnimatePresence>              
            </div>
        </div>
    </div> 
  )
}

export default VideoPlayer
