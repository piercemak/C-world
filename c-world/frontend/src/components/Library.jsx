import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from 'react-router-dom';
import Show from './Show.jsx'
import Chevron from './Chevron.jsx'
import Menu from './framercomponents/Menu.jsx'
import WatchProgressBar from "./WatchProgressBar.jsx";




const Library = () => {

    
    const { showId } = useParams();
    console.log(showId);

    const [expanded, setExpanded] = useState(false);
    const cleanShowId = (id) => id.replace(/-/g, "");


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
    const handleSkipToNext = async (currentSeason, currentEpisode, signedUrl = null) => {
      const isAwsHosted = awsHostedShows.includes(showId);
      const episodes = show?.videos?.[`season${currentSeason}`] || [];
      const nextIndex = currentEpisode; // assuming currentEpisode is 1-based

      console.log("🔁 Attempting skip:", { currentSeason, currentEpisode, nextIndex });

      // Grab the actual video object
      const nextEpisodeData = episodes[nextIndex];
      if (nextEpisodeData) {
        const videoPath = signedUrl || nextEpisodeData.path;

        setSelectedVideo({
          path: videoPath,
          showId,
          season: currentSeason,
          episode: currentEpisode + 1,
          skipIntro: true,
        });
        return;
      }

      // End of season case
      const nextSeason = currentSeason + 1;
      const nextSeasonEpisodes = show?.videos?.[`season${nextSeason}`] || [];
      const firstEpisode = nextSeasonEpisodes[0];

      if (firstEpisode) {
        const videoPath = signedUrl || firstEpisode.path;

        setSelectedVideo({
          path: videoPath,
          showId,
          season: nextSeason,
          episode: 1,
          skipIntro: true,
        });
      } else {
        console.log("🛑 End of show or missing next season");
        setExpanded(false);
        setSelectedVideo(null);
      }
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


    {/* Episode Title Lists */}
    const episodeTitles_stevenuniverse = {
      1: [
        "Gem_Glow",
        "Laser_Light_Cannon",
        "Cheeseburger_Backpack",
        "Together_Breakfast",
        "Frybo",
        "Cat_Fingers",
        "Bubble_Buddies",
        "Serious_Steven",
        "Tiger_Millionaire",
        "Stevens_Lion",
        "Arcade_Mania",
        "Giant_Woman",
        "So_Many_Birthdays",
        "Lars_and_the_Cool_Kids",
        "Onion_Trade",
        "Steven_the_Sword_Fighter",
        "Lion_2_The_Movie",
        "Beach_Party",
        "Roses_Room",
        "Coach_Steven",
        "Joking_Victim",
        "Steven_and_the_Stevens",
        "Monster_Buddies",
        "An_Indirect_Kiss",
        "Mirror_Gem",
        "Ocean_Gem",
        "House_Guest",
        "Space_Race",
        "Secret_Team",
        "Island_Adventure",
        "Keep_Beach_City_Weird",
        "Fusion_Cuisine",
        "Garnet's_Universe",
        "Watermelon_Steven",
        "Lion_3_Straight_to_Video",
        "Warp_Tour",
        "Alone_Together",
        "The_Test",
        "Future_Vision",
        "On_the_Run",
        "Horror_Club",
        "Winter_Forecast",
        "Maximum_Capacity",
        "Marble_Madness",
        "Rose's_Scabbard",
        "The_Message",
        "Political_Power",
        "The_Return",
        "Jail_Break",
      ],
      
       2: [
        "Full_Disclosure",
        "Open_Book",
        "Joy_Ride",
        "Say_Uncle",
        "Story_For_Steven",
        "Shirt_Club",
        "Love_Letters",
        "Reformed",
        "Sworn_to_the_Sword",
        "Rising_Tides_Crashing_Skies",
        "Keeping_It_Together",
        "We_Need_to_Talk",
        "Chille_Tid",
        "Cry_for_Help",
        "Keystone_Motel",
        "Onion_Friend",
        "Historical_Friction",
        "Friend_Ship",
        "Nightmare_Hospital",
        "Sadie's_Song",
        "Catch_and_Release",
        "When_It_Rains",
        "Back_to_the_Barn",
        "Too_Far",
        "The_Answer",
        "Steven's_Birthday",
        "It_Could've_Been_Great",
        "Message_Received",
        "Log_Date_7_15_2"
      ],

      3: [
        "Super_Watermelon_Island",
        "Gem_Drill",
        "Same_Old_World",
        "Barn_Mates",
        "Hit_the_Diamond",
        "Steven_Floats",
        "Drop_Beat_Dad",
        "Mr._Greg",
        "Too_Short_to_Ride",
        "The_New_Lars",
        "Beach_City_Drift",
        "Restaurant_Wars",
        "Kiki's_Pizza_Delivery_Service",
        "Monster_Reunion",
        "Alone_at_Sea",
        "Greg_the_Babysitter",
        "Gem_Hunt",
        "Crack_the_Whip",
        "Steven_vs._Amethyst",
        "Bismuth",
        "Beta",
        "Earthlings",
        "Back_to_the_Moon",
        "Bubbled"
      ],

      4: [
        "The_Kindergarten_Kid",
        "Know_Your_Fusion",
        "Buddy's_Book",
        "Mindful_Education",
        "Future_Boy_Zoltron",
        "Last_One_Out_of_Beach_City",
        "Onion_Gang",
        "Gem_Harvest",
        "Three_Gems_and_a_Baby",
        "Steven's_Dream",
        "Adventures_in_Light_Distortion",
        "Gem_Heist",
        "The_Zoo",
        "That_Will_Be_All",
        "The_New_Crystal_Gems",
        "Storm_in_the_Room",
        "Rocknaldo",
        "Tiger_Philanthropist",
        "Room_for_Ruby",
        "Lion_4_Alternate_Ending",
        "Doug_Out",
        "The_Good_Lars",
        "Are_You_My_Dad?",
        "I_Am_My_Mom"
      ],

      5: [
        "Stuck_Together",
        "The_Trial",
        "Off_Colors",
        "Lars_Head",
        "Dewey_Wins",
        "Gemcation",
        "Raising_the_Barn",
        "Back_to_the_Kindergarten",
        "Sadie_Killer",
        "Kevin_Party",
        "Lars_of_the_Stars",
        "Jungle_Moon",
        "Your_Mother_and_Mine",
        "The_Big_Show",
        "Pool_Hopping",
        "Letters_to_Lars",
        "Cant_Go_Back",
        "A_Single_Pale_Rose",
        "Now_Were_Only_Falling_Apart",
        "Whats_Your_Problem",
        "The_Question",
        "Made_of_Honor",
        "Reunited",
        "Legs_From_Here_to_Homeworld",
        "Familiar",
        "Together_Alone",
        "Escapism",
        "Change_Your_Mind"
      ]
    };


    const episodeTitles_overthegardenwall = {
      1: [
        "The_Old_Grist_Mill",
        "Hard_Times_at_the_Huskin_Bee",
        "Schooltown_Follies",
        "Songs_of_the_Dark_Lantern",
        "Mad_Love",
        "Lullaby_in_Frogland",
        "The_Ringing_of_the_Bell",
        "Babes_in_the_Woods",
        "Into_the_Unknown",
        "The_Unknown",
      ]
    }

    const episodeTitles_adventuretime = {
      1: [
        "Slumber_Party_Panic",
        "Trouble_in_Lumpy_Space",
        "Prisoners_of_Love",
        "Tree_Trunks",
        "The_Enchiridion!",
        "The_Jiggler",
        "Ricardio_the_Heart_Guy",
        "Business_Time",
        "My_Two_Favorite_People",
        "Memories_of_Boom_Boom_Mountain",
        "Wizard",
        "Evicted",
        "City_of_Thieves",
        "The_Witch's_Garden",
        "What_is_Life",
        "Ocean_of_Fear",
        "When_Wedding_Bells_Thaw",
        "Dungeon",
        "The_Duke",
        "Freak_City",
        "Donny",
        "Henchman",
        "Rainy_Day_Daydream",
        "Whah_Have_You_Done",
        "His_Hero",
        "Gut_Grinder",
      ],

      2: [
        "It_Came_from_the_Nightosphere",
        "The_Eyes",
        "Loyalty_to_the_King",
        "Blood_Under_the_Skin",
        "Storytelling",
        "Slow_Love",
        "Power_Animal",
        "Crystals_Have_Power",
        "The_Other_Tarts",
        "To_Cut_a_Womans_Hair",
        "The_Chamber_of_Frozen_Blades",
        "Her_Parents",
        "The_Pods",
        "The_Silent_King",
        "The_Real_You",
        "Guardians_of_Sunshine",
        "Death_in_Bloom",
        "Susan_Strong",
        "Mystery_Train",
        "Go_With_Me",
        "Belly_of_the_Beast",
        "The_Limit",
        "Video_Makers",
        "Mortal_Folly",
        "Mortal_Recoil",
        "Heat_Signature",
      ],

      3: [
        "Conquest_of_Cuteness",
        "Morituri_te_Salutamus",
        "Memory_of_a_Memory",
        "Hitman",
        "Too_Young",
        "The_Monster",
        "Still",
        "Wizard_Battle",
        "Fionna_and_Cake",
        "What_Was_Missing",
        "Apple_Thief",
        "The_Creeps",
        "From_Bad_to_Worse",
        "Beautopia",
        "No_One_Can_Hear_You",
        "Jake_vs_Me_Mow",
        "Thank_You",
        "The_New_Frontier",
        "Holly_Jolly_Secrets",
        "Holly_Jolly_Secrets_2",
        "Marcelines_Closet",
        "Paper_Pete",
        "Another_Way",
        "Ghost_Princess",
        "Dads_Dungeon",
        "Incendium",
      ],

      4: [
        "Hot_to_the_Touch",
        "Five_Short_Graybles",
        "Web_Weirdos",
        "Dream_of_Love",
        "Return_to_the_Nightosphere",
        "Daddys_Little_Monster",
        "In_Your_Footsteps",
        "Hug_Wolf",
        "Princess_Monster_Wife",
        "Goliad",
        "Beyond_This_Earthly_Realm",
        "Gotcha",
        "Princess_Cookie",
        "Card_Wars",
        "Sons_of_Mars",
        "Burning_Low",
        "BMO_Noire",
        "King_Worm",
        "Lady_Peebles",
        "You_Made_Me",
        "Who_Would_Win",
        "Ignition_Point",
        "The_Hard_Easy",
        "Reign_of_Gunters",
        "I_Remember_You",
        "The_Lich",
      ],

      5: [
        "Finn_the_Human",
        "Jake_the_Dog",
        "Five_More_Short_Graybles",
        "Up_a_Tree",
        "All_the_Little_People",
        "Jake_the_Dad",
        "Davey",
        "Mystery_Dungeon",
        "All_Your_Fault",
        "Little_Dude",
        "Bad_Little_Boy",
        "Vault_of_Bones",
        "The_Great_Bird_Man",
        "Simon_&_Marcy",
        "A_Glitch_Is_a_Glitch",
        "Puhoy",
        "BMO_Lost",
        "Princess_Potluck",
        "James_Baxter_the_Horse",
        "Shh",
        "The_Suitor",
        "The_Partys_Over_Isla_de_Senorita",
        "One_Last_Job",
        "Another_Five_More_Short_Graybles",
        "Candy_Streets",
        "Wizards_Only_Fools",
        "Jake_Suit",
        "Be_More",
        "Sky_Witch",
        "Frost_&_Fire",
        "Too_Old",
        "Earth_&_Water",
        "Time_Sandwich",
        "The_Vault",
        "Love_Games",
        "Dungeon_Train",
        "The_Box_Prince",
        "Red_Starved",
        "We_Fixed_a_Truck",
        "Play_Date",
        "The_Pit",
        "James",
        "Root_Beer_Guy",
        "Apple_Wedding",
        "Blade_of_Grass",
        "Rattleballs",
        "The_Red_Throne",
        "Betty",
        "Bad_Timing",
        "Lemonhope_part_1",
        "Lemonhope_part_2",
        "Billys_Bucket_List",
      ],

      6: [
        "Wake_Up",
        "Escape_From_the_Citadel",
        "James_II",
        "The_Tower",
        "Sad_Face",
        "Breezy",
        "Food_Chain",
        "Furniture_&_Meat",
        "The_Prince_Who_Wanted_Everything",
        "Something_Big",
        "Little_Brother",
        "Ocarina",
        "Thanks_for_the_Crabapples_Giuseppe",
        "Princess_Day",
        "Nemesis",
        "Joshua_&_Margaret_Investigations",
        "Ghost_Fly",
        "Everythings_Jake",
        "Is_That_You",
        "Jake_the_Brick",
        "Dentist",
        "The_Cooler",
        "The_Pajama_War",
        "Evergreen",
        "Astral_Plane",
        "Gold_Stars",
        "The_Visitor",
        "The_Mountain",
        "Dark_Purple",
        "The_Diary",
        "Walnuts_and_Rain",
        "Friends_Forever",
        "Jermaine",
        "Chips_and_Ice_Cream",
        "Graybles_1000_Plus",
        "Hoots",
        "Water_Park_Prank",
        "You_Forgot_Your_Floaties",
        "Be_Sweet",
        "Orgalorg",
        "On_the_Lam",
        "Hot_Diggity_Doom",
        "The_Comet",
      ],

      7: [
        "Bonnie_and_Neddy",
        "Varmints",
        "Cherry_Cream_Soda",
        "Mama_Said",
        "Football",
        "Marceline_the_Vampire_Queen",
        "Everything_Stays",
        "Vamps_About",
        "The_Empress_Eyes",
        "May_I_Come_In",
        "Take_Her_Back",
        "Checkmate",
        "The_Dark_Cloud",
        "The_More_You_Moe_The_More_You_Know",
        "Summer_Showers",
        "Angel_Face",
        "President_Porpoise_is_Missing",
        "Blank_Eyed_Girl",
        "Bad_Jubies",
        "Kings_Ransom",
        "Scamps",
        "Crossover",
        "The_Hall_of_Egress",
        "Flute_Spell",
        "The_Thin_Yellow_Line",
      ],

      8: [
        "Broke_His_Crown",
        "Dont_Look",
        "Beyond_the_Grotto",
        "Lady_Rainicorn_of_the_Crystal_Dimension",
        "I_Am_a_Sword",
        "Bun_Bun",
        "Normal_Man",
        "Elemental",
        "Five_Short_Tables",
        "The_Music_Hole",
        "Daddy_Daughter_Card_Wars",
        "Preboot",
        "Reboot",
        "Two_Swords",
        "Do_No_Harm",
        "Wheels",
        "High_Strangeness",
        "Horse_and_Ball",
        "Jelly_Beans_Have_Power",
        "The_Invitation",
        "Whipple_the_Happy_Dragon",
        "Mysterious_Island",
        "Imaginary_Resources",
        "Hide_and_Seek",
        "Min_&_Marty",
        "Helpers",
        "The_Light_Cloud",
      ],

      9: [
        "Orb",
        "Skyhooks",
        "Bespoken_For",
        "Winter_Light",
        "Cloudy",
        "Slime_Central",
        "Happy_Warrior",
        "Hero_Heart",
        "Skyhooks_II",
        "Abstract",
        "Ketchup",
        "Fionna_and_Cake_and_Fionna",
        "Whispers",
        "Three_Buckets",
      ],

      10: [
        "The_Wild_Hunt",
        "Always_BMO_Closing",
        "Son_of_Rap_Bear",
        "Bonnibel_Bubblegum",
        "Seventeen",
        "Ring_of_Fire",
        "Marcy_&_Hunson",
        "The_First_Investigation",
        "Blenanas",
        "Jake_the_Starchild",
        "Temple_of_Mars",
        "Gumbaldia",
        "Come_Along_With_Me"
      ]
    }

    const allEpisodeTitles = {
      "steven-universe": episodeTitles_stevenuniverse,
      "over-the-garden-wall": episodeTitles_overthegardenwall,
      "adventure-time": episodeTitles_adventuretime,
    };
    
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

        "perfect-blue": {
          type: "movie",  
          title: "Perfect Blue",
          release_year: "1997",
          genre: "Horror/Mystery",
          duration: "1h 21m",
          description: "A young Japanese singer is encouraged by her agent to quit singing and pursue an acting career, beginning with a role in a murder mystery TV show.",
          background: "/images/perfectblue/covers/perfectblueCover.jpg",
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
      const handleResume = () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`watchProgress-${showId}`)
        );
        if (keys.length === 0) {
          console.log("▶️ No saved progress for this show.");
          return;
        }
        const mostRecentKey = keys.sort((a, b) =>
          (localStorage.getItem(b) || 0) - (localStorage.getItem(a) || 0)
        )[0];
        const match = mostRecentKey.match(/watchProgress-(.+)-S(\d+)-E(\d+)/);
        if (!match) return;

        const [, matchedShowId, seasonNumStr, episodeNumStr] = match;
        const seasonNum = parseInt(seasonNumStr);
        const episodeNum = parseInt(episodeNumStr);
        const episodeList = show?.videos?.[`season${seasonNum}`];
        if (!episodeList || !episodeList[episodeNum - 1]) return;
        const videoPath = episodeList[episodeNum - 1].path;
        setSelectedVideo({
          path: videoPath,
          showId: matchedShowId,
          season: seasonNum,
          episode: episodeNum,
        });
        setExpanded(true);
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
        const match = mostRecentKey.match(/watchProgress-(.+)-S(\d+)-E(\d+)/);
        if (!match) return;

        const [, matchedShowId, seasonNumStr, episodeNumStr] = match;
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





  return (
    <div className='w-full h-dvh flex p-6 gap-4 justify-center items-center'>
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
                    const key = `${selectedVideo.showId}-S${selectedVideo.season}-E${selectedVideo.episode}`;
                    const lastTime = parseFloat(localStorage.getItem(`watchProgress-${key}`)) || 0;
                    setWatchProgressMap(prev => ({ ...prev, [key]: lastTime }));                    
                  }}
                  whileHover={{
                    backgroundColor:"color-mix(in oklab, var(--color-black) 50%, transparent)",
                    transition: { duration: 0.3, ease: "easeInOut" },
                  }}
                  className="absolute text-white text-3xl font-bold bg-black/30 rounded-full size-8 flex items-center justify-center m-12 cursor-pointer z-[7]"
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

            <div className="relative flex items-center justify-end gap-4">
              <button
                onClick={handleResume}
                onMouseEnter={handleMouseEnterResume}
                onMouseLeave={handleMouseLeaveResume}
                className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 text-sm rounded-md transition cursor-pointer"
              >
                Continue watching 
              </button>

              {/* Tooltip Modal */}
              <AnimatePresence>
                {resumeHovered && resumeEpisode && (
                  (() => {
                    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
                    const cleanedId = cleanShowId(showId);
                    const sNum = String(resumeEpisode.season).padStart(2, "0");
                    const eNum = String(resumeEpisode.episode).padStart(2, "0");

                    const placeholderPath = show?.type === "show"
                      ? `${cloudFrontDomain}/${cleanedId}/placeholders/season${resumeEpisode.season}/S${sNum}E${eNum}_${cleanedId}_placeholder.png`
                      : `/images/${cleanedId}/placeholders/${cleanedId}_placeholder.png`;

                    return (
                      <motion.div
                        key="resume-tooltip"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-[120%] left-0 w-64 bg-black text-white p-2 rounded-md shadow-lg z-50 pointer-events-none"
                      >
                        <div
                          className="w-full h-32 rounded mb-2 bg-cover bg-center"
                          style={{ backgroundImage: `url(${placeholderPath})` }}
                        />
                        <div className="text-sm font-semibold tracking-wide">
                          S{resumeEpisode.season}E{resumeEpisode.episode} —{" "}
                          {resumeEpisode.title.replace(/_/g, " ")}
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
                  className="absolute bottom-0 2xl:bottom-[-200] text-nowrap left-full ml-4 mt-1 text-[#5c5c5c] bg-black/80 rounded-md shadow-md backdrop-blur px-4 py-2"
                >
                  {Array.from({ length: show?.season_digit }, (_, i) => i + 1).map(season => (
                    <motion.button
                      key={season}
                      whileHover={{ color: "rgba(255, 255, 255, 0.6)" }}
                      variants={itemVariants}
                      onClick={() => {
                        setSelectedSeason(season);
                        setSeasonDropdownOpen(false);
                      }}
                      className={`block text-left text-sm py-4 w-full cursor-pointer ${
                        season === selectedSeason ? "text-white font-bold" : ""
                      }`}
                    >
                      Season {season}
                    </motion.button>
                  ))}
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
              }}
              style={{ 
                backgroundImage: `url(/images/${cleanShowId(showId)}/placeholders/${cleanShowId(showId)}_placeholder.png)`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              className="relative md:left-8 lg:left-60 w-56 h-28 rounded-2xl cursor-pointer flex-shrink-0 snap-center"
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