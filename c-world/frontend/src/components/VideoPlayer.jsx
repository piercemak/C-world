import React, { useEffect, useState, useRef } from "react";
import styles from './modules/videoLibrary.module.scss'
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GradientPickerModal from "./GradientPickerModal";
import ColorPicker from "./ColorPicker";
import Menu from './framercomponents/Menu.jsx'







const VideoPlayer = () => {
    const navigate = useNavigate();

    const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-6" viewBox="0 0 16 16"><path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z"/><path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z"/></svg>
    const paintIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-paint-bucket" viewBox="0 0 16 16"><path d="M6.192 2.78c-.458-.677-.927-1.248-1.35-1.643a3 3 0 0 0-.71-.515c-.217-.104-.56-.205-.882-.02-.367.213-.427.63-.43.896-.003.304.064.664.173 1.044.196.687.556 1.528 1.035 2.402L.752 8.22c-.277.277-.269.656-.218.918.055.283.187.593.36.903.348.627.92 1.361 1.626 2.068.707.707 1.441 1.278 2.068 1.626.31.173.62.305.903.36.262.05.64.059.918-.218l5.615-5.615c.118.257.092.512.05.939-.03.292-.068.665-.073 1.176v.123h.003a1 1 0 0 0 1.993 0H14v-.057a1 1 0 0 0-.004-.117c-.055-1.25-.7-2.738-1.86-3.494a4 4 0 0 0-.211-.434c-.349-.626-.92-1.36-1.627-2.067S8.857 3.052 8.23 2.704c-.31-.172-.62-.304-.903-.36-.262-.05-.64-.058-.918.219zM4.16 1.867c.381.356.844.922 1.311 1.632l-.704.705c-.382-.727-.66-1.402-.813-1.938a3.3 3.3 0 0 1-.131-.673q.137.09.337.274m.394 3.965c.54.852 1.107 1.567 1.607 2.033a.5.5 0 1 0 .682-.732c-.453-.422-1.017-1.136-1.564-2.027l1.088-1.088q.081.181.183.365c.349.627.92 1.361 1.627 2.068.706.707 1.44 1.278 2.068 1.626q.183.103.365.183l-4.861 4.862-.068-.01c-.137-.027-.342-.104-.608-.252-.524-.292-1.186-.8-1.846-1.46s-1.168-1.32-1.46-1.846c-.147-.265-.225-.47-.251-.607l-.01-.068zm2.87-1.935a2.4 2.4 0 0 1-.241-.561c.135.033.324.11.562.241.524.292 1.186.8 1.846 1.46.45.45.83.901 1.118 1.31a3.5 3.5 0 0 0-1.066.091 11 11 0 0 1-.76-.694c-.66-.66-1.167-1.322-1.458-1.847z"/></svg>
    const editIcon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-pencil-fill" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/></svg>

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
      navigate("/home");
    };    

    {/* Input Editing State */}
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef(null);


    {/* Sidebar Nav State */}
    const [clickedCard, setClickedCard] = useState(null);
    const sidebarItems = [
        { title: "Steven Universe", cardId: "card-2" },
        { title: "Adventure Time", cardId: "card-3" },
        { title: "Over the Garden Wall", cardId: "card-1" },
        { title: "Perfect Blue", cardId: "card-4" },
        { title: "Paprika", cardId: "card-5" },
        { title: "Princess Mononoke", cardId: "card-6" },
        { title: "To be Determined", cardId: "card-7" },
    ];
    const cardIdToSlug = {
        "card-2": "steven-universe",
        "card-3": "adventure-time",
        "card-1": "over-the-garden-wall",
        "card-4": "perfect-blue",
        "card-5": "paprika",
        "card-6": "princess-mononoke",
        "card-7": "princess-test",
      };
    const handleCardClick = (cardId) => {
        const card = document.querySelector(`.${styles[cardId]}`);
        const mainContent = document.querySelector(`.${styles['main-content']}`);
      
        if (!card || !mainContent) return;
      
        document.startViewTransition(() => {
          if (clickedCard === cardId) {
            const slug = cardIdToSlug[cardId];
            if (slug) {
              navigate(`/video-library/${slug}`);
            }
          } else {
            // First click → just focus
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
    const pages = [];
    
    for (let i = 0; i < sidebarItems.length; i += cardsPerPage) {
      pages.push(sidebarItems.slice(i, i + cardsPerPage));
    }
    const [currentPage, setCurrentPage] = useState(0);
    useEffect(() => {
        const mainContent = document.querySelector(`.${styles['main-content']}`);
        if (!mainContent) return;
      
        const handleScroll = () => {
            const scrollLeft = mainContent.scrollLeft;
            const pageWidth = mainContent.clientWidth;
            const newPageIndex = Math.floor((scrollLeft + pageWidth / 2) / pageWidth);
          
            setCurrentPage(newPageIndex);
          
            // 🧹 Clear card selection if you swipe pages
            setClickedCard(null);
          };
      
        mainContent.addEventListener('scroll', handleScroll);
      
        return () => {
          mainContent.removeEventListener('scroll', handleScroll);
        };
      }, []);


    {/* Gradient Switcher Logic */}
    const [showPicker, setShowPicker] = useState(false);
    const [gradientValue, setGradientValue] = useState(getComputedStyle(document.documentElement).getPropertyValue('--gradient-9').trim());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const DEFAULT_GRADIENT = 'conic-gradient(from .5turn at bottom center in oklab, #add8e6, #fff)'; //ORIGINAL COLOR
    const handleGradientChange = (newGradient) => {
      document.documentElement.style.setProperty('--gradient-9', newGradient);
      localStorage.setItem('userGradient', newGradient);
    };
    useEffect(() => {
      const savedGradient = localStorage.getItem('userGradient');
      const gradient = savedGradient || DEFAULT_GRADIENT;
      document.documentElement.style.setProperty('--gradient-9', gradient);
      if (!savedGradient) {
        localStorage.setItem('userGradient', DEFAULT_GRADIENT);
      }
    }, []);


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
            <div className={styles['sidebar']}>
                
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

            <div className={`${styles['sidebar-menu']} text-nowrap cursor-pointer`}>
                <AnimatePresence mode="wait">
                    <motion.div
                    key={currentPage} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col"
                    >
                    {pages[currentPage]?.map(({ title, cardId }) => (
                        <a  
                        key={cardId}
                        className={`${styles['sidebar-menu__link']} ${
                            clickedCard === cardId ? styles.active : ""
                        }`}
                        onClick={(e) => {
                            e.preventDefault();
                            handleCardClick(cardId);
                        }}
                        >
                        {title}
                        </a>
                    ))}
                    </motion.div>
                </AnimatePresence>
            </div>
              <label className={styles['toggle']}>
                <input type="checkbox" />
                  <span className={styles['slider']}></span>
              </label>
            </div>
            
            <div className={styles['main']}>
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
                          {homeIcon} 
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


              {/* Gradient Switcher */}
              <div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={styles['main-header__add']}
                  onClick={() => setIsModalOpen(true)}
                >
                  {paintIcon}
                  Testing
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
              <div className={styles['main-header-nav']}>
              {pages.map((_, pageIndex) => (
                <a
                  key={pageIndex}
                  className={`${styles['nav-item']} ${currentPage === pageIndex ? styles.active : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const mainContent = document.querySelector(`.${styles['main-content']}`);
                    if (!mainContent) return;
                    mainContent.scrollTo({
                      left: pageIndex * mainContent.clientWidth,
                      behavior: 'smooth'
                    });
                    setCurrentPage(pageIndex);
                  }}
                >
                  Page {pageIndex + 1}
                </a>
                
              ))}
              </div>
              <div className={`${styles['main-content']} ${clickedCard ? styles.expanded : ''} overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory w-full h-full flex`}>

              {pages.map((page, pageIndex) => (
              <div 
                  key={pageIndex}
                  className={`grid grid-cols-3 gap-[24px] snap-start w-full flex-shrink-0 transition-opacity duration-500 ${
                  pageIndex === currentPage ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
              >
                  {page.map(({ cardId }) => (
                  <div
                      key={cardId}
                      className={`${styles.card} ${styles[cardId]} ${styles['card-img']} ${
                      clickedCard === cardId ? styles.active : ''
                      }`}
                      onClick={() => handleCardClick(cardId)}
                  />
                  ))}
              </div>
              ))}
          </div>
            </div>
        </div>
    </div> 
  )
}

export default VideoPlayer