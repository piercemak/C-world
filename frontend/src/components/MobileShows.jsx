import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, easeInOut } from "framer-motion";
import ColorThief from 'colorthief';
import Chevron from './Chevron.jsx'
import { SHOWS } from "./mobileshowsData.js";
import { allEpisodeTitles } from "./episodeTitles.js";
import { queueWatchProgressSync, syncWatchHistory } from "../lib/watchSync.js";
import { getSubtitleTrackSrc } from "../data/subtitleTracks.js";



const MobileShows = () => {

  const hdIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M10.53 5.968h-.843v4.06h.843c1.117 0 1.622-.667 1.622-2.02 0-1.354-.51-2.04-1.622-2.04"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm5.396 3.001V11H6.209V8.43H3.687V11H2.5V5.001h1.187v2.44h2.522V5h1.187zM8.5 11V5.001h2.188c1.824 0 2.685 1.09 2.685 2.984C13.373 9.893 12.5 11 10.69 11z"/></svg>
  const starIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="size-6"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
  const layersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-layers-fill" viewBox="0 0 16 16"><path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/><path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/></svg>
  const libraryIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
  const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>
  const leftChevron = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/></svg>

  const { showId } = useParams();
  const location = useLocation();
  const { autoplaySeason, autoplayEpisode, fromContinueWatching } = location.state || {};
  const cleanShowId = (id) => id.replace(/-/g, "");
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);

  const navigate = useNavigate();
  const handleNavigate = () => {
     navigate("/archive");
  };



  const bgImgRef = useRef(null);
  const [bgGradient, setBgGradient] = useState(
    'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0) 100%)'
  );


  {/* Variants */}
  const dropdownVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: -20,
      height: 0,            
      overflow: "hidden"
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      height: "auto",      
      overflow: "hidden",
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 20,
        staggerChildren: 0.05,
        delayChildren: 0.12,
      },
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: -20,
      height: 0,            // 👈 collapse smoothly
      overflow: "hidden",
      transition: {
        duration: 0.25,
        ease: "easeInOut",
      }
    },
  };

    const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
    };
  

  {/* Episode/Season Handling */}
  const episodeListRef = useRef(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);


  {/* Season Dropdown Handling */}
    const dropdownRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setSeasonDropdownOpen(false);
        }
        }
        if (seasonDropdownOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [seasonDropdownOpen]);  


    {/* Show/Season Handling */}
    const awsHostedShows = import.meta.env.VITE_AWS_HOSTED_SHOWS?.split(",") || [];
    const generateSeasonVideos = (titlesBySeason, rawId, type = "show") => {
      const cleanId = cleanShowId(rawId);
      const isAwsHosted = awsHostedShows.includes(rawId);
      const videos = {};

      if (type === "movie") {
        const s3Key = `${cleanId}/${cleanId}.mp4`;
        return [
          {
            path: isAwsHosted
              ? `https://all-shows.s3.us-east-2.amazonaws.com/${s3Key}`
              : `/videos/${cleanId}/${cleanId}.mp4`,
            title: cleanId,
            season: null,
            episode: null
          }
        ];
      }

      Object.entries(titlesBySeason).forEach(([seasonNumStr, titles]) => {
        const seasonNum = parseInt(seasonNumStr, 10);
        const seasonKey = `season${seasonNum}`;
        
        videos[seasonKey] = titles.map((title, index) => {
          const seasonStr = `S${String(seasonNum).padStart(2, "0")}`;
          const episodeStr = `E${String(index + 1).padStart(2, "0")}`;

          const s3Key = `${cleanId}/season${seasonNum}-mp4s/${seasonStr}${episodeStr}_${cleanId}_${title}.mp4`;
          return {
            path: isAwsHosted
              ? `https://all-shows.s3.us-east-2.amazonaws.com/${s3Key}`
              : `/videos/${cleanId}/season${seasonNum}/${seasonStr}${episodeStr}_${cleanId}_${title}.mp4`,
            title,
            season: seasonStr,
            episode: episodeStr,
          };
        });
      });
      return videos;
    };
  
    const videoDataByShow = Object.fromEntries(
      Object.entries(allEpisodeTitles).map(([showId, titlesBySeason]) => [
        showId,
        generateSeasonVideos(titlesBySeason, showId)
      ])
    );

    {/* Show Database */}
    const shows = {
        "steven-universe": {
          type: "show",
          title: "Steven Universe",
          ratings: "8.2",
          agerating: "16",
          creator: "Rebecca Sugar",
          release_year: "2013",
          genre: "Adventure",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Steven Universe is a coming-of-age story told from the perspective of Steven, a chubby and happy-go-lucky boy and the youngest member of an intergalactic team of warriors called the Crystal Gems. Together, the Crystal Gems fight and protect the Universe, while Steven strums up a cheesy tune on his ukulele.",
          background: "/images/stevenuniverse/covers/stevenuniverseCover.webp",
          mobilebackground: "/images/stevenuniverse/covers/stevenuniverseBackground.png",
          videos: videoDataByShow["steven-universe"],
        },

        "adventure-time": {
          type: "show",  
          title: "Adventure Time",
          creator: "Pendleton Ward",
          ratings: "8.6",
          agerating: "13",
          release_year: "2010",
          genre: "Adventure",
          season_total_number: "10 seasons",
          season_digit: 10,
          description: "Twelve-year-old Finn battles evil in the Land of Ooo. Assisted by his magical dog, Jake, Finn roams the Land of Ooo righting wrongs and battling evil. Usually that evil comes in the form of the Ice King, who is in search of a wife.",
          background: "/images/adventuretime/covers/adventuretimeCover.jpg",
          mobilebackground: "/images/adventuretime/covers/adventuretimeBackground.jpg",
          videos: videoDataByShow["adventure-time"], 
        },

        "over-the-garden-wall": {
          type: "show",  
          title: "Over the Garden Wall",
          ratings: "8.7",
          agerating: "13",
          creator: "Patrick Nolen McHale",
          release_year: "2014",
          genre: "Adventure",
          season_total_number: "1 season",
          season_digit: 1,
          description: "On an adventure, brothers Wirt and Greg get lost in the Unknown, a strange forest adrift in time; as they attempt to find a way out of the Unknown, they cross paths with a mysterious old woodsman and a bluebird named Beatrice.",
          background: "/images/overthegardenwall/covers/overthegardenwallCover.png",
          mobilebackground: "/images/overthegardenwall/covers/overthegardenwallBackground.jpg",
          videos: videoDataByShow["over-the-garden-wall"],
        },

        "neon-genesis": {
          type: "show",  
          title: "Neon Genesis Evangelion",
          ratings: "8.5",
          agerating: "16",
          creator: "Hidaeki Anno",          
          release_year: "1997",
          genre: "Apocalyptic",
          season_total_number: "1 season",
          season_digit: 1,
          description: "Fourteen-year-old Shinji reluctantly pilots a giant sentient machine in battle to protect Earth.",
          mobilebackground: "/images/neongenesis/covers/neongenesismobile.webp",
          videos: videoDataByShow["neon-genesis"],
        },
        
        "mob-psycho": {
          type: "show",  
          title: "Mob Psycho 100",
          ratings: "8.5",
          agerating: "16",
          creator: "ONE",          
          release_year: "2016",
          genre: "Shonen manga/Comedy",
          season_total_number: "3 seasons",
          season_digit: 3,
          description: "A psychic middle school boy tries to live a normal life and keep his growing powers under control, even though he constantly gets into trouble.",
          mobilebackground: "/images/mobpsycho/covers/mobpsycho_background.webp",
          videos: videoDataByShow["mob-psycho"],
        },
        
        "fmab": {
          type: "show",  
          title: "Fullmetal Alchemist: Brotherhood",
          ratings: "9.1",
          agerating: "16",
          creator: "Bones",          
          release_year: "2009",
          genre: "Adventure",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Brothers Edward and Alphonse Elric search for the Philsopher's Stone, hoping to restore their bodies, which were lost when they attempted to use their alchemy skills to resurrect their deceased mother. Edward, who lost only limbs, joins the State Military, which gives him the freedom to continue the search as he tries to restore his brother, whose soul is tethered to earth by a suit of armor. However, Edward and Alphonse are not the only ones seeking the powerful stone. And as they search, they learn of a plot to transmute the entire country for reasons they cannot comprehend.",
          mobilebackground: "/images/fmab/covers/fmab_background.jpg",
          videos: videoDataByShow["fmab"],
        },
        
        "jjk": {
          type: "show",  
          title: "Jujutsu Kaisen",
          ratings: "8.5",
          agerating: "16",
          creator: "Gege Akutami",          
          release_year: "2020",
          genre: "Manga series",
          season_total_number: "3 seasons",
          season_digit: 3,
          description: "Yuji Itadori eats a cursed finger to save a classmate, and now Ryomen Sukuna, a powerfully evil sorcerer known as the King of Curses, lives in Itadori’s soul. Curses are supernatural terrors created from negative human emotions. This cursed energy can be used as a power source by jujutsu sorcerers and cursed spirits alike.",
          mobilebackground: "/images/jjk/covers/jjk_background.png",
          videos: videoDataByShow["jjk"],
        },        

        "perfect-blue": {
          type: "movie",  
          title: "Perfect Blue",
          creator: "Satoshi Kon",
          ratings: "8.0",
          agerating: "18",
          release_year: "1997",
          genre: "Horror/Mystery",
          duration: "1h 21m",
          description: "A young Japanese singer is encouraged by her agent to quit singing and pursue an acting career, beginning with a role in a murder mystery TV show.",
          background: "/images/perfectblue/covers/perfectblueCover.jpg",
          mobilebackground: "/images/perfectblue/covers/perfectblueBackground.jpg",
          videos: generateSeasonVideos({}, "perfect-blue", "movie"),
        },

        "paprika": {
          type: "movie",
          title: "Paprika",
          creator: "Satoshi Kon",
          ratings: "7.7",
          agerating: "18",
          release_year: "2006",
          genre: "Thriller/Sci-fi",
          duration: "1h 30m",
          description: "Dr. Atsuko Chiba works as a scientist by day and, under the code name 'Paprika', is a dream detective at night. Atsuko and her colleagues are working on a device called the DC Mini, which is intended to help psychiatric patients, but in the wrong hands it could destroy people's minds. When a prototype is stolen, Atsuko/Paprika springs into action to recover it before damage is done.",
          background: "/images/paprika/covers/paprikaCover.webp",
          mobilebackground: "/images/paprika/covers/paprikaBackground.jpg",
          videos: generateSeasonVideos({}, "paprika", "movie"),
        },

        "princess-mononoke": {
          type: "movie",
          title: "Princess Mononoke",
          ratings: "8.3",
          agerating: "13",
          creator: "Hayao Miyazaki",
          release_year: "1997",
          genre: "Fantasy/Adventure",
          duration: "2h 13m",
          description: "In the 14th century, the harmony that humans, animals and gods have enjoyed begins to crumble. The protagonist, young Ashitaka - infected by an animal attack, seeks a cure from the deer-like god Shishigami. In his travels, he sees humans ravaging the earth, bringing down the wrath of wolf god Moro and his human companion Princess Mononoke. Hiskattempts to broker peace between her and the humans brings only conflict.",
          background: "/images/princessmononoke/covers/princessmononokeCover.jpg",
          mobilebackground: "/images/princessmononoke/covers/princessmononokeBackground.avif",
          videos: generateSeasonVideos({}, "princess-mononoke", "movie"),
        },

        "aniara": {
          type: "movie",
          title: "Aniara",
          ratings: "5.8",
          agerating: "14",
          creator: "Arne Arnbom",
          release_year: "1960",
          genre: "SciFi/Adventure",
          duration: "2h",
          description: "Aniara is one of the spaceships used for transporting Earth's population to their new home-planet Mars. But just as Aniara leaves the ruined Earth, she collides with an asteroid and is knocked off her course.",
          background: "/images/aniara/covers/aniaraBackground.jpg",
          mobilebackground: "/images/aniara/covers/aniaraShow.jpg",
          videos: generateSeasonVideos({}, "aniara", "movie"),
        },

        "the-vanishing": {
          type: "movie",
          title: "The Vanishing",
          ratings: "7.7",
          agerating: "18",
          creator: "George Sluizer",
          release_year: "1988",
          genre: "Horror/Crime",
          duration: "1h 47m",
          description: "Rex and Saskia, a young couple in love, are on vacation. They stop at a busy service station and Saskia is abducted. After three years and no sign of Saskia, Rex begins receiving letters from the abductor.",
          background: "/images/thevanishing/covers/aniaraBackground.jpg",
          mobilebackground: "/images/thevanishing/covers/thevanishing_background.png",
          videos: generateSeasonVideos({}, "the-vanishing", "movie"),
        },   
        
        "the-lighthouse": {
          type: "movie",
          title: "The Lighthouse",
          ratings: "7.4",
          agerating: "18",
          creator: "Robert Eggers",
          release_year: "2019",
          genre: "Horror/Fantasy",
          duration: "1h 50m",
          description: "Two lighthouse keepers try to maintain their sanity while living on a remote and mysterious New England island in the 1890s.",
          background: "/images/thevanishing/covers/aniaraBackground.jpg",
          mobilebackground: "/images/thelighthouse/covers/thelighthouseCover.jpg",
          videos: generateSeasonVideos({}, "the-lighthouse", "movie"),
        },
        
        "a-ghost-story": {
          type: "movie",
          title: "A Ghost Story",
          ratings: "6.8",
          agerating: "18",
          creator: "David Lowery",
          release_year: "2017",
          genre: "Fantasy/Romance",
          duration: "1h 32m",
          description: "In this singular exploration of legacy, love, loss, and the enormity of existence, a recently deceased, white-sheeted ghost returns to his suburban home to try to reconnect with his bereft wife.",
          background: "/images/thevanishing/covers/aniaraBackground.jpg",
          mobilebackground: "/images/aghoststory/covers/aghoststory_background.webp",
          videos: generateSeasonVideos({}, "a-ghost-story", "movie"),
        },
        
        "little-miss-sunshine": {
          type: "movie",
          title: "Little Miss Sunshine",
          ratings: "7.8",
          agerating: "16",
          creator: "Jonathan Dayton",
          release_year: "2006",
          genre: "Comedy/Drama",
          duration: "1h 41m",
          description: "A family determined to get their young daughter into the finals of a beauty pageant take a cross-country trip in their VW bus.",
          background: "/images/thevanishing/covers/aniaraBackground.jpg",
          mobilebackground: "/images/littlemisssunshine/covers/littlemisssunshine_background.jpg",
          videos: generateSeasonVideos({}, "a-ghost-story", "movie"),
        },  

        "ghost-in-the-shell": {
          type: "movie",
          title: "Ghost in The Shell",
          ratings: "7.9",
          agerating: "18",
          creator: "Kôkaku Kidôtai",
          release_year: "1995",
          genre: "Action/Sci-fi",
          duration: "1h 23m",
          description: "A cyborg policewoman and her partner hunt a mysterious and powerful hacker called the Puppet Master.",
          background: "/images/thevanishing/covers/aniaraBackground.jpg",
          mobilebackground: "/images/ghostintheshell/covers/ghostintheshell_background.jpg",
          videos: generateSeasonVideos({}, "ghost-in-the-shell", "movie"),
        },        
        "weapons": {
          type: "movie",  
          title: "Weapons",
          ratings: "7.6",
          agerating: "18",  
          creator: "Zach Cregger",        
          release_year: "2025",
          genre: "Horror",
          duration: "2h 8m",          
          description: "When all but one child from the same classroom mysteriously vanish on the same night at exactly the same time, a community is left questioning who or what is behind their disappearance.",
          mobilebackground: "/images/weapons/covers/weapons_background.jpg",
          videos: generateSeasonVideos({}, "weapons", "movie"),
        },
        "tokyo-godfathers": {
          type: "movie",  
          title: "Tokyo Godfathers",
          ratings: "7.8",
          agerating: "13",  
          creator: "Satoshi Kon",            
          release_year: "2003",
          genre: "Adventure/Comedy",
          duration: "1h 32m",          
          description: "A trio of homeless people surviving as a makeshift family on the streets of Tokyo. While rummaging in the trash for food on Christmas Eve, they stumble upon an abandoned newborn baby in a trash bin. With only a handful of clues to the baby's identity, the three misfits search the streets of Tokyo for help in returning the baby to its parents.",
          mobilebackground: "/images/tokyogodfathers/covers/tokyogodfathers_background.jpg",
          videos: generateSeasonVideos({}, "tokyo-godfathers", "movie"),
        },  
        "cyberpunk": {
          type: "show",  
          title: "Cyberpunk: Edgerunners",
          ratings: "8.3",
          agerating: "16",
          creator: "Rafal Jaki",             
          release_year: "2022",
          genre: "Action",
          season_total_number: "1 season",
          season_digit: 1,
          description: "A Street Kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an Edgerunner, a Mercenary outlaw also known as a Cyberpunk.",
          mobilebackground: "/images/cyberpunk/covers/cyberpunk_background.jpg",
          videos: videoDataByShow["cyberpunk"],
        }, 
        "solaris": {
          type: "movie",  
          title: "Solaris",
          ratings: "7.9",
          agerating: "18",
          creator: "Andrei Tarkovsky",            
          release_year: "1972",
          genre: "Sci-fi/Mystery",
          duration: "2h 47m",          
          description: "A psychologist is sent to a station orbiting a distant planet in order to discover what has caused the crew to go insane.",
          mobilebackground: "/images/solaris/covers/solaris_background.jpg",
          videos: generateSeasonVideos({}, "solaris", "movie"),
        }, 
        "event-horizon": {
          type: "movie",  
          title: "Event Horizon",
          ratings: "6.6",
          agerating: "18",
          creator: "Paul W.S. Anderson",            
          release_year: "1997",
          genre: "Horror/Sci-fi",
          duration: "1h 36m",          
          description: "After disappearing for seven years, revolutionary spaceship Event Horizon is rediscovered. The team of scientists sent to investigate find that the entire crew is dead, and a terrifying, malevolent presence is lurking on board.",
          mobilebackground: "/images/eventhorizon/covers/eventhorizon_background.jpg",
          videos: generateSeasonVideos({}, "event-horizon", "movie"),
        }, 
        "lovedeathandrobots": {
          type: "show",  
          title: "Love Death + Robots",
          ratings: "8.4",
          agerating: "18",
          creator: "David Fincher",            
          release_year: "2019",
          genre: "Fantasy",
          season_total_number: "4 seasons",
          season_digit: 4,
          description: "This collection of animated short stories spans several genres, including science fiction, fantasy, horror and comedy. World-class animation creators bring captivating stories to life in the form of a unique and visceral viewing experience. The animated anthology series includes tales that explore alternate histories, life for robots in a post-apocalyptic city and a plot for world domination by super-intelligent yogurt. Among the show's executive producers is Oscar-nominated director David Fincher.",
          mobilebackground: "/images/lovedeathandrobots/covers/lovedeathandrobots_background.jpg",
          videos: videoDataByShow["lovedeathandrobots"],
        },          
        "demons": {
          type: "movie",  
          title: "Demons",
          ratings: "7.9",
          agerating: "18",
          creator: "Toshio Matsumoto", 
          release_year: "1971",
          genre: "Horror/Action",
          duration: "2h 15m",          
          description: "A ronin warrior seeks bloody revenge after he is bobbed by a geisha.",
          mobilebackground: "/images/demons/covers/demons_background.jpg",
          videos: generateSeasonVideos({}, "demons", "movie"),
        }, 
        "blackmirror": {
          type: "show",  
          title: "Black Mirror",
          ratings: "8.7",
          agerating: "18",
          creator: "Charlie Brooker", 
          release_year: "2011",
          genre: "Fantasy",
          season_total_number: "4 seasons",
          season_digit: 4,
          description: "A series of stand-alone dramas -- sharp, suspenseful, satirical tales that explore techno-paranoia -- Black Mirror is a contemporary reworking of The Twilight Zone with stories that tap into the collective unease about the modern world, particularly regarding both intended and unintended consequences of new technologies and the effect they have on society and individuals.",
          mobilebackground: "/images/blackmirror/covers/blackmirror_background.jpg",
          videos: videoDataByShow["blackmirror"],
        }, 
        "severance": {
          type: "show",  
          title: "Severance",
          ratings: "8.7",
          agerating: "18",
          creator: "Dan Erickson", 
          release_year: "2022",
          genre: "Thriller",
          season_total_number: "2 seasons",
          season_digit: 2,
          description: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives; when a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.",
          mobilebackground: "/images/severance/covers/severance_background.jpg",
          videos: videoDataByShow["severance"],
        }, 
        "pluribus": {
          type: "show",  
          title: "Pluribus",
          ratings: "8.5",
          agerating: "18",
          creator: "Vince Gilligan",
          release_year: "2025",
          genre: "Drama",
          season_total_number: "1 season",
          season_digit: 1,
          description: "In a world overtaken by a mysterious wave of forced happiness, Carol Sturka, one of the few immune, must uncover what's really going on - and save humanity from its own bliss.",
          mobilebackground: "/images/pluribus/covers/pluribus_background.jpg",
          subtitles: "yes",
          videos: videoDataByShow["pluribus"],
        },           
        "akira": {
          type: "movie",  
          title: "Akira",
          ratings: "8.0",
          agerating: "18",
          creator: "Katsuhiro Ôtomo", 
          release_year: "1988",
          genre: "Cyberpunk/Action",
          duration: "2h 4m",          
          description: "A secret military project endangers Neo-Tokyo when it turns a teenage biker gang member into a rampaging psychic psychopath who can only be stopped by his best friend.",
          mobilebackground: "/images/akira/covers/akira_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "akira", "movie"),
        },  
        "exmachina": {
          type: "movie",  
          title: "Ex Machina",
          ratings: "7.7",
          agerating: "18",
          creator: "Alex Garland", 
          release_year: "2014",
          genre: "Thriller/Sci-Fi",
          duration: "1h 48m",          
          description: "A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence by evaluating the human qualities of a highly advanced humanoid A.I.",
          mobilebackground: "/images/exmachina/covers/exmachina_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "exmachina", "movie"),
        },     
        "annihilation": {
          type: "movie",  
          title: "Annihilation",
          ratings: "6.8",
          agerating: "18",
          creator: "Alex Garland", 
          release_year: "2018",
          genre: "Psychological Horror",
          duration: "1h 55m",          
          description: "A biologist signs up for a dangerous, secret expedition in which the laws of nature don't apply.",
          mobilebackground: "/images/annihilation/covers/annihilation_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "annihilation", "movie"),
        },    
        "itsalwayssunny": {
          type: "show",  
          title: "It's Always Sunny in Philadelphia",
          ratings: "8.8",
          agerating: "18",
          creator: "Glenn Howerton",
          release_year: "2005",
          genre: "Comedy",
          season_total_number: "16 seasons",
          season_digit: 16,
          description: "Five friends with big egos and small brains are the proprietors of an Irish pub in Philadelphia.",
          mobilebackground: "/images/itsalwayssunny/covers/itsalwayssunny_background.jpg",
          videos: videoDataByShow["itsalwayssunny"],
        }, 
        "thetwilightzone": {
          type: "show",  
          title: "The Twilight Zone",
          ratings: "9.0",
          agerating: "18",
          creator: "Rod Serling",
          release_year: "1959",
          genre: "Comedy",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Classic American Anthology series created by Rod Serling, featuring standalone stories of science fiction, fantasy, and horror, each with a twist ending or moral lesson.",
          mobilebackground: "/images/thetwilightzone/covers/itsalwayssunny_background.jpg",
          videos: videoDataByShow["thetwilightzone"],
        }, 
        "redline": {
          type: "movie",  
          title: "Redline",
          ratings: "7.5",
          agerating: "18",
          creator: "Takeshi Koike", 
          release_year: "2009",
          genre: "Action/Sci-Fi",
          duration: "1h 42m",          
          description: "A story about the most popular racing event in the galaxy, the Redline, and the various racers who compete in it.",
          mobilebackground: "/images/redline/covers/redline_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "redline", "movie"),
        }, 
        "bugonia": {
          type: "movie",  
          title: "Bugonia",
          ratings: "7.4",
          agerating: "18",
          creator: "Yorgos Lanthimos", 
          release_year: "2025",
          genre: "Comedy/Sci-Fi",
          duration: "1h 58m",          
          description: "Two conspiracy-obsessed young men kidnap the high-powered CEO of a major company, convinced that she is an alien intent on destroying planet Earth.",
          mobilebackground: "/images/bugonia/covers/bugonia_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "bugonia", "movie"),
        }, 
        "frankenstein": {
          type: "movie",  
          title: "Frankenstein",
          ratings: "7.4",
          agerating: "18",
          creator: "Guillermo del Toro", 
          release_year: "2025",
          genre: "Dark Fantasy",
          duration: "2h 29m",          
          description: "Dr. Victor Frankenstein, a brilliant but egotistical scientist, brings a creature to life in a monstrous experiment that ultimately leads to the undoing of both the creator and his tragic creation.",
          mobilebackground: "/images/frankenstein/covers/frankenstein_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "frankenstein", "movie"),
        }, 
        "truedetective": {
          type: "show",  
          title: "True Detective",
          ratings: "8.8",
          agerating: "18",
          creator: "Nic Pizzolatto", 
          release_year: "2014",
          genre: "Psychological Drama",
          season_total_number: "1 season",
          season_digit: 1,
          description: "True Detective explores Cohle and Hart's recollection of their investigation of the murder of Dora Lange from 1995 to 2002.",
          mobilebackground: "/images/thetwilightzone/covers/itsalwayssunny_background.jpg",
          subtitles: "yes",
          videos: videoDataByShow["truedetective"],
        }, 
        "sunsetboulevard": {
          type: "movie",  
          title: "Sunset Boulevard",
          ratings: "8.4",
          agerating: "18",
          creator: "Billy Wilder", 
          release_year: "1950",
          genre: "Psychological Drama",
          duration: "1h 50m",          
          description: "A screenwriter develops a dangerous relationship with a faded film star determined to make a triumphant return.",
          background: "/images/sunsetboulevard/covers/sunsetboulevardCover.svg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "sunsetboulevard", "movie"),
        },
        "shikijitsu": {
          type: "movie",  
          title: "Shiki-Jitsu",
          ratings: "7.5",
          agerating: "18",
          creator: "Hideaki Anno", 
          release_year: "2000",
          genre: "Drama",
          duration: "2h 8m",          
          description: "A disillusioned filmmaker has an encounter with a young girl who has a ritual of repeating 'Tomorrow is my birthday' every day. He tries to communicate with her through his video camera.",
          background: "/images/shikijitsu/covers/shikijitsuCover.svg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "shikijitsu", "movie"),
        },
        "speaknoevil": {
          type: "movie",  
          title: "Speak No Evil",
          ratings: "6.7",
          agerating: "18",
          creator: "Christian Tafdrup", 
          release_year: "2022",
          genre: "Psychological Drama",
          duration: "1h 37m",          
          description: "A Danish family visits a Dutch family they met on a holiday. What was supposed to be an idyllic weekend slowly starts unraveling as the Danes try to stay polite in the face of unpleasantness.",
          background: "/images/speaknoevil/covers/speaknoevilCover.svg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "speaknoevil", "movie"),
        },
        "ikiru": {
          type: "movie",  
          title: "Ikiru",
          ratings: "8.3",
          agerating: "18",
          creator: "Akira Kurosawa", 
          release_year: "1952",
          genre: "Psychological Drama",
          duration: "2h 23m",          
          description: "A bureaucrat tries to find meaning in his life after he discovers he has terminal cancer.",
          background: "/images/ikiru/covers/ikiruCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "ikiru", "movie"),
        },
        "theericandreshow": {
          type: "show",  
          title: "The Eric André Show",
          ratings: "8.5",
          agerating: "18",
          creator: "Eric André", 
          release_year: "2012",
          genre: "Sketch Comedy",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Eric Andre tries to host a talk show in a bizarre environment, where he is sometimes the player of pranks and sometimes the victim.",
          mobilebackground: "/images/theericandreshow/covers/theericandreshow_background.jpg",
          videos: videoDataByShow["theericandreshow"],
        },
        "pokemon2000": {
          type: "movie",  
          title: "Pokémon 2000",
          ratings: "6.1",
          agerating: "12",
          creator: "Kunihiko Yuyama", 
          release_year: "1999",
          genre: "Adventure",
          duration: "1h 39m",          
          description: "Ash Ketchum must gather the three spheres of fire, ice and lightning in order to restore balance to the Orange Islands.",
          mobilebackground: "/images/pokemon2000/covers/pokemon2000_background.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "pokemon2000", "movie"),
        }, 

      };
      const show = shows[showId];
      console.log({ cleanShowId: cleanShowId(showId) });

      const hasAutoPlayedRef = useRef(false);

      useEffect(() => {
        if (!show) return;
        if (!fromContinueWatching) return;         
        if (hasAutoPlayedRef.current) return;      
        if (videoPlayerVisible || selectedVideo) return; 

        async function startAutoplay() {
          if (show.type === "movie" || show.type === "Movies") {
            const movieVideos = show.videos || [];
            const first = movieVideos[0];
            if (!first) return;
            let videoPath = first.path;
            if (awsHostedShows.includes(showId)) {
              const parts = videoPath.split(".com/");
              const s3Key = parts.length > 1 ? parts[1] : "";
              if (s3Key) {
                videoPath = await fetchSignedUrl(s3Key);
              }
            }
            updateLastWatched(showId, null, null);
            setSelectedVideo({ path: videoPath, season: null, episode: null });
            setVideoPlayerVisible(true);
            return;
          }

          if (!autoplaySeason || !autoplayEpisode) return;
          const seasonKey = `season${autoplaySeason}`;
          const episodes = show.videos?.[seasonKey] || [];
          const episodeIndex = autoplayEpisode - 1;
          const ep = episodes[episodeIndex];
          if (!ep) return;
          let videoPath = ep.path;
          if (awsHostedShows.includes(showId)) {
            const parts = videoPath.split(".com/");
            const s3Key = parts.length > 1 ? parts[1] : "";
            if (s3Key) {
              videoPath = await fetchSignedUrl(s3Key);
            }
          }
          setSelectedSeason(autoplaySeason);
          updateLastWatched(showId, autoplaySeason, autoplayEpisode);
          setSelectedVideo({
            path: videoPath,
            season: autoplaySeason,
            episode: autoplayEpisode,
          });
          setVideoPlayerVisible(true);
        }
        hasAutoPlayedRef.current = true; 
        startAutoplay();
      }, [show, fromContinueWatching, autoplaySeason, autoplayEpisode, videoPlayerVisible, selectedVideo, showId]);





      {/* Scroll Reset */}
        useEffect(() => {
        if (episodeListRef.current) {
            episodeListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        }, [selectedSeason]);      

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


    {/* Subtitle States */}



  {/* Color Gradient */}
  const rgba = (arr, a=1) => `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${a})`;

  function buildGradientFromPalette(palette) {
    // palette[0] = dominant, [1],[2] = supporting
    const a = palette[0] ?? [0,0,0];
    const b = palette[1] ?? a;
    const c = palette[2] ?? a;

    // Bottom-heavy overlay that fades upward
    return `linear-gradient(
      to top,
      ${rgba(a, 1.0)}100%,
      ${rgba(b, 1.00)} 65%,
      ${rgba(c, 1.00)} 35%,
      ${rgba(c, 1.00)} 0%
    )`;
  }
  useEffect(() => {
  const img = bgImgRef.current;
  if (!img) return;

  const extract = () => {
    try {
      const ct = new ColorThief();
      // getPalette wants a loaded HTMLImageElement (same-origin or CORS-enabled)
      const palette = ct.getPalette(img, 5); // 5 colors is plenty
      setBgGradient(buildGradientFromPalette(palette));
    } catch (e) {
      console.warn('ColorThief failed, keeping fallback gradient', e);
    }
  };

  if (img.complete) {
    extract();
  } else {
    img.addEventListener('load', extract, { once: true });
  }
}, [showId]);




{/* Current show */}
const videos = SHOWS;
const carouselShows = videos; 
const [currentIndex, setCurrentIndex] = useState(0);
const currentShow = videos.find(media => media.id === showId) || null;


{/* Placeholder Loader */}
const [loadedImages, setLoadedImages] = useState({});


{/* Last Watched */}
const updateLastWatched = (showId, season, episode) => {
  try {
    const raw = localStorage.getItem("lastWatchedMobile");
    const list = raw ? JSON.parse(raw) : [];
    const entry = {
      showId,
      lastSeason: season,
      lastEpisode: episode,
      watchedAt: Date.now(),
    };
    list.push(entry);
    localStorage.setItem("lastWatchedMobile", JSON.stringify(list));
    syncWatchHistory({ showId, season, episode });
  } catch (err) {
    console.error("Failed to update last watched", err);
  }
};
const videoRef = useRef(null);
const parseProgressPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { currentTime: 0, duration: 0 };
  }

  const currentTime = Number(
    payload.currentTime ?? payload.t ?? payload.time ?? payload.progress ?? 0
  );
  const duration = Number(payload.duration ?? payload.d ?? 0);

  return {
    currentTime: Number.isFinite(currentTime) ? currentTime : 0,
    duration: Number.isFinite(duration) ? duration : 0,
  };
};

