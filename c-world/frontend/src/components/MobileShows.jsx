import React, { useState, useRef, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import Chevron from './Chevron.jsx'

const MobileShows = () => {

  const hdIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M10.53 5.968h-.843v4.06h.843c1.117 0 1.622-.667 1.622-2.02 0-1.354-.51-2.04-1.622-2.04"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm5.396 3.001V11H6.209V8.43H3.687V11H2.5V5.001h1.187v2.44h2.522V5h1.187zM8.5 11V5.001h2.188c1.824 0 2.685 1.09 2.685 2.984C13.373 9.893 12.5 11 10.69 11z"/></svg>
  const starIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
  const layersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-layers-fill" viewBox="0 0 16 16"><path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/><path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/></svg>
  const libraryIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>


  const { showId } = useParams();
  const cleanShowId = (id) => id.replace(/-/g, "");
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);

  const navigate = useNavigate();
    const handleNavigate = () => {
     navigate("/video-library");
  };


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
        "Garnets_Universe",
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
      };
      const show = shows[showId];
      console.log({ cleanShowId: cleanShowId(showId) });


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
    const [subtitleText, setSubtitleText] = useState("");
    useEffect(() => {
    const vid = document.querySelector("video");
    if (!vid) return;

    const track = vid.textTracks[0];
    if (!track) return;

    track.mode = "hidden";

    const handleCueChange = () => {
        const activeCues = track.activeCues;
        if (activeCues.length > 0) {
        setSubtitleText(activeCues[0].text);
        } else {
        setSubtitleText("");
        }
    };

    track.addEventListener("cuechange", handleCueChange);
    return () => track.removeEventListener("cuechange", handleCueChange);
    }, [selectedVideo]);



  return (
    <div className='flex w-full h-dvh relative flex-col bg-black'>
        <div className='h-[50%] w-full flex z-0 overflow-hidden'>
            <img
                src={show?.mobilebackground}
                className="w-full h-full object-cover"
                alt="Background"
            />
        </div>

        <motion.div
            whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)" }} 
            transition={{
                type: "spring",
                stiffness: 600,
                damping: 20    
            }}     
            onClick={handleNavigate}
            className="size-10 z-90 fixed m-2 text-white bg-slate-700 flex items-center justify-center rounded-full shadow-md"
        >
            {libraryIcon}
        </motion.div>

        {videoPlayerVisible && selectedVideo && (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 z-[100] flex items-center justify-center">
                <video 
                    src={selectedVideo.path} 
                    controls 
                    autoPlay 
                    className="w-[90%] h-[80%] rounded-lg shadow-lg"
                >

                {showId === "perfect-blue" && (
                <track
                    src={`/videos/perfectblue/perfectblue.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}

                {showId === "paprika" && (
                <track
                    src={`/videos/paprika/paprikaSub.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}
                {subtitleText && (
                <div className="absolute bottom-24 w-full text-center">
                    <div className="text-white text-[20px] font-semibold drop-shadow-md">
                    {subtitleText}
                    </div>
                </div>
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

        {show?.type === "movie" && (
        <div className="absolute w-full justify-center bottom-4 flex z-50 text-white/60 font-medium text-[13px] text-wrap whitespace-normal break-words text-center px-4 fade-text pointer-events-none">
            <span>{show?.description}</span>
        </div>
        )} 

        <div className='absolute bottom-0 flex w-full h-[60%] rounded-t-4xl z-10'>
            <div className='absolute bottom-0 flex flex-col w-full h-full px-6 pt-10 rounded-t-4xl bg-slate-700 inset-shadow-sm inset-shadow-white/20 z-20'>
                <span className='text-white font-bold text-2xl'> {show?.title} </span> 
                <span className='text-sm mt-2 text-white/60'> {show?.creator} </span>

                <div className='flex flex-row w-full mt-4 items-center gap-4'>
                    <span className='flex justify-center items-center border w-10 p-1 rounded-lg text-xs text-white'>
                        {show?.agerating}+
                    </span>
                    <span className='text-white'>
                        {hdIcon}
                    </span>
                    <span className='text-yellow-500 flex flex-row items-center gap-1'>
                        {starIcon} <span className='text-white text-sm'> {show?.ratings} </span>
                    </span>
                </div>

            {/* Season List */}
            <div ref={dropdownRef} className="flex w-full mt-4 left-2 text-white z-[50]">
                {show?.type === "movie" ? (
                    <div className="flex absolute items-center gap-2 text-xl font-semibold">
                        {layersIcon} <span>Movie</span>
                    </div>
                ) : (
                    <>
                        <button 
                            className="flex absolute items-center gap-2 text-xl font-semibold cursor-pointer"
                            onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                        >
                            {layersIcon}
                            <span>Season {selectedSeason}</span>
                            <Chevron isOpen={seasonDropdownOpen} />
                        </button>

                        {/* Season Dropdown */}
                        <AnimatePresence>
                            {seasonDropdownOpen && (
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={dropdownVariants}
                                    className="absolute left-44 bottom-[250px] text-nowrap text-[#5c5c5c] bg-black rounded-md px-4 py-2 inset-shadow-sm inset-shadow-white/20"
                                >
                                    {Array.from({ length: show?.season_digit }, (_, i) => i + 1).map(season => (
                                        <motion.button
                                            key={season}
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
                    </>
                )}
            </div>


            {/* Episode List */}
            <div 
                ref={episodeListRef} 
                className={`${
                    show?.type === "movie"
                    ? "flex w-full justify-center mt-10 "  
                    : "flex w-full overflow-scroll mt-8 -ml-4 overflow-x-hidden scrollbar-hidden mb-2"   
                }`}                
            >
                <AnimatePresence mode="wait">
                    <motion.div 
                    key={selectedSeason}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}      
                    className="flex flex-col h-full pb-20 items-end gap-6 z-[8]"
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

                        

                        return (
                            <motion.div 
                                key={index}
                                className={`flex w-full items-center cursor-pointer flex-shrink-0 snap-center ${
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
                                
                                setSelectedVideo({ path: videoPath });
                                setVideoPlayerVisible(true);
                                }}
                            >
                                <motion.div
                                    whileTap={{
                                        scale: 0.90,
                                        boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
                                        transition: { duration: 0.3, ease: "easeInOut" }
                                    }}
                                    style={{ 
                                        backgroundImage: `url(${placeholderPath})`, 
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat'
                                    }}
                                    className={`flex ${
                                        show?.type === "movie"
                                        ? "w-90 h-48 rounded-3xl shadow-2xl relative z-40"  
                                        : "w-56 h-28 rounded-2xl shadow-lg"   
                                    }`}
                                ></motion.div>

                            {show?.type === "movie" ? (
                                <div className=""> </div>
                            ) : (
                                <div className="text-white flex font-semibold text-md max-w-[100px] text-wrap whitespace-normal break-words overflow-hidden text-ellipsis">
                                    {cleanedEpisodeName}
                                </div>
                            )}
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