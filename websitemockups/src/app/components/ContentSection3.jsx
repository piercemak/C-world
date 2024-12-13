'use client'
import { React, useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from "framer-motion";


const ContentSection3 = ({ toggleChat }) => {
    const rigthArrow = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6"><path fillRule="evenodd" d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
    const downloadArrow = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5"><path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
  

    {/* Intersection Observer for scrolling in and out of view */}
    const [isInView, setIsInView] = useState(false);
    const sectionRef = useRef(null);
  
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
          } else {
            setIsInView(false);  //Set to false when out of view
          }
        },
        { threshold: 0.2 }  //Trigger when 20% of the element is in view
      );
      if (sectionRef.current) {
        observer.observe(sectionRef.current);
      }
      return () => {
        if (sectionRef.current) {
          observer.unobserve(sectionRef.current);
        }
      };
    }, []);


    {/* Count up animation from framer-motion */}
    const count = useMotionValue(0);
    const [displayedCount, setDisplayedCount] = useState(0);
    const rounded = useTransform(count, Math.round);

    useEffect(() => {
        if (isInView) {
          count.set(0);
          const animation = animate(count, 2000, { duration: 4 });
          return () => animation.stop();
        }
      }, [isInView, count]);

    {/* Updates displayedcount */}
    useEffect(() => {
      rounded.onChange((latestValue) => {
        setDisplayedCount(latestValue); 
      });
    }, [rounded]);  
    

    {/* ChatBot Dropdown */}
    const [showChatBot, setShowChatBot] = useState(false);
    const toggleChatBot = () => {
        setShowChatBot((prev) => !prev);
      };


    {/* Variants */}
    const slideLeftVariant = {
      hidden: { x: -200, opacity: 0 }, 
      visible: { 
        x: 0, 
        opacity: 1, 
        transition: { type: "spring", stiffness: 80, damping: 20, duration: .5, delay: 0.3 }  
      }
    };
    const graphicVariant = {
        hidden: { 
          scale: 0,  
          opacity: 0,
          transition: { 
            type: "spring", 
            stiffness: 60,  
            damping: 20,  
            duration: 3.5  
          }
        },
        visible: { 
          scale: 1,  
          opacity: 1,  
          transition: { 
            type: "spring", 
            stiffness: 60,  
            damping: 20,  
            duration: 0.8 
          }
        }
      };
    

  return (
    <motion.div className='flex flex-col w-full justify-between pl-3 pr-3 sm:pr-0 sm:pl-10 mt-12' ref={sectionRef}>
        <motion.div 
            className="flex flex-col w-full whitespace-nowrap mb-4 "
            ref={sectionRef}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={slideLeftVariant}
            style={{ overflow: 'hidden' }}
        >
            <h1 className="text-xs font-semibold">03.</h1>
            <h1 className="text-xs font-medium text-gray-500 mt-1">FARMER AI</h1>
        </motion.div>

        {/* Image for Mobile */}
        <div className='sm:hidden mt-2 w-full flex flex-col'>
            <motion.div 
                className='rounded-lg bg-sky-200 flex justify-center'
                ref={sectionRef}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                variants={graphicVariant}
                style={{ overflow: 'hidden' }}
            >
                <img src="/farmersImages/Iphone.svg" alt="Farmers Image" className=""/>
            </motion.div>
            <div className='flex justify-center flex-col'>
                <motion.div 
                    className='flex justify-center cursor-pointer'
                    whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                >
                    <div className='bg-gray-100 w-24 h-1 mt-4 rounded-full'/>
                </motion.div>

                <motion.div 
                    className='flex justify-center'
                    ref={sectionRef}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={slideLeftVariant}
                    style={{ overflow: 'hidden' }}
                >
                    <div className='flex flex-col bg-gray-100 shadow-xl rounded-2xl mt-1 w-72 h-72 p-4'>
                        <div className='flex flex-row justify-center items-center mt-8'>
                            <span className='flex font-extrabold text-2xl'>FarmerAI</span>
                            <img src="/farmersImages/FarmerAI.svg" alt="Farmer AI" className="size-10 ml-2"/>
                        </div>
                        <span className='flex justify-center text-center mt-6 font-medium text-xs text-gray-400'>FarmerAI is a verstile assistant the utilizes state-of-the-art natural language processing to provide real time support and assistance across various domains</span>
                        <div className='flex flex-col justify-between items-center w-full mt-8'>
                            <motion.span 
                                className='bg-blue-600 rounded-full flex justify-center w-64 h-9 cursor-pointer'
                                whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                            > 
                                <span className='flex items-center font-medium text-sm text-white'> Get the App </span>
                                <span className='flex items-center ml-4 text-white'>{downloadArrow}</span>
                            </motion.span>
                            <motion.span 
                                className='font-medium text-sm mt-3 text-blue-600 cursor-pointer'
                                whileTap={{ color: '#1e40af', scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                              
                            >
                                More
                            </motion.span>
                        </div>

                    </div>
                </motion.div>
            </div>
        </div>

        {/* Image for small to medium screens */}
        <motion.div 
            className='hidden lg:hidden sm:flex w-full'
            ref={sectionRef}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={graphicVariant}
            style={{ overflow: 'hidden' }}
        >
            <div className='overflow-hidden pt-4 px-4 rounded-3xl mb-5 flex w-full justify-end mx-20 bg-cover bg-repeat bg-center' style={{ backgroundImage: `url('/farmersImages/blackBackground.jpg')` }}>
                <div className='flex flex-col flex-wrap justify-start w-full mt-16 mb-4'>
                    <div className='flex items-end'>
                        <img src="/farmersImages/Iphone.png" alt="Iphone" className="ml-5" />
                    </div>
                    <span className='bg-gray-400 w-full h-1 rounded-full mb-8 flex justify-center' />

                    <div className='text-white text-3xl font-bold tracking-wide text-center'>
                        <span className="block">Unleash the full</span>
                        <span className="block"> potential of AI</span>
                    </div>
                    <span className="text-white mt-4 text-sm text-center">FarmerAI is a verstile assistant the utilizes state-of-the-art natural language processing to provide real time support and assistance across various domains</span>
                    <div className='flex flex-row mt-7 justify-center'> 
                        <motion.div 
                            className='flex rounded-full bg-blue-600 text-black p-3 w-48 font-medium cursor-pointer' 
                            whileHover={{ color: '#fff' }}
                            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                        >
                            <div className='flex justify-center w-full'>
                                <span className='flex flex-row whitespace-nowrap'>
                                    Get the App 
                                   <span className='ml-2'> {rigthArrow} </span>
                                </span>
                            </div>
                        </motion.div>
                        <motion.span 
                            className='flex items-center ml-6 text-white font-medium cursor-pointer'
                            whileHover={{ color: '#cbd5e1' }}
                            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                        > 
                            More 
                        </motion.span>
                    </div>
                    <div className='flex justify-between flex-row mt-4 w-full'> 
                        <div className='text-white p-3'>
                            <div className='flex flex-col justify-center w-full'>
                                <span className='flex flex-row whitespace-nowrap font-bold text-2xl'>
                                    4.6 
                                </span>
                                <span className='flex flex-row whitespace-nowrap text-xs'>
                                    Rating on AppStore 
                                </span>
                            </div>
                        </div>
                        <div className='text-white p-3'>
                            <div className='flex flex-col justify-center w-full'>
                                <span className='flex flex-row whitespace-nowrap font-bold text-2xl'>
                                    {displayedCount}+
                                </span>
                                <span className='flex flex-row whitespace-nowrap text-xs'>
                                    Active users
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* Image for large screens */}
        <motion.div 
            className='hidden lg:flex w-full'
            ref={sectionRef}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={graphicVariant}
            style={{ overflow: 'hidden' }}
        >
            <div className='overflow-hidden pt-4 px-4 rounded-3xl mb-5 flex w-full justify-end mx-20 bg-cover bg-repeat bg-center' style={{ backgroundImage: `url('/farmersImages/blackBackground.jpg')` }}>
                <div className='flex flex-col justify-start w-full ml-10 mt-16'>
                    <div className='text-white text-4xl font-bold tracking-wide'>
                        <span className="block">Unleash the full</span>
                        <span className="block"> potential of AI</span>
                    </div>
                    <span className="text-white mt-4 text-sm">FarmerAI is a verstile assistant the utilizes state-of-the-art natural language processing to provide real time support and assistance across various domains</span>
                    <div className='flex flex-row mt-7 '> 
                        <motion.div 
                            className='flex rounded-full bg-blue-600 text-black p-3 w-48 font-medium cursor-pointer'
                            whileHover={{ color: '#fff' }}
                            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                        >
                            <div className='flex justify-center w-full'>
                                <span className='flex flex-row whitespace-nowrap'>
                                    Get the App 
                                   <span className='ml-2'> {rigthArrow} </span>
                                </span>
                            </div>
                        </motion.div>
                        <motion.span 
                            className='flex items-center ml-6 text-white font-medium cursor-pointer' 
                            whileHover={{ color: '#cbd5e1' }}
                            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                            onClick={toggleChat}
                        > 
                            Try me 
                        </motion.span>
                    </div>
                    <div className='flex justify-between flex-row mt-10 w-full'> 
                        <div className='text-white p-3'>
                            <div className='flex flex-col justify-center w-full'>
                                <span className='flex flex-row whitespace-nowrap font-bold text-2xl'>
                                    4.6 
                                </span>
                                <span className='flex flex-row whitespace-nowrap text-xs'>
                                    Rating on AppStore 
                                </span>
                            </div>
                        </div>
                        <div className='text-white p-3'>
                            <div className='flex flex-col justify-center w-full'>
                                <span className='flex flex-row whitespace-nowrap font-bold text-2xl'>
                                    {displayedCount}+
                                </span>
                                <span className='flex flex-row whitespace-nowrap text-xs'>
                                    Active users
                                </span>
                            </div>
                        </div>
                    </div>
                    
                </div>
                <img src="/farmersImages/Iphone.svg" alt="Farmers Logo" className=""/>
            </div>
        </motion.div>

    </motion.div>
  )
}

export default ContentSection3