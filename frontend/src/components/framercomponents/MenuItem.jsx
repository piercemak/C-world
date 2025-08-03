import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from 'react-router-dom';


const homeIcon = <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="currentColor" viewBox="0 0 16 16"><path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z"/><path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z"/></svg>
const libraryIcon = <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6zm6.258-6.437a.5.5 0 0 1 .507.013l4 2.5a.5.5 0 0 1 0 .848l-4 2.5A.5.5 0 0 1 6 12V7a.5.5 0 0 1 .258-.437"/></svg>

const variants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 }
    }
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 }
    }
  }
};


export const MenuItem = () => {
  
  const location = useLocation();
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);

  const navigate = useNavigate();

  return (
    <motion.li
      className="mt-18 mb-[20px] flex flex-col items-center cursor-pointer pl-6"
      variants={variants}
    >
      
      <div className="flex text-[#5c5c5c] items-center">
        <div className="flex justify-start absolute ml-[-25px]">
          <motion.div 
            className="w-1 h-10 bg-white rounded-full" 
            animate={{ backgroundColor: isHomeHovered ? "#fff" : "#5c5c5c" }}
            transition={{ duration: 0.3 }}
          /> 
        </div>
        <motion.div
          className="flex items-center"
          onHoverStart={() => setIsHomeHovered(true)}
          onHoverEnd={() => setIsHomeHovered(false)}
          initial={{ x: 0 }}
          whileHover={{ scale: 1.1, x: 50, color: "#fff" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/home')}
        >
          <div className="w-[40px]"> {homeIcon} </div>
          <div className="w-[200px] font-bold tracking-widest text-lg" > Home </div>
        </motion.div>
      </div>

{location.pathname !== '/video-player' && (
  <div className="flex text-[#5c5c5c] items-center mt-10">
    <div className="flex justify-start absolute ml-[-25px]">
      <motion.div 
        className="w-1 h-10 bg-white rounded-full" 
        animate={{ backgroundColor: isLibraryHovered ? "#fff" : "#5c5c5c" }}
        transition={{ duration: 0.3 }}
      /> 
    </div>
    <motion.div
      className="flex items-center"
      onHoverStart={() => setIsLibraryHovered(true)}
      onHoverEnd={() => setIsLibraryHovered(false)}
      initial={{ x: 0 }}
      whileHover={{ scale: 1.1, x: 50, color: "#fff" }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/video-player')}
    >
      <div className="w-[40px]"> {libraryIcon} </div>
      <div className="w-[200px] font-bold tracking-widest text-lg" > Library </div>
    </motion.div>
  </div>
)}
    </motion.li>
  );
};
