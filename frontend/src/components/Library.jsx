import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Show from './Show.jsx'
import Chevron from './Chevron.jsx'
import Menu from './framercomponents/Menu.jsx'
import WatchProgressBar from "./WatchProgressBar.jsx";
import { allEpisodeTitles } from "./episodeTitles.js";



const Library = () => {

    
    const { showId } = useParams();
    console.log(showId);
    const navigate = useNavigate();

    const [expanded, setExpanded] = useState(false);
    const cleanShowId = (id) => id.replace(/-/g, "");
    const location = useLocation();

    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

    const layersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-layers-fill" viewBox="0 0 16 16"><path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/><path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/></svg>
    const downChevron = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/></svg>
    const closeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>

    {/* Variants */}
    const dropdownVariants = {
      hidden: { opacity: 0, scale: 0.95, x: -10 },
      visible: {
        opacity: 1,
        scale: 1,
        x: 0,
        transition: {
          type: "spring",
          stiffness: 150,
          damping: 20,
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
      exit: { opacity: 0, scale: 0.95, x: -10 },
    };
    
    const itemVariants = {
      hidden: { opacity: 0, x: -10 },
      visible: { opacity: 1, x: 0 },
    };

    {/* Skip Handler */}
    const handleSkipToNext = async (targetSeason, targetEpisode, signedUrl = null, opts = {}) => {
      const isJJKOutro = opts.source === "outro" && showId === "jjk";
      const episodes = show?.videos?.[`season${targetSeason}`] || [];
      const idx = Math.max(0, (targetEpisode ?? 1) - 1);
      const ep = episodes[idx];
      const videoPath = signedUrl || ep?.path;
      if (!videoPath) {
        console.warn("🛑 No path for target episode; not changing selection.", {
          targetSeason,
          targetEpisode,
          hasEpisodes: episodes.length,
        });
        return;
      }
      setSelectedVideo({
        path: videoPath,
        showId,
        season: targetSeason,
        episode: targetEpisode,
        skipIntro: !isJJKOutro,
      });
    };

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



    
const extractS3KeyFromPath = (path) => {
  const match = path.match(/https:\/\/[^/]+\.amazonaws\.com\/(.+)/);
  return match ? match[1] : "";
};

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
          release_year: "2013",
          genre: "Adventure",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Steven Universe is a coming-of-age story told from the perspective of Steven, a chubby and happy-go-lucky boy and the youngest member of an intergalactic team of warriors called the Crystal Gems. Together, the Crystal Gems fight and protect the Universe, while Steven strums up a cheesy tune on his ukulele.",
          background: "/images/stevenuniverse/covers/stevenuniverseCover.webp",
          videos: videoDataByShow["steven-universe"],
        },

        "adventure-time": {
          type: "show",  
          title: "Adventure Time",
          release_year: "2010",
          genre: "Adventure",
          season_total_number: "10 seasons",
          season_digit: 10,
          description: "Twelve-year-old Finn battles evil in the Land of Ooo. Assisted by his magical dog, Jake, Finn roams the Land of Ooo righting wrongs and battling evil. Usually that evil comes in the form of the Ice King, who is in search of a wife.",
          background: "/images/adventuretime/covers/adventuretimeCover.jpg",
          videos: videoDataByShow["adventure-time"], 
        },

        "over-the-garden-wall": {
          type: "show",  
          title: "Over the Garden Wall",
          release_year: "2014",
          genre: "Adventure",
          season_total_number: "1 season",
          season_digit: 1,
          description: "On an adventure, brothers Wirt and Greg get lost in the Unknown, a strange forest adrift in time; as they attempt to find a way out of the Unknown, they cross paths with a mysterious old woodsman and a bluebird named Beatrice.",
          background: "/images/overthegardenwall/covers/overthegardenwallCover.png",
          videos: videoDataByShow["over-the-garden-wall"],
        },

        "neon-genesis": {
          type: "show",  
          title: "Neon Genesis Evangelion",
          release_year: "1997",
          genre: "Apocalyptic",
          season_total_number: "1 season",
          season_digit: 1,
          description: "Fourteen-year-old Shinji reluctantly pilots a giant sentient machine in battle to protect Earth.",
          background: "/images/neongenesis/covers/neongenesisCover.png",
          subtitles: "yes",
          videos: videoDataByShow["neon-genesis"],
        },        

        "perfect-blue": {
          type: "movie",  
          title: "Perfect Blue",
          release_year: "1997",
          genre: "Horror/Mystery",
          duration: "1h 21m",
          description: "A young Japanese singer is encouraged by her agent to quit singing and pursue an acting career, beginning with a role in a murder mystery TV show.",
          background: "/images/perfectblue/covers/perfectblueCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "perfect-blue", "movie"),
        },

        "paprika": {
          type: "movie",
          title: "Paprika",
          release_year: "2006",
          genre: "Thriller/Sci-fi",
          duration: "1h 30m",
          description: "Dr. Atsuko Chiba works as a scientist by day and, under the code name 'Paprika', is a dream detective at night. Atsuko and her colleagues are working on a device called the DC Mini, which is intended to help psychiatric patients, but in the wrong hands it could destroy people's minds. When a prototype is stolen, Atsuko/Paprika springs into action to recover it before damage is done.",
          background: "/images/paprika/covers/paprikaCover.webp",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "paprika", "movie"),
        },

        "princess-mononoke": {
          type: "movie",
          title: "Princess Mononoke",
          release_year: "1997",
          genre: "Fantasy/Adventure",
          duration: "2h 13m",
          description: "In the 14th century, the harmony that humans, animals and gods have enjoyed begins to crumble. The protagonist, young Ashitaka - infected by an animal attack, seeks a cure from the deer-like god Shishigami. In his travels, he sees humans ravaging the earth, bringing down the wrath of wolf god Moro and his human companion Princess Mononoke. Hiskattempts to broker peace between her and the humans brings only conflict.",
          background: "/images/princessmononoke/covers/princessmononokeCover.jpg",
          videos: generateSeasonVideos({}, "princess-mononoke", "movie"),
        },
        "aniara": {
          type: "movie",
          title: "Aniara",
          release_year: "1960",
          genre: "SciFi/Adventure",
          duration: "2h",
          description: "Aniara is one of the spaceships used for transporting Earth's population to their new home-planet Mars. But just as Aniara leaves the ruined Earth, she collides with an asteroid and is knocked off her course.",
          background: "/images/aniara/covers/aniaraCover.jpg",
          videos: generateSeasonVideos({}, "aniara", "movie"),
        },
        "the-vanishing": {
          type: "movie",
          title: "The Vanishing",
          release_year: "1988",
          genre: "Horror/Crime",
          duration: "1h 47m",
          description: "Rex and Saskia, a young couple in love, are on vacation. They stop at a busy service station and Saskia is abducted. After three years and no sign of Saskia, Rex begins receiving letters from the abductor.",
          background: "/images/thevanishing/covers/thevanishingCover.png",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "the-vanishing", "movie"),
        },
        "the-lighthouse": {
          type: "movie",
          title: "The Lighthouse",
          release_year: "2019",
          genre: "Horror/Crime",
          duration: "1h 49m",
          description: "Two lighthouse keepers try to maintain their sanity while living on a remote and mysterious New England island in the 1890s.",
          background: "/images/thelighthouse/covers/thelighthouseCover.jpg",
          videos: generateSeasonVideos({}, "the-lighthouse", "movie"),
        },     
        
        "a-ghost-story": {
          type: "movie",
          title: "A Ghost Story",
          release_year: "2017",
          genre: "Fantasy/Romance",
          duration: "1h 32m",
          description: "In this singular exploration of legacy, love, loss, and the enormity of existence, a recently deceased, white-sheeted ghost returns to his suburban home to try to reconnect with his bereft wife.",
          background: "/images/aghoststory/covers/aghoststoryCover.webp",
          videos: generateSeasonVideos({}, "a-ghost-story", "movie"),
        },
        
        "little-miss-sunshine": {
          type: "movie",
          title: "Little Miss Sunshine",
          release_year: "2006",
          genre: "Comedy/Drama",
          duration: "1h 41m",
          description: "A family determined to get their young daughter into the finals of a beauty pageant take a cross-country trip in their VW bus.",
          background: "/images/littlemisssunshine/covers/littlemisssunshineCover.jpg",
          videos: generateSeasonVideos({}, "little-miss-sunshine", "movie"),
        },
        "ghost-in-the-shell": {
          type: "movie",
          title: "Ghost In The Shell",
          release_year: "1995",
          genre: "Action/Sci-fi",
          duration: "1h 23m",
          description: "A cyborg policewoman and her partner hunt a mysterious and powerful hacker called the Puppet Master.",
          background: "/images/ghostintheshell/covers/ghostintheshellCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "ghost-in-the-shell", "movie"),
        },
        "mob-psycho": {
          type: "show",  
          title: "Mob Psycho 100",
          release_year: "2016",
          genre: "Shonen manga/Comedy",
          season_total_number: "3 seasons",
          season_digit: 3,
          description: "A psychic middle school boy tries to live a normal life and keep his growing powers under control, even though he constantly gets into trouble.",
          background: "/images/mobpsycho/covers/mobpsychoCover.jpeg",
          subtitles: "yes",
          videos: videoDataByShow["mob-psycho"],
        }, 
        "fmab": {
          type: "show",  
          title: "Fullmetal Alchemist: Brotherhood",
          release_year: "2009",
          genre: "Adventure",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Brothers Edward and Alphonse Elric search for the Philsopher's Stone, hoping to restore their bodies, which were lost when they attempted to use their alchemy skills to resurrect their deceased mother. Edward, who lost only limbs, joins the State Military, which gives him the freedom to continue the search as he tries to restore his brother, whose soul is tethered to earth by a suit of armor. However, Edward and Alphonse are not the only ones seeking the powerful stone. And as they search, they learn of a plot to transmute the entire country for reasons they cannot comprehend.",
          background: "/images/fmab/covers/fmabCover.jpg",
          subtitles: "yes",
          videos: videoDataByShow["fmab"],
        },
        "jjk": {
          type: "show",  
          title: "Jujutsu Kaisen",
          release_year: "2020",
          genre: "Manga series",
          season_total_number: "3 seasons",
          season_digit: 3,
          description: "Yuji Itadori eats a cursed finger to save a classmate, and now Ryomen Sukuna, a powerfully evil sorcerer known as the King of Curses, lives in Itadori’s soul. Curses are supernatural terrors created from negative human emotions. This cursed energy can be used as a power source by jujutsu sorcerers and cursed spirits alike.",
          background: "/images/jjk/covers/jjkCover2.svg",
          subtitles: "yes",
          videos: videoDataByShow["jjk"],
        }, 
        "weapons": {
          type: "movie",  
          title: "Weapons",
          release_year: "2025",
          genre: "Horror",
          duration: "2h 8m",          
          description: "When all but one child from the same classroom mysteriously vanish on the same night at exactly the same time, a community is left questioning who or what is behind their disappearance.",
          background: "/images/weapons/covers/weaponsCover.jpg",
          videos: generateSeasonVideos({}, "weapons", "movie"),
        },     
        "tokyo-godfathers": {
          type: "movie",  
          title: "Tokyo Godfathers",
          release_year: "2003",
          genre: "Adventure/Comedy",
          duration: "1h 32m",          
          description: "Middle-aged alcoholic Gin (Darren Pleavin), teenage runaway Miyuki (Candice Moore) and former drag queen Hana (Myrta Dangelo) are a trio of homeless people surviving as a makeshift family on the streets of Tokyo. While rummaging in the trash for food on Christmas Eve, they stumble upon an abandoned newborn baby in a trash bin. With only a handful of clues to the baby's identity, the three misfits search the streets of Tokyo for help in returning the baby to its parents.",
          background: "/images/tokyogodfathers/covers/tokyogodfathersCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "tokyo-godfathers", "movie"),
        }, 
        "cyberpunk": {
          type: "show",  
          title: "Cyberpunk: Edgerunners",
          release_year: "2022",
          genre: "Action",
          season_total_number: "1 season",
          season_digit: 1,
          description: "A Street Kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an Edgerunner, a Mercenary outlaw also known as a Cyberpunk.",
          background: "/images/cyberpunk/covers/cyberpunkCover.jpg",
          subtitles: "yes",
          videos: videoDataByShow["cyberpunk"],
        },
        "solaris": {
          type: "movie",  
          title: "Solaris",
          release_year: "1972",
          genre: "Sci-fi/Mystery",
          duration: "2h 47m",          
          description: "A psychologist is sent to a station orbiting a distant planet in order to discover what has caused the crew to go insane.",
          background: "/images/solaris/covers/solarisCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "solaris", "movie"),
        },                                    
        "event-horizon": {
          type: "movie",  
          title: "Event Horizon",          
          release_year: "1997",
          genre: "Horror/Sci-fi",
          duration: "1h 36m",          
          description: "After disappearing for seven years, revolutionary spaceship Event Horizon is rediscovered. The team of scientists sent to investigate find that the entire crew is dead, and a terrifying, malevolent presence is lurking on board.",
          background: "/images/eventhorizon/covers/eventhorizonCover.jpg",
          videos: generateSeasonVideos({}, "event-horizon", "movie"),
        },    
        "lovedeathandrobots": {
          type: "show",  
          title: "Love Death + Robots",
          release_year: "2019",
          genre: "Fantasy",
          season_total_number: "4 seasons",
          season_digit: 4,
          description: "This collection of animated short stories spans several genres, including science fiction, fantasy, horror and comedy. World-class animation creators bring captivating stories to life in the form of a unique and visceral viewing experience. The animated anthology series includes tales that explore alternate histories, life for robots in a post-apocalyptic city and a plot for world domination by super-intelligent yogurt. Among the show's executive producers is Oscar-nominated director David Fincher.",
          background: "/images/lovedeathandrobots/covers/lovedeathandrobotsCover.jpg",
          videos: videoDataByShow["lovedeathandrobots"],
        }, 
        "demons": {
          type: "movie",  
          title: "Demons",
          release_year: "1971",
          genre: "Horror/Action",
          duration: "2h 15m",          
          description: "A ronin warrior seeks bloody revenge after he is bobbed by a geisha.",
          background: "/images/demons/covers/demonsCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "demons", "movie"),
        },   
        "blackmirror": {
          type: "show",  
          title: "Black Mirror",
          release_year: "2011",
          genre: "Fantasy",
          season_total_number: "7 seasons",
          season_digit: 7,
          description: "A series of stand-alone dramas -- sharp, suspenseful, satirical tales that explore techno-paranoia -- Black Mirror is a contemporary reworking of The Twilight Zone with stories that tap into the collective unease about the modern world, particularly regarding both intended and unintended consequences of new technologies and the effect they have on society and individuals.",
          background: "/images/blackmirror/covers/blackmirrorCover.jpg",
          videos: videoDataByShow["blackmirror"],
        },      
        "severance": {
          type: "show",  
          title: "Severance",
          release_year: "2022",
          genre: "Thriller",
          season_total_number: "2 seasons",
          season_digit: 2,
          description: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives; when a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.",
          background: "/images/severance/covers/severanceCover.jpg",
          subtitles: "yes",
          videos: videoDataByShow["severance"],
        },      
        "pluribus": {
          type: "show",  
          title: "Pluribus",
          release_year: "2025",
          genre: "Drama",
          season_total_number: "1 season",
          season_digit: 1,
          description: "In a world overtaken by a mysterious wave of forced happiness, Carol Sturka, one of the few immune, must uncover what's really going on - and save humanity from its own bliss.",
          background: "/images/pluribus/covers/pluribusCover.jpg",
          subtitles: "yes",
          videos: videoDataByShow["pluribus"],
        },  
        "akira": {
          type: "movie",  
          title: "Akira",
          release_year: "1988",
          genre: "Cyberpunk/Action",
          duration: "2h 4m",          
          description: "A secret military project endangers Neo-Tokyo when it turns a teenage biker gang member into a rampaging psychic psychopath who can only be stopped by his best friend.",
          background: "/images/akira/covers/akiraCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "akira", "movie"),
        }, 
        "exmachina": {
          type: "movie",  
          title: "Ex Machina",
          release_year: "2014",
          genre: "Thriller/Sci-Fi",
          duration: "1h 48m",          
          description: "A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence by evaluating the human qualities of a highly advanced humanoid A.I.",
          background: "/images/exmachina/covers/exmachinaCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "exmachina", "movie"),
        }, 
        "annihilation": {
          type: "movie",  
          title: "Annihilation",
          release_year: "2018",
          genre: "Psychological Horror",
          duration: "1h 55m",          
          description: "A biologist signs up for a dangerous, secret expedition in which the laws of nature don't apply.",
          background: "/images/annihilation/covers/annihilationCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "annihilation", "movie"),
        }, 
        "itsalwayssunny": {
          type: "show",  
          title: "It's Always Sunny In Philadelphia",
          release_year: "2005",
          genre: "Comedy",
          season_total_number: "16 seasons",
          season_digit: 16,
          description: "Five friends with big egos and small brains are the proprietors of an Irish pub in Philadelphia.",
          background: "/images/itsalwayssunny/covers/itsalwayssunnyCover.jpg",
          videos: videoDataByShow["itsalwayssunny"],
        },  
        "thetwilightzone": {
          type: "show",  
          title: "The Twilight Zone",
          release_year: "1959",
          genre: "Psychological Drama",
          season_total_number: "5 seasons",
          season_digit: 5,
          description: "Classic American Anthology series created by Rod Serling, featuring standalone stories of science fiction, fantasy, and horror, each with a twist ending or moral lesson.",
          background: "/images/thetwilightzone/covers/thetwilightzoneCover.svg",
          videos: videoDataByShow["thetwilightzone"],
        }, 
        "redline": {
          type: "movie",  
          title: "Redline",
          release_year: "2009",
          genre: "Action/Sci-Fi",
          duration: "1h 42m",          
          description: "A story about the most popular racing event in the galaxy, the Redline, and the various racers who compete in it.",
          background: "/images/redline/covers/redlineCover.jpg",
          subtitles: "yes",
          videos: generateSeasonVideos({}, "redline", "movie"),
        },  
        
      };
      const show = shows[showId];
      
      {/* AWS Signed Urls */}
      const API_BASE = import.meta.env.VITE_API_URL;
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


      {/* Search Functionality */}
      useEffect(() => {
        const params = new URLSearchParams(location.search);
        const seasonParam = params.get("season");
        const episodeParam = params.get("episode");
        const isMovie = params.get("movie") === "1";

        if (isMovie) {
          const currentlyPlaying = playingRef.current;
          if (currentlyPlaying?.showId === showId && currentlyPlaying?.type === "movie") {
            return;
          }
          const moviePathRaw =
            show?.videos?.path ||
            show?.videos?.movie?.path ||
            (Array.isArray(show?.videos) ? show.videos[0]?.path : null);
          if (!moviePathRaw) return;
          (async () => {
            let videoPath = moviePathRaw;

            if (awsHostedShows.includes(showId)) {
              const isCloudfrontUrl = videoPath.includes("cloudfront.net");
              const s3Key = isCloudfrontUrl
                ? videoPath.split("cloudfront.net/")[1]
                : extractS3KeyFromPath(videoPath);

              if (s3Key) {
                const signed = await fetchSignedUrl(s3Key);
                if (signed) videoPath = signed;
              }
            }
            setSelectedSeason(null);
            setSelectedVideo({ path: videoPath, showId, type: "movie", season: null, episode: null, });
            setExpanded(true);
            pushDesktopLastWatched({ showId, season: null, episode: null });

            playingRef.current = { showId, type: "movie" };
          })();
          return;
        }    

        if (!seasonParam || !episodeParam) return;
        const s = parseInt(seasonParam, 10);
        const e = parseInt(episodeParam, 10);
        if (!Number.isFinite(s) || !Number.isFinite(e)) return;
        const currentlyPlaying = playingRef.current;
        if (
          currentlyPlaying?.showId === showId &&
          currentlyPlaying?.season === s &&
          currentlyPlaying?.episode === e
        ) {
          return;
        }


        const episodeList = show?.videos?.[`season${s}`];
        const ep = episodeList?.[e - 1];
        if (!ep?.path) return;

        (async () => {
          let videoPath = ep.path;

          if (awsHostedShows.includes(showId)) {
            const isCloudfrontUrl = videoPath.includes("cloudfront.net");
            const s3Key = isCloudfrontUrl
              ? videoPath.split("cloudfront.net/")[1]
              : extractS3KeyFromPath(videoPath);

            if (s3Key) {
              const signed = await fetchSignedUrl(s3Key);
              if (signed) videoPath = signed;
            }
          }

          setSelectedSeason(s);
          setSelectedVideo({
            path: videoPath,
            showId,
            season: s,
            episode: e,
            skipIntro: true,
          });
          setExpanded(true);
        })();
      }, [location.search, showId, awsHostedShows, show?.videos]);



      {/* Color Storage */}
      useEffect(() => {
        const savedGradient = localStorage.getItem('userGradient');
        if (savedGradient) {
          document.documentElement.style.setProperty('--gradient-9', savedGradient);
        }
      }, []);
      


      {/* Placeholder load state */}
      const [loadedPlaceholders, setLoadedPlaceholders] = useState({});
      const handleImageLoad = (key) => {
        setLoadedPlaceholders(prev => ({ ...prev, [key]: true }));
      };


      {/* Progress Map States */}
      const [watchProgressMap, setWatchProgressMap] = useState({});


      {/* Continue Watching Button */}
      const handleResume = async () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`watchProgress-${showId}`)
        );
        if (keys.length === 0) {
          console.log("▶️ No saved progress for this show.");
          return;
        }

        const mostRecentKey = keys.sort((a, b) =>
          (parseFloat(localStorage.getItem(b)) || 0) - (parseFloat(localStorage.getItem(a)) || 0)
        )[0];

        const match = mostRecentKey.match(/watchProgress-(.+?)(-S(\d+)-E(\d+))?$/);
        if (!match) return;

        const [, matchedShowId, , seasonNumStr, episodeNumStr] = match;
        const isMovie = !seasonNumStr && !episodeNumStr;

        let videoPath = null;
        let season = null;
        let episode = null;

        if (isMovie) {
          videoPath = show?.videos?.[0]?.path || null;
        } else {
          season = parseInt(seasonNumStr);
          episode = parseInt(episodeNumStr);
          const episodeList = show?.videos?.[`season${season}`];
          if (!episodeList || !episodeList[episode - 1]) return;

          videoPath = episodeList[episode - 1].path;
        }

        if (!videoPath) {
          console.error("❌ No video path found for resume.");
          return;
        }

        if (awsHostedShows.includes(showId)) {
          const isCloudfrontUrl = videoPath.includes("cloudfront.net");
          const s3Key = isCloudfrontUrl
            ? videoPath.split("cloudfront.net/")[1]
            : extractS3KeyFromPath(videoPath);

          if (!s3Key) {
            console.error("❌ Could not extract s3Key from resume video path:", videoPath);
            return;
          }

          const signedUrl = await fetchSignedUrl(s3Key);
          if (!signedUrl) {
            console.error("❌ Signed URL fetch failed.");
            return;
          }

          videoPath = signedUrl;
        }

        setSelectedVideo({
          path: videoPath,
          showId: matchedShowId,
          season: season,
          episode: episode,
        });

        setExpanded(true);
        pushDesktopLastWatched({ showId: matchedShowId, season, episode });

        // ✅ Sync progress bar state for movies or shows
        let key;
        if (isMovie) {
          key = `${showId}`;
        } else {
          key = `${showId}-S${season}-E${episode}`;
        }

        const lastTime = parseFloat(localStorage.getItem(`watchProgress-${key}`)) || 0;
        setWatchProgressMap(prev => ({ ...prev, [key]: lastTime }));
      };




      {/* Continue Wacthing Modal */}
      const [resumeHovered, setResumeHovered] = useState(false);
      const [resumeEpisode, setResumeEpisode] = useState(null);
      const handleMouseEnterResume = () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`watchProgress-${showId}`)
        );
        if (keys.length === 0) return;
        const mostRecentKey = keys.sort((a, b) =>
          (localStorage.getItem(b) || 0) - (localStorage.getItem(a) || 0)
        )[0];
        const match = mostRecentKey.match(/watchProgress-(.+?)(-S(\d+)-E(\d+))?$/);
        if (!match) return;
        const [, matchedShowId, , seasonNumStr, episodeNumStr] = match;
        const isMovie = !seasonNumStr && !episodeNumStr;

        if (isMovie) {
          const video = show?.videos?.[0];
          if (!video) return;
          setResumeEpisode({
            season: null,
            episode: null,
            title: show?.title || matchedShowId,
            path: video.path,
          });
          setResumeHovered(true);
          return;
        }
        const seasonNum = parseInt(seasonNumStr);
        const episodeNum = parseInt(episodeNumStr);
        const episodeList = show?.videos?.[`season${seasonNum}`];
        if (!episodeList || !episodeList[episodeNum - 1]) return;
        const video = episodeList[episodeNum - 1];
        setResumeEpisode({
          season: seasonNum,
          episode: episodeNum,
          title: video.title,
          path: video.path,
        });
        setResumeHovered(true);
      };

      const handleMouseLeaveResume = () => {
        setResumeHovered(false);
      };


    {/* Subtitles */}
    const metaShowId = selectedVideo?.showId || showId;
    const seasons = show?.season_digit
      ? Array.from({ length: show.season_digit }, (_, i) => i + 1)
      : [];

  const playingRef = useRef(null);
  useEffect(() => {
    playingRef.current = selectedVideo;
  }, [selectedVideo]);

  {/* Last Watched Videoplayer Helper */}
  const pushDesktopLastWatched = ({ showId, season = null, episode = null }) => {
  const KEY = "lastWatched";
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}

  const entry = {
    showId,
    watchedAt: Date.now(),
    lastSeason: season,
    lastEpisode: episode,
  };

  // replace any prior entry for same show
  arr = arr.filter((x) => x?.showId !== showId);
  arr.unshift(entry);

  localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50)));
  };
  










  return (
    <div  style={{ background: "var(--gradient-9)" }} className='w-full h-dvh flex p-6 gap-4 justify-center items-center'>
        <div className='w-full max-w-[1400px] h-[92vh] px-14 pt-4 bg-black/20 backdrop-blur-md rounded-[20px] border border-white/10 shadow-[inset_0_0_0.5px_0.5px_rgba(255,255,255,0.2)] relative overflow-hidden'>
            {/* Overlapping Stack (relative container) */}
            <div className="relative w-full h-[65dvh] mb-12 overflow-hidden rounded-[20px]">
  
              {/* Background Image */}
              <div
                style={{
                  backgroundImage: `url(${show?.background})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
                className="absolute inset-0 z-0"
              />

              {/* Optional semi-transparent overlay (to make text easier to read) */}
              <div className="absolute inset-0 bg-black/20 z-10" />

              {/* Info Content */}
              <div className="relative z-20 flex flex-col justify-end h-full p-6">
                <span className="text-white font-semibold text-[28px] tracking-wider">
                  {show?.title}
                </span>
                <span className="text-[#d1d1d1] font-medium text-xs tracking-wide mb-4">
                  {show?.release_year} • {show?.genre} • {show?.type === "show" ? show?.season_total_number : show?.duration}
                </span>
                <span className="text-[#d1d1d1] font-medium text-sm tracking-wide">
                  {show?.description}
                </span>
              </div>

            </div>

              
            {createPortal(
            <AnimatePresence>
                {expanded && (
                <motion.div
                    key="expanding"
                    initial={{
                    scale: 0,
                    opacity: 0,
                    x: "-50%",
                    y: "-50%",
                    }}
                    animate={{
                    scale: 1,
                    opacity: 1,
                    x: "-50%",
                    y: "-50%",
                    }}
                    exit={{
                    scale: 0,
                    opacity: 0,
                    x: "-50%",
                    y: "-50%",
                    }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="fixed top-1/2 left-1/2 w-full h-full z-[100] rounded-none flex justify-start"
                    style={{ transform: "translate(-50%, -50%)" }}
                >
                <motion.button
                  onClick={() => {
                    setExpanded(false);
                    setSelectedVideo(null); 
                    navigate(`/video-library/${showId}`, { replace: true });
                    let key;
                    if (selectedVideo?.season !== null && selectedVideo?.episode !== null) {
                      key = `${selectedVideo.showId}-S${selectedVideo.season}-E${selectedVideo.episode}`;
                    } else {
                      key = `${selectedVideo.showId}`;
                    }
                    const lastTime = parseFloat(localStorage.getItem(`watchProgress-${key}`)) || 0;
                    setWatchProgressMap(prev => ({ ...prev, [key]: lastTime }));                    
                  }}
                  whileHover={{
                    backgroundColor:"color-mix(in oklab, var(--color-black) 50%, transparent)",
                    transition: { duration: 0.3, ease: "easeInOut" },
                  }}
                  className="absolute text-white text-3xl font-bold bg-black/30 rounded-full size-8 flex items-center justify-center m-12 cursor-pointer z-[9999]"
                >
                  {closeIcon}
                </motion.button>

                <div className="flex-1 w-full p-8">
                  {selectedVideo && (
                    <Show
                    src={selectedVideo.path}
                    delayPlay={2000}
                    showId={selectedVideo.showId}
                    season={selectedVideo.season}
                    episode={selectedVideo.episode}
                    skipIntro={selectedVideo.skipIntro}
                    episodeTitles={allEpisodeTitles[showId] || allEpisodeTitles[cleanShowId(showId)]}
                    onSkipToNext={handleSkipToNext}
                    getSignedUrl={fetchSignedUrl}
                    hasSubtitles={shows[metaShowId]?.subtitles === "yes"}
                    
                    />
                  )}
                </div>
                    
                </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}  
        </div>

      
      <div className="fixed w-full h-full">      
          <Menu />
          {/* Season Content (below stack) */}
          <div ref={dropdownRef} className="absolute bottom-34 2xl:bottom-50 left-10 2xl:left-64 w-fit flex flex-row mb-4 text-white z-[10]">
            <button 
              className="flex items-center gap-2 text-xl font-semibold cursor-pointer"
              onClick={() => {
                if (show?.season_digit > 1) {
                  setSeasonDropdownOpen(!seasonDropdownOpen);
                }
              }}
            >
              {layersIcon}
              <span>{show?.type === "movie" ? "Movie" : `Season ${selectedSeason}`}</span>
              {show?.type !== "movie" && show?.season_digit > 1 && <Chevron isOpen={seasonDropdownOpen} />}         
            </button>

            <div className="relative flex items-center justify-end gap-4 ml-2">
              <button
                onClick={handleResume}
                onMouseEnter={handleMouseEnterResume}
                onMouseLeave={handleMouseLeaveResume}
                className="text-white font-medium bg-white/10 hover:bg-white/20 px-3 py-1 text-sm rounded-md transition cursor-pointer"
              >
                Continue watching 
              </button>

              {/* Modal */}
              <AnimatePresence>
                {resumeHovered && resumeEpisode && (
                  (() => {
                    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
                    const cleanedId = cleanShowId(showId);
                    const sNum = String(resumeEpisode.season);
                    const eNum = String(resumeEpisode.episode);

                    const placeholderPath = show?.type === "show"
                      ? `${cloudFrontDomain}/${cleanedId}/placeholders/season${resumeEpisode.season}/S${sNum}E${eNum}_${cleanedId}_placeholder.png`
                      : `/images/${cleanedId}/placeholders/${cleanedId}_placeholder.png`;

                    console.log("🖼️ Resume placeholder path:", placeholderPath);

                    return (
                      <motion.div
                        key="resume-tooltip"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-[120%] left-0 w-64 bg-black text-white p-2 rounded-md shadow-lg z-50 pointer-events-none"
                      >
                        <img src={placeholderPath} alt="" className="hidden" />
                        <div className="relative w-full h-32 rounded mb-2 bg-cover bg-center" style={{ backgroundImage: `url(${placeholderPath})` }}>                        
                          <img src={placeholderPath} alt="" className="hidden" />                 
                          <WatchProgressBar
                            storageKey={
                              resumeEpisode.season !== null && resumeEpisode.episode !== null
                                ? `${showId}-S${resumeEpisode.season}-E${resumeEpisode.episode}`
                                : `${showId}`
                            }
                            progressOverride={
                              resumeEpisode.season !== null && resumeEpisode.episode !== null
                                ? watchProgressMap[`${showId}-S${resumeEpisode.season}-E${resumeEpisode.episode}`]
                                : watchProgressMap[`${showId}`]
                            }
                          />
                        </div>
                        <div className="text-sm font-semibold tracking-wide">
                          {resumeEpisode.season !== null && resumeEpisode.episode !== null
                            ? `S${resumeEpisode.season}E${resumeEpisode.episode} — ${resumeEpisode.title.replace(/_/g, " ")}`
                            : resumeEpisode.title.replace(/_/g, " ")}
                        </div>
                      </motion.div>
                    );
                  })()
                )}
              </AnimatePresence>
            </div>               

            {/* Season Dropdown */}
            <AnimatePresence>
              {seasonDropdownOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={dropdownVariants}
                  className="
                    absolute bottom-0 left-full
                    ml-4 mt-1
                    bg-black/80 text-[#5c5c5c]
                    rounded-md shadow-md backdrop-blur
                    px-4 py-3
                  "
                >
                  {/* Inner grid that actually lays out the buttons */}
                  <div
                    className={`
                      grid ${show?.season_digit > 8 ? "grid-cols-2" : "grid-cols-1"}
                      gap-x-6 gap-y-4
                      w-max
                    `}
                  >
                    {Array.from({ length: show?.season_digit }, (_, i) => i + 1).map((season) => (
                      <motion.button
                        key={season}
                        whileHover={{ color: "rgba(255, 255, 255, 0.6)" }}
                        variants={itemVariants}
                        onClick={() => {
                          setSelectedSeason(season);
                          setSeasonDropdownOpen(false);
                        }}
                        className={`
                          text-left text-sm px-2 py-1 cursor-pointer whitespace-nowrap
                          ${season === selectedSeason ? "text-white font-bold" : ""}
                        `}
                      >
                        Season {season}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Cards for each video */}
          <AnimatePresence mode="wait">
          <motion.div 
            key={selectedSeason}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}      
            className="flex flex-row h-full pb-6 2xl:pb-20 px-4 items-end gap-6 snap-x overflow-x-auto scrollbar-hidden z-[8]"
          >
            
          {/* Movies */}  
          {show?.type === "movie" && (
            <motion.div 
              whileHover={{
                scale: 1.05,
                boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                transition: { duration: 0.3, ease: "easeInOut" }
              }}
              onClick={async () => {
              let videoPath = show?.videos[0];
              let rawPath = typeof videoPath === "string" ? videoPath : videoPath?.path;

              if (awsHostedShows.includes(showId)) {
                const isCloudfrontUrl = rawPath?.includes("cloudfront.net");
                const s3Key = isCloudfrontUrl
                  ? rawPath.split("cloudfront.net/")[1]
                  : extractS3KeyFromPath(rawPath);

                if (!s3Key) {
                  console.error("❌ Could not extract s3Key from movie video path:", rawPath);
                  return;
                }

                const signedUrl = await fetchSignedUrl(s3Key);
                videoPath = signedUrl;
              } else {
                videoPath = rawPath;
              }
                setSelectedVideo({
                  path: videoPath,
                  showId,
                  season: null,
                  episode: null,
                });
                setExpanded(true);
                const key = `${showId}`;
                const lastTime = parseFloat(localStorage.getItem(`watchProgress-${key}`)) || 0;
                pushDesktopLastWatched({ showId, season: null, episode: null });
                setWatchProgressMap(prev => ({ ...prev, [key]: lastTime }));                
              }}
              style={{ 
                backgroundImage: `url(/images/${cleanShowId(showId)}/placeholders/${cleanShowId(showId)}_placeholder.png)`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              className="relative override-left-8 lg:left-60 w-56 h-28 group rounded-2xl cursor-pointer flex-shrink-0 snap-center"
            >
              <div 
                className="absolute bottom-0 w-full text-white font-bold tracking-wide text-sm p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
                  borderBottomLeftRadius: '1rem',
                  borderBottomRightRadius: '1rem',
                }}
              >
                {show?.title}
              </div>

              <WatchProgressBar
                storageKey={`${showId}`}
                progressOverride={watchProgressMap[`${showId}`]}
              />     

            </motion.div>
          )}

          {(show?.videos?.[`season${selectedSeason}`] || []).map((videoUrl, index) => {

            const rawSeason = videoUrl.season; 
            const cleanedSeason = `S${parseInt(rawSeason.slice(1), 10)}`; 
            const seasonNumber = parseInt(rawSeason.slice(1), 10);       

            const episodeNumber = index + 1;
            const cleanShowId = showId.replace(/-/g, ''); 

            const filename = videoUrl.path.split("/").pop();  
            const baseName = filename.replace(".mp4", "");
            const parts = baseName.split("_");
        
            const rawTitleParts = parts.slice(2); 
            const episodeTitle = rawTitleParts
              .join(" ")
              .replace(/\b\w/g, c => c.toUpperCase()); 

              const episodeName = `${episodeNumber}: ${episodeTitle}`;
              const cleanedEpisodeName = `${episodeNumber}. ${episodeTitle}`;
              
              console.log("🎬 Clean Show ID:", cleanShowId, "| Raw Show ID:", showId);

            const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";

            const placeholderPath = show?.type === "show"
            ? `${cloudFrontDomain}/${cleanShowId}/placeholders/season${seasonNumber}/${cleanedSeason}E${episodeNumber}_${cleanShowId}_placeholder.png`
            : `/images/${cleanShowId}/placeholders/${cleanShowId}_placeholder.png`;
            
            const placeholderKey = `${showId}-${seasonNumber}-${episodeNumber}`;

                return (
                  //Shows
                  <motion.div 
                    key={index}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                      transition: { duration: 0.3, ease: "easeInOut" }
                    }}
                    whileTap={{
                        scale: 0.95,
                        transition: {
                        type: 'spring',
                        stiffness: 200,
                        damping: 10,
                        },
                    }}                    
                    onClick={async () => {
                      let videoPath = videoUrl.path;

                      if (awsHostedShows.includes(showId)) {
                        const isCloudfrontUrl = videoUrl.path.includes("cloudfront.net");
                        const s3Key = isCloudfrontUrl
                          ? videoUrl.path.split("cloudfront.net/")[1]
                          : extractS3KeyFromPath(videoUrl.path);

                        if (!s3Key) {
                          console.error("❌ Could not extract s3Key:", videoUrl.path);
                          return;
                        }

                        videoPath = await fetchSignedUrl(s3Key);
                        console.log("✅ Signed CloudFront URL:", videoPath);
                      }

                      setSelectedVideo({
                        path: videoPath,
                        showId,
                        season: seasonNumber,
                        episode: episodeNumber,
                      });
                      setExpanded(true);
                      pushDesktopLastWatched({ showId, season: seasonNumber, episode: episodeNumber });
                    }}
                    
                    style={{ 
                      backgroundImage: `url(${placeholderPath})`, 
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                    className={`relative w-56 h-28 rounded-2xl cursor-pointer group flex-shrink-0 snap-center 
                      ${!loadedPlaceholders[placeholderKey] ? "animate-pulse bg-gray-800/60" : ""}`}
                    >
                    <img 
                      src={placeholderPath} 
                      alt="" 
                      className="hidden" 
                      onLoad={() => handleImageLoad(placeholderKey)} 
                    />
                    {/* TEXT OVERLAY */}
                    <div 
                      className="absolute bottom-0 w-full text-white font-bold tracking-wide text-sm p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
                        borderBottomLeftRadius: '1rem',
                        borderBottomRightRadius: '1rem',
                      }}
                    >
                      {cleanedEpisodeName}
                    </div>

                    <WatchProgressBar
                      storageKey={`${showId}-S${seasonNumber}-E${episodeNumber}`}
                      progressOverride={watchProgressMap[`${showId}-S${seasonNumber}-E${episodeNumber}`]}
                    />
                  </motion.div>   
                );
          })}
            </motion.div> 
            </AnimatePresence>
        </div> 

    </div>
  )
}

export default Library