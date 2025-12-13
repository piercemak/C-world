import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, easeInOut } from "framer-motion";
import ColorThief from 'colorthief';
import Chevron from './Chevron.jsx'
import { SHOWS } from "./mobileshowsData.js";

const MobileShows = () => {

  const hdIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path d="M10.53 5.968h-.843v4.06h.843c1.117 0 1.622-.667 1.622-2.02 0-1.354-.51-2.04-1.622-2.04"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm5.396 3.001V11H6.209V8.43H3.687V11H2.5V5.001h1.187v2.44h2.522V5h1.187zM8.5 11V5.001h2.188c1.824 0 2.685 1.09 2.685 2.984C13.373 9.893 12.5 11 10.69 11z"/></svg>
  const starIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="size-6"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
  const layersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-layers-fill" viewBox="0 0 16 16"><path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/><path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/></svg>
  const libraryIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
  const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>
  const leftChevron = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-8" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/></svg>

  const { showId } = useParams();
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

    const episodeTitles_neongenesis = {
      1: [
        "Angel_Attack",
        "The_Beast",
        "A_Transfer",
        "Hedgehogs_Dilemma",
        "Rei_I",
        "Rei_II",
        "A_Human_Work",
        "Asuka_Strikes!",
        "Both_of_You_Dance_Like_You_Want_to_Win!",
        "Magma_Diver",
        "The_Day_Tokyo3_Stood_Still",
        "She_said_Dont_make_others_suffer_for_your_personal_hatred",
        "Lilliputian_Hitcher",
        "Weaving_a_Story",
        "Those_Women_Longed_For_the_Touch_of_Others_Lips_and_Thus_Invited_Their_Kisses",
        "Splitting_of_the_Breast",
        "Fourth_CHILD",
        "Ambivalence",
        "Introjection",
        "Weaving_a_Story_2_Oral_Stage",
        "He_Was_Aware_That_He_Still_Was_a_Child",
        "Dont_Be",
        "Rei_III",
        "The_Beginning_and_the_End_or_Knockin_on_Heavens_Door",
        "Do_You_Love_Me",
        "Take_Care_of_Yourself"
      ]
    } 
    
    const episodeTitles_mobpsycho = {
      1: [
        "Self_Proclaimed_Psychic_Reigen_Arataka_And_Mob",
        "Doubts_About_Youth_The_Telepathy_Club_Appears",
        "An_Invite_to_a_Meeting_Simply_Put_I_Just_Want_to_Be_Popular",
        "Idiots_Only_Event_Kin",
        "Ochimusha_Psychic_Powers_and_Me",
        "Discord_To_Become_One",
        "Exaltation_I've_Obtained_Loss",
        "The_Older_Brother_Bows_Destructive_Intent",
        "Claw_7th_Division",
        "The_Heinous_Aura_Mastermind",
        "Master_Leader",
        "Mob_and_Reigen_A_Giant_Tsuchinoko_Appears"
      ],

      2: [
        "Ripped_Apart_Someone_Is_Watching",
        "Urban_Legends_Encountering_Rumors",
        "One_Danger_After_Another_Degeneration",
        "Inside_Evil_Spirit",
        "Discord_Choices",
        "Poor_Lonely_Whitey",
        "Cornered_True_Identity",
        "Even_Then_Continue_Forward",
        "Show_Me_What_You've_Got_Band_Together",
        "Collision_Power_Type",
        "Guidance_Psychic_Sensor",
        "The_Battle_for_Social_Rehabilitation_Friendship",
        "Boss_Fight_The_Final_Light"
      ],

      3: [
        "Future_Career_Paths",
        "Yokai_Hunter_Amakusa_Haruki_Appears_The_Threat_of_a_Hundred_Demons",
        "Getting_Carried_Away_100",
        "Divine_Tree_1_The_Founder_Appears",
        "Divine_Tree_2_Peace",
        "Divine_Tree_3_Dimple_Is",
        "Transmission_1_Winter_Break",
        "Transmission_2_Encountering_the_Unknown",
        "Mob_1_Moving",
        "Mob_2_Rival",
        "Mob_3_Trauma",
        "Confession_The_Future"
      ]
    }

    const episodeTitles_fmab = {
      1: [
        "Fullmetal_Alchemist",
        "The_First_Day",
        "City_of_Heresy",
        "An_Alchemists_Anguish",
        "Rain_of_Sorrows",
        "Road_of_Hope",
        "Hidden_Truths",
        "The_Fifth_Laboratory",
        "Created_Feelings",
        "Separate_Destinations",
        "Miracle_at_Rush_Valley",
        "One_is_All_All_is_One",
        "Beasts_of_Dublith"
      ],

      2: [
        "Those_Who_Lurk_Underground",
        "Envoy_From_the_East",
        "Footsteps_of_a_Comrade_in_Arms",
        "Cold_Flame",
        "The_Arrogant_Palm_of_a_Small_Human",
        "Death_of_the_Undying",
        "Father_Before_the_Grave",
        "Advance_of_the_Fool",
        "Backs_in_the_Distance",
        "Girl_on_the_Battlefield",
        "Inside_the_Belly",
        "Doorway_of_Darkness",
        "Reunion"
      ],
      
      3: [
        "Interlude_Party",
        "Father",
        "Struggle_of_the_Fool",
        "The_Ishvalan_War_of_Extermination",
        "The_520_Cens_Promise",
        "The_Fuhrers_Son",
        "The_Northern_Wall_of_Briggs",
        "Ice_Queen",
        "The_Shape_of_This_Country",
        "Family_Portrait",
        "The_First_Homunculus",
        "Conflict_at_Baschool",
        "Daydream"
      ],

      4: [
        "Homunculus",
        "The_Abyss",
        "Signs_of_a_Counteroffensive",
        "Bite_of_the_Ant",
        "Revving_at_Full_Throttle",
        "The_Promised_Day",
        "Looming_Shadows",
        "Emissary_of_Darkness",
        "The_Oath_in_the_Tunnel",
        "Filial_Affection",
        "Upheaval_in_Central",
        "The_Immortal_Legion",
        "Combined_Strength"
      ],

      5: [
        "Flame_of_Vengeance",
        "Beyond_the_Inferno",
        "The_Adults_Way_of_Life",
        "The_Return_of_the_Fuhrer",
        "Eternal_Leave",
        "Sacrifices",
        "Lost_Light",
        "Eye_of_Heaven_Gateway_of_Earth",
        "He_Who_Would_Swallow_God",
        "A_Fierce_Counterattack",
        "The_Other_Side_of_the_Gateway",
        "Journeys_End"
      ]         
    }    
    
    const episodeTitles_jjk = {
      1: [
        "Ryomen_Sukuna",
        "For_Myself",
        "Girl_of_Steel",
        "Curse_Womb_Must_Die_I",
        "Curse_Womb_Must_Die_II",
        "After_Rain",
        "Assault",
        "Boredom",
        "Small_Fry_and_Reverse_Retribution",
        "Idle_Transfiguration",
        "Narrow-minded",
        "To_You_Someday",
        "Tomorrow",
        "Kyoto_Sister_School_Exchange_Event_Group_Battle_0",
        "Kyoto_Sister_School_Exchange_Event_Group_Battle_1",
        "Kyoto_Sister_School_Exchange_Event_Group_Battle_2",
        "Kyoto_Sister_School_Exchange_Event_Group_Battle_3",
        "Sage",
        "Black_Flash",
        "Nonstandard",
        "Jujutsu_Koshien",
        "The_Origin_of_Blind_Obedience",
        "The_Origin_of_Blind_Obedience_2",
        "Accomplices"
      ],
      2: [
        "Hidden_Inventory",
        "Hidden_Inventory_Part_2",
        "Hidden_Inventory_Part_3",
        "Hidden_Inventory_Part_4",
        "Premature_Death",
        "Its_Like_That",
        "Evening_Festival",
        "The_Shibuya_Incident",
        "The_Shibuya_Incident_Gate_Open",
        "Pandemonium",
        "Summon",
        "Dull_Knife",
        "Red_Scale",
        "Fluctuations",
        "Fluctuations_Part_2",
        "Thunderclap",
        "Thunderclap_Part_2",
        "Right_and_Wrong",
        "Right_and_Wrong_Part_2",
        "Right_and_Wrong_Part_3",
        "Transformation",
        "Transformation_Part_2",
        "The_Shibuya_Incident_Gate_Closed"        
      ]
    }     

    const episodeTitles_cyberpunk = {
      1: [
        "Let_You_Down",
        "Like_A_Boy",
        "Smooth_Criminal",
        "Lucky_You",
        "All_Eyez_On_Me",
        "Girl_on_Fire",
        "Stronger",
        "Stay",
        "Humanity",
        "My_Moon_My_Man"
      ]
    }    

      const episodeTitles_lovedeathandrobots = {
      1: [
        "Sonnies_Edge",
        "Three_Robots",
        "The_Witness",
        "Suits",
        "Sucker_of_Souls",
        "When_The_Yogurt_Took_Over", 
        "Beyond_the_Aquila_Rift",
        "Good_Hunting",
        "The_Dump",
        "Shapeshifters",
        "Helping_Hand",
        "Fish_Night",
        "Lucky_13",
        "Zima_Blue",
        "Blindspot",
        "Ice_Age",
        "Alternate_Histories",
        "Secret_War",
      ],
      2: [
        "Automated_Customer_Service",
        "Ice",
        "Pop_Squad",
        "Snow_in_the_Desert",
        "The_Tall_Grass",
        "All_Through_the_House",
        "Life_Hutch",
        "The_Drowned_Giant",
      ],
      3: [
        "Three_Robots_Exit_Strategies",
        "Bad_Travelling",
        "The_Very_Pulse_of_the_Machine",
        "Night_of_the_Mini_Dead",
        "Kill_Team_Kill",
        "Swarm",
        "Masons_Rats",
        "In_Vaulted_Halls_Entombed",
        "Jibaro",
      ],
      4: [
        "Close_Encounters_of_the_Mini_Kind",
        "Spider_Rose",
        "How_Zeke_Got_Religion",
        "The_Other_Large_Thing",
        "400_Boys",
        "The_Screaming_of_the_Tyrannosaur",
        "Golgotha",
        "For_He_Can_Creep",
        "Smart_Appliances_Stupid_Owners",
        "Cant_Stop"
      ]
    }  

     const episodeTitles_blackmirror = {
      1: [
        "The_National_Anthem",
        "Fifteen_Million_Merits",
        "The_Entire_History_of_You",
      ],
      2: [
        "Be_Right_Back",
        "White_Bear",
        "The_Waldo_Moment",
        "White_Christmas",
      ],
      3: [
        "Nosedive",
        "Playtest",
        "Shut_Up_and_Dance",
        "San_Junipero",
        "Men_Against_Fire",
        "Hated_in_the_Nation",
      ],
      4: [
        "USS_Callister",
        "Arkangel",
        "Crocodile",
        "Hang_the_DJ",
        "Metalhead",
        "Black_Museum"
      ],
      5: [
        "Striking_Vipers",
        "Smithereens",
        "Rachel, Jack and Ashley Too"
      ],
      6: [
        "Joan_Is_Awful",
        "Loch_Henry",
        "Beyond_the_Sea",
        "Mazey_Day",
        "Demon_79",
      ],
      7: [
        "Common_People",
        "Bête Noire",
        "Hotel_Reverie",
        "Plaything",
        "Eulogy",
        "USS_Callister_Into_Infinity",
      ]
    } 

    const episodeTitles_severance = {
      1: [
        "Good_News_About_Hell",
        "Half_Loop",
        "In_Perpetuity",
        "The_You_You_Are",
        "The_Grim_Barbarity_of_Optics_and_Design",
        "Hide_and_Seek",
        "Defiant_Jazz",
        "Whats_for_Dinner?",
        "The_We_We_Are"
      ],
      2: [
        "Hello_Ms_Cobel",
        "Goodbye_Mrs_Selvig",
        "Who_is_Alive?",
        "Woes_Hollow",
        "Trojans_Horse",
        "Attila",
        "Chikhai_Bardo",
        "Sweet_Vitriol",
        "The_After_Hours",
        "Cold_Harbor"
      ],
    } 

    const episodeTitles_pluribus = {
      1: [
        "We_Is_Us",
        "Pirate_Lady",
        "Grenade",
        "Please_Carol",
        "Got_Milk",
        "HDP",
      ],
    } 

    const episodeTitles_itsalwayssunny = {
      1: [
        "The_Gang_Gets_Racist",
        "Charlie_Wants_an_Abortion",
        "Underage_Drinking_A_National_Concern",
        "Charlie_Has_Cancer",
        "Gun_Fever",
        "The_Gang_Finds_a_Dead_Guy",
        "Charlie_Got_Molested",
      ],
      2: [
        "Charlie_Gets_Crippled",
        "The_Gang_Goes_Jihad",
        "Dennis_and_Dee_Go_on_Welfare",
        "Mac_Bangs_Dennis_Mom",
        "Hundred_Dollar_Baby",
        "The_Gang_Gives_Back",
        "The_Gang_Exploits_a_Miracle",
        "The_Gang_Runs_for_Office",
        "Charlie_Goes_America_All_Over_Everybodys_Ass",
        "Dennis_and_Dee_Get_a_New_Dad",
      ],
      3: [
        "The_Gang_Finds_a_Dumpster_Baby",
        "The_Gang_Gets_Invincible",
        "Dennis_and_Dees_Mom_Is_Dead",
        "The_Gang_Gets_Held_Hostage",
        "The_Aluminum_Monster_vs_Fatty_Magoo",
        "The_Gang_Solves_the_North_Korea_Situation",
        "The_Gang_Sells_Out",
        "Frank_Sets_Sweet_Dee_on_Fire",
        "Sweet_Dees_Dating_a_Retarded_Person",
        "Mac_Is_a_Serial_Killer",
        "Dennis_Looks_Like_a_Registered_Sex_Offender",
        "The_Gang_Gets_Whacked_Part_1",
        "The_Gang_Gets_Whacked_Part_2",
        "Bums_Making_a_Mess_All_Over_the_City",
        "The_Gang_Dances_Their_Asses_Off"
      ],
      4: [
        "Mac_and_Dennis_Manhunters",
        "The_Gang_Solves_the_Gas_Crisis",
        "Americas_Next_Top_Paddys_Billboard_Model_Contest",
        "Macs_Banging_the_Waitress",
        "Mac_&_Charlie_Die_Part_1",
        "Mac_&_Charlie_Die_Part_2",
        "Who_Pooped_the_Bed",
        "Paddys_Pub_The_Worst_Bar_in_Philadelphia",
        "Dennis_Reynolds_An_Erotic_Life",
        "Sweet_Dee_Has_a_Heart_Attack",
        "The_Gang_Cracks_the_Liberty_Bell",
        "The_Gang_Gets_Extreme_Home_Makeover_Edition",
        "The_Nightman_Cometh"
      ],
    } 

    const allEpisodeTitles = {
    "steven-universe": episodeTitles_stevenuniverse,
    "over-the-garden-wall": episodeTitles_overthegardenwall,
    "adventure-time": episodeTitles_adventuretime,
    "neon-genesis": episodeTitles_neongenesis,
    "mob-psycho": episodeTitles_mobpsycho,
    "fmab": episodeTitles_fmab,
    "jjk": episodeTitles_jjk,
    "cyberpunk": episodeTitles_cyberpunk,
    "lovedeathandrobots": episodeTitles_lovedeathandrobots,
    "blackmirror": episodeTitles_blackmirror,
    "severance": episodeTitles_severance,
    "pluribus": episodeTitles_pluribus,
    "itsalwayssunny": episodeTitles_itsalwayssunny,
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
          season_total_number: "2 seasons",
          season_digit: 2,
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
          season_total_number: "7 seasons",
          season_digit: 7,
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
          title: "It's Always Sunny in Philadelphia ",
          ratings: "8.8",
          agerating: "18",
          creator: "Glenn Howerton",
          release_year: "2005",
          genre: "Comedy",
          season_total_number: "17 seasons",
          season_digit: 17,
          description: "Five friends with big egos and small brains are the proprietors of an Irish pub in Philadelphia.",
          mobilebackground: "/images/itsalwayssunny/covers/itsalwayssunny_background.jpg",
          subtitles: "yes",
          videos: videoDataByShow["itsalwayssunny"],
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

                {showId === "neon-genesis" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/neongenesis/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}

                {showId === "mob-psycho" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/mobpsycho/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}

                {showId === "fmab" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/fmab/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}

                {showId === "jjk" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/jjk/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}                                                   

                {showId === "the-vanishing" && (
                    <track
                    src={`/videos/thevanishing/thevanishing_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                    />
                )} 
                
                {showId === "ghost-in-the-shell" && (
                <track
                    src={`/videos/ghostintheshell/ghostintheshell_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )} 

                {showId === "tokyo-godfathers" && (
                  <track
                    src={`/videos/tokyogodfathers/tokyogodfathers_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                  />
                )} 

                {showId === "cyberpunk" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/cyberpunk/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}    

                {showId === "solaris" && (
                  <track
                    src={`/videos/solaris/solaris_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                  />
                )}   

                {showId === "demons" && (
                  <track
                    src={`/videos/demons/demons_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                  />
                )} 

                {showId === "severance" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/severance/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}  

                {showId === "pluribus" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/pluribus/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                />
                )}  

                {showId === "itsalwayssunny" && selectedVideo?.season && selectedVideo?.episode && (
                <track
                    src={`/subtitles/itsalwayssunny/season${selectedVideo.season}/S${selectedVideo.season}E${String(selectedVideo.episode).padStart(2, "0")}_subtitles.vtt`}
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
                                
                                setSelectedVideo({ path: videoPath, season: selectedSeason, episode: index + 1 });
                                setVideoPlayerVisible(true);
                                }}
                            >
                            
                            {/* Placeholder Images */}
                            <div className="flex flex-row items-center w-full gap-2">
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
                                  className={`flex border border-white/10 inset-shadow-2xs inset-shadow-white/30 ${
                                      show?.type === "movie"
                                      ? "w-90 h-88 rounded-3xl shadow-2xl relative z-40"  
                                      : "w-86 h-48 rounded-2xl shadow-lg mb-2"   
                                  }`}
                              >
                              {show?.type === "movie" ? (
                                  <div className=""> </div>
                              ) : (                                
                                <div className="p-2 h-[28%] bg-black/20 backdrop-blur-xs border border-white/30 rounded-tl-2xl rounded-br-2xl">
                                  <span className="text-white text-4xl p-2 relative">{episodeNumber}</span>
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
