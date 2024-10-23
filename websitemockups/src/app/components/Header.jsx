"use client";
import { React, useState } from 'react'
import Logo from './Logo'
import StaggeredDropdown1 from './framerComponents/StaggeredDropdown1'
import StaggeredDropdown2 from './framerComponents/StaggeredDropdown2'
import { motion } from "framer-motion";

const markerIcon = <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 7.16 7 13 7 13s7-5.84 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>

const locationVariants = {
  hovered: { scale: 1.1, transition: { type: "spring", stiffness: 100 } }, 
  not: { scale: 1, transition: { type: "spring", stiffness: 100 } },
}

const iconVariants = {
  hovered: {
    y: [-3],
    
    transition: {
      type: "spring", 
      stiffness: 400,
      damping: 10,  
      
    },
    
  },
  not: {
    y: 0, // Resets to the initial position
    
    transition: { type: "spring", stiffness: 400 },
  },
};




const Header = () => {  
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex items-center justify-between w-full px-2 pt-6 sm:pt-8 sm:px-4 md:px-8">
      
      {/* Left Section: Menu and Location */}
      <div className="flex items-center">
        {/* Menu for sm screens and up */}
        <div className='hidden sm:flex'>
          <StaggeredDropdown2 />
        </div>
        {/* Logo for mobile screens */}
        <div className="sm:hidden flex items-center justify-center">
          <Logo className="size-16" />
          <h1 className="font-semibold tracking-tighter text-lg text-center sm:text-left sm:ml-1">
            Farmers of Flemington
          </h1>
        </div>

        <motion.div 
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileTap={{ scale: 0.9 }}
          animate={isHovered ? "hovered" : "not"}
          variants={locationVariants}
          className="hidden lg:flex items-center text-black md:ml-4 cursor-pointer"
        >
          <motion.div
            animate={isHovered ? "hovered" : "not"}
            variants={iconVariants}
          >
            {markerIcon}
          </motion.div>
          <span className="font-semibold text-sm">Flemington, NJ</span>
        </motion.div>
      </div>

      {/* Center Section: Logo */}
      
        <div className="hidden sm:flex items-center justify-center">
          <Logo className="size-16" />
          <h1 className="font-semibold tracking-tighter text-lg text-center sm:text-left sm:ml-1 cursor-pointer">
            Farmers of Flemington
          </h1>
        </div>

        {/* Menu for mobile screens */}
        <div className='sm:hidden flex items-center overflow-visible'>
        <StaggeredDropdown1 />
        </div>
      

      {/* Right Section: Buttons */}
      <div className="hidden sm:flex items-center">
        <motion.div 
          whileHover={{backgroundColor: "#bfdbfe", transition:{ duration: 0.3 } }}
          whileTap={{ color: "#1d4ed8", scale: 0.95, transition: { type: "spring", stiffness: 400 } }}
          className="hidden lg:flex items-center bg-sky-100 text-blue-500 rounded-full px-2 py-2 shadow-sm cursor-pointer"
        >
          <span className="font-semibold text-sm">Ask a question</span>
        </motion.div>
        <motion.div 
          whileHover={{borderColor: "#94a3b8", transition:{ duration: 0.3 } }}
          whileTap={{ color: "#374151", scale: 0.95, transition: { type: "spring", stiffness: 400 } }} 
          className="hidden sm:flex items-center border-2 border-slate-300 rounded-full shadow-sm sm:px-2 sm:py-2 md:ml-4 cursor-pointer"
        >
          <span className="font-semibold text-sm">Sign in</span>
        </motion.div>
      </div>

    </div>
    
    
  )
}

export default Header