const saveWatchProgress = (currentTime, duration) => {
  if (!selectedVideo || !show) return;
  if (!duration || Number.isNaN(duration)) return;

  let key;

  if (show.type === "movie" || show.type === "Movies") {
    // Movies: simple key
    key = `watchProgress-${showId}`;
  } else {
    // Shows: season + episode (numbers in selectedVideo)
    const seasonNum = Number(selectedVideo.season);
    const episodeNum = Number(selectedVideo.episode);

    if (!seasonNum || !episodeNum) return;

    key = `watchProgress-${showId}-S${String(seasonNum).padStart(2, "0")}-E${String(
      episodeNum
    ).padStart(2, "0")}`;
  }

  try {
    const data = {
      t: currentTime,
      d: duration,
      currentTime,
      duration,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    queueWatchProgressSync({
      showId,
      season: show.type === "movie" || show.type === "Movies" ? null : Number(selectedVideo?.season || 0),
      episode: show.type === "movie" || show.type === "Movies" ? null : Number(selectedVideo?.episode || 0),
      currentTime,
      duration,
    });
  } catch (err) {
    console.error("Failed to save watch progress", err);
  }
};

const getSavedTime = (season, episode) => {
  if (!show) return 0;
  let key;
  if (show.type === "movie" || show.type === "Movies") {
    key = `watchProgress-${showId}`;
  } else {
    const seasonNum = Number(season);
    const episodeNum = Number(episode);
    if (!seasonNum || !episodeNum) return 0;
    key = `watchProgress-${showId}-S${String(seasonNum).padStart(2, "0")}-E${String(
      episodeNum
    ).padStart(2, "0")}`;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;

    const data = JSON.parse(raw);
    return parseProgressPayload(data).currentTime;
  } catch (err) {
    console.error("Failed to read watch progress", err);
    return 0;
  }
};
useEffect(() => {
  if (!selectedVideo || !show) return;
  const video = videoRef.current;
  if (!video) return;
  const seasonForKey =
    show.type === "movie" || show.type === "Movies"
      ? null
      : selectedVideo.season;
  const episodeForKey =
    show.type === "movie" || show.type === "Movies"
      ? null
      : selectedVideo.episode;

  const savedTime = getSavedTime(seasonForKey, episodeForKey);
  if (!savedTime || savedTime <= 0) return;

  const applyTime = () => {
    video.currentTime = savedTime;
    video.removeEventListener("loadedmetadata", applyTime);
  };

  if (video.readyState >= 1) {
    applyTime();
  } else {
    video.addEventListener("loadedmetadata", applyTime);
  }
}, [selectedVideo, show, showId]);


const handleTimeUpdate = () => {
  const video = videoRef.current;
  if (!video) return;
  saveWatchProgress(video.currentTime, video.duration);
};



const getWatchProgressPercent = (showId, season, episode) => {
  let key;

  if (show?.type === "movie" || show?.type === "Movies") {
    key = `watchProgress-${showId}`;
  } else {
    const seasonNum = Number(season);
    const episodeNum = Number(episode);
    if (!seasonNum || !episodeNum) return 0;

    key = `watchProgress-${showId}-S${String(seasonNum).padStart(2, "0")}-E${String(
      episodeNum
    ).padStart(2, "0")}`;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;

    const data = JSON.parse(raw);
    const { currentTime, duration } = parseProgressPayload(data);
    if (!duration || duration <= 0) return 0;

    const pct = (currentTime / duration) * 100;
    return Math.max(0, Math.min(100, pct));
  } catch (err) {
    console.error("Failed to read watch progress percent", err);
    return 0;
  }
};

const subtitleTrackSrc = getSubtitleTrackSrc({
  showId,
  season: selectedVideo?.season ?? null,
  episode: selectedVideo?.episode ?? null,
});




  return (
    <div className='flex w-full h-dvh relative flex-col bg-black overflow-y-hidden'>
        <div className="absolute inset-0 z-0 overflow-hidden">
          {currentShow && (
            <img
              ref={bgImgRef} 
              src={currentShow.background}
              alt={currentShow.title}
              className="w-full h-full object-cover"
              style={{ aspectRatio: "16/9" }}
            />
          )}
        </div>

        {videoPlayerVisible && selectedVideo && (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 z-[100] flex items-center justify-center">
                <video 
                    ref={videoRef}
                    src={selectedVideo.path} 
                    controls 
                    autoPlay 
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleTimeUpdate}
                    className="w-[90%] h-[80%] rounded-lg shadow-lg"
                >

                {subtitleTrackSrc && (
                  <track
                    src={subtitleTrackSrc}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                  />
                )}

                </video>
                <button 
                    onClick={() => setVideoPlayerVisible(false)} 
                    className="absolute top-8 right-8 text-white text-3xl font-bold"
                >
                    ✕
                </button>
            </div>
        )}

        <div className='flex w-full h-full z-10 px-3 py-4'>

            <div className='flex flex-col alexandria-font w-full h-full px-6 pt-6 bg-black/20 overflow-scroll no-scrollbar backdrop-blur-sm border border-white/10 inset-shadow-2xs inset-shadow-white/20 rounded-2xl z-20'>
                
                <motion.span 
                  className="absolute mt-1 left-2 text-white/50"
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNavigate}
                >
                  {leftChevron}
                </motion.span>
                <span className='text-white text-center font-bold text-4xl'> {show?.title} </span> 
                <span className='text-lg mt-1 text-center text-white/60'> {show?.creator} </span>

                <div className='flex flex-row w-full mt-3 items-center justify-center gap-4'>
                    <span className='flex justify-center items-center border w-10 p-1 rounded-lg text-sm text-white'>
                        {show?.agerating}+
                    </span>
                    <span className='text-white'>
                        {hdIcon}
                    </span>
                    <span className='text-yellow-500 flex flex-row items-center gap-1'>
                        {starIcon} <span className='text-white text-md'> {show?.ratings} </span>
                    </span>
                </div>

            {/* Season List */}
            <div ref={dropdownRef} className="flex flex-col w-full mt-2 left-2 text-white z-[50]">
                {show?.type === "movie" ? (
                    <div className="flex absolute items-center gap-2 text-2xl font-semibold">
                        {layersIcon} <span>Movie</span>
                    </div>
                ) : (
                    <>
                        <button 
                            className="flex items-center gap-2 text-2xl font-semibold cursor-pointer"
                            onClick={() => {
                                if (show?.season_digit > 1) {
                                setSeasonDropdownOpen(!seasonDropdownOpen);
                                }
                            }}                            
                        >
                            {layersIcon}
                            <span>Season {selectedSeason}</span>
                            <Chevron isOpen={seasonDropdownOpen} />
                        </button>
                        

                        {/* Season Dropdown */}
                        <AnimatePresence>
                            {seasonDropdownOpen && (
                              <motion.div
                                layout
                                variants={dropdownVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                style={{ background: bgGradient }}
                                className="rounded-2xl w-full overflow-hidden mt-2"
                              >
                                {Array.from({ length: show?.season_digit }, (_, i) => i + 1).map(season => (
                                  <motion.button
                                    key={season}
                                    variants={itemVariants}
                                    onClick={() => {
                                      setSelectedSeason(season);
                                      setSeasonDropdownOpen(false);
                                    }}
                                    className={`flex justify-center text-3xl py-4 w-full cursor-pointer ${
                                      season === selectedSeason ? "text-white font-bold border border-white/40 rounded-2xl" : "text-white/60"
                                    }`}
                                  >
                                    Season {season}
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>


            {/* Episode List */}
            <div 
                ref={episodeListRef} 
                className={`${
                    show?.type === "movie"
                    ? "flex w-full justify-center mt-10 "  
                    : "flex w-full overflow-scroll mt-2 overflow-x-hidden scrollbar-hidden"   
                }`}                
            >
                <AnimatePresence mode="wait">
                    <motion.div 
                    key={selectedSeason}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}      
                    className="flex flex-col h-full w-full items-end gap-6 z-[8]"
                    >
                        
                    {(show?.type === "show" 
                        ? (show?.videos?.[`season${selectedSeason}`] || []) 
                        : show?.videos || []
                    ).map((videoUrl, index) => {
                        const videoPath = videoUrl.path;
                        const displayName = videoUrl.title;
                        const cleanShowId = showId.replace(/-/g, '');

                        let episodeName = '';
                        let cleanedEpisodeName = '';
                        let placeholderPath = '';

                        const filename = videoUrl.path.split("/").pop();  
                        const baseName = filename.replace(".mp4", "");
                        const parts = baseName.split("_");

                        const episodeNumber = index + 1;  
                        const rawTitleParts = parts.slice(2); 
                        const episodeTitle = rawTitleParts
                            .join(" ")
                            .replace(/\b\w/g, c => c.toUpperCase()); 
                        const wordCount = episodeTitle.trim().split(/\s+/).length;

                        if (show?.type === "show") {
                            const rawSeason = videoUrl.season; // S01
                            const seasonNumber = parseInt(rawSeason.slice(1), 10); 
                            const cleanedSeason = `S${parseInt(rawSeason.slice(1), 10)}`;
                            const episodeNumber = index + 1;

                            const filename = videoUrl.path.split("/").pop();  
                            const baseName = filename.replace(".mp4", "");
                            const parts = baseName.split("_");

                            const rawTitleParts = parts.slice(2); 
                            const episodeTitle = rawTitleParts
                                .join(" ")
                                .replace(/\b\w/g, c => c.toUpperCase()); 

                            episodeName = `${episodeNumber}: ${episodeTitle}`;
                            cleanedEpisodeName = `${episodeNumber}. ${episodeTitle}`;
                            const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";

                            placeholderPath = `${cloudFrontDomain}/${cleanShowId}/placeholders/season${seasonNumber}/${cleanedSeason}E${episodeNumber}_${cleanShowId}_placeholder.png`
                        } else {
                            cleanedEpisodeName = displayName;
                            placeholderPath = `/images/${cleanShowId}/placeholders/${cleanShowId}_placeholder.png`;
                        }
                        const isLoading = !loadedImages[placeholderPath];
                        const progressPercent = getWatchProgressPercent(
                          showId,
                          show?.type === "movie" || show?.type === "Movies"
                            ? null
                            : parseInt(videoUrl.season?.slice(1), 10),
                          show?.type === "movie" || show?.type === "Movies"
                            ? null
                            : index + 1
                        );



                        return (
                            <motion.div 
                                key={index}
                                className={`flex flex-col w-full items-center cursor-pointer flex-shrink-0 snap-center ${
                                    show?.type !== "movie" ? "gap-4" : ""
                                }`}
                                onClick={ async () => {
                                let videoPath = videoUrl.path;
                            
                                if (awsHostedShows.includes(showId)) {
                                    const urlParts = videoUrl.path.split(".com/");
                                    const s3Key = urlParts.length > 1 ? urlParts[1] : "";
                                    videoPath = await fetchSignedUrl(s3Key);
                                    console.log("✅ Signed Video URL:", videoPath);
                                }

                                const seasonForHistory = show?.type === "show" ? selectedSeason : null;
                                const episodeForHistory = show?.type === "show" ? index + 1 : null;    
                                updateLastWatched(showId, seasonForHistory, episodeForHistory);                            
                                
                                setSelectedVideo({ path: videoPath, season: selectedSeason, episode: index + 1 });
                                setVideoPlayerVisible(true);
                                }}
                            >
                            
                              {/* Placeholder Images */}
                              <div className="relative w-full flex flex-row items-center gap-2">
                                <motion.div
                                  whileTap={{
                                    scale: 0.9,
                                    boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                                    transition: { duration: 0.3, ease: "easeInOut" },
                                  }}
                                  style={{
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundRepeat: "no-repeat",
                                    ...(loadedImages[placeholderPath]
                                      ? { backgroundImage: `url(${placeholderPath})` }
                                      : {}),
                                  }}
                                  className={`flex border border-white/10 inset-shadow-2xs inset-shadow-white/30
                                    ${show?.type === "movie"
                                      ? "w-90 h-88 rounded-3xl shadow-2xl relative z-40"
                                      : "w-86 h-48 rounded-2xl shadow-lg relative mb-2"
                                    }
                                    ${!loadedImages[placeholderPath] ? "animate-pulse bg-white/5" : ""}
                                  `}
                                >
                                  <img
                                    src={placeholderPath}
                                    alt=""
                                    className="hidden"
                                    onLoad={() =>
                                      setLoadedImages((prev) => ({
                                        ...prev,
                                        [placeholderPath]: true,
                                      }))
                                    }
                                    onError={() =>
                                      setLoadedImages((prev) => ({
                                        ...prev,
                                        [placeholderPath]: true, 
                                      }))
                                    }
                                  />

                                  {show?.type === "movie" ? (
                                    <div></div>
                                  ) : (
                                    <div className="p-2 h-[28%] bg-black/20 backdrop-blur-xs border border-white/30 rounded-tl-2xl rounded-br-2xl">
                                      <span className="text-white text-4xl p-2 relative">{episodeNumber}</span>
                                    </div>
                                  )}
                                  {progressPercent > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 px-2 pb-1">
                                      <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-white"
                                          style={{ width: `${progressPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  
                                </motion.div>
                              </div>

 


                                {show?.type === "movie" && (
                              <div className=" w-full justify-center flex p-4 z-50 text-white/60 font-light text-md overflow-scroll text-wrap whitespace-normal break-words text-center px-4 pointer-events-none">
                                  <span>{show?.description}</span>
                              </div>
                              )}                           

                              {show?.type === "movie" ? (
                                  <div className=""> </div>
                              ) : (
                                  <div
                                      className={`text-white/80 flex font-semibold ${
                                          episodeTitle.trim().split(/\s+/).length > 5 ? "text-md" : "text-4xl"
                                      } text-wrap text-center whitespace-normal break-words overflow-hidden text-ellipsis`}
                                  >
                                      {episodeTitle}
                                  </div>
                              )}
                              <div className="w-full h-[1px] bg-white/10"></div>
                            </motion.div>
                        );
                    })}

                    </motion.div> 
                </AnimatePresence>
            </div>



            </div>
        </div>     
    </div>
  )
}

export default MobileShows
