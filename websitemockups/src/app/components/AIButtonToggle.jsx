'use client'
import { React, useState } from 'react'
import ChatBot from './ChatBot'
import { motion, AnimatePresence } from "framer-motion";
import styles from './templates/aiButtonCss.module.css'

const chevronRight = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>

const AIButtonToggle = ({ showChat, toggleChat }) => {

  {/* Variants */}
  const chatVariants = {
    hidden: { 
      x: '100%', 
      opacity: 0 
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: 'tween', duration: .5 }, 
    },
    exit: {
      x: '100%',
      opacity: 0,
      transition: { type: 'tween', duration: .5 }, 
    },
  };

  return (
    <div className="fixed flex right-0 bottom-0 z-49">

      {/* Button */}
      <div className='hidden lg:flex cursor-pointer' style={{ transform: 'scale(0.25)', transformOrigin: 'bottom right', willChange: 'transform' }}>
        <figure className={styles.snip1566}>
          <img src="/farmersImages/AIFarmLogo.svg" alt="Farm Logo" className=""/>
          <figcaption>
            <i className="ion-android-add"></i>
          </figcaption>
          <a onClick={toggleChat}></a>
        </figure>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="fixed right-0 bottom-0 h-full rounded-md"
            
            key="chatbox"
            variants={chatVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="absolute left-[-35px] flex items-center h-full ">
              <motion.span 
                className='size-10 bg-black text-white rounded-full flex justify-center items-center cursor-pointer' 
                onClick={toggleChat}
                whileHover={{ color: '#9ca3af' }}
                whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
              > 
                {chevronRight} 
              </motion.span>
            </div>
            <div className='h-full flex items-center'>
            <ChatBot isOpen={showChat} toggleChat={toggleChat}/>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  )
}

export default AIButtonToggle