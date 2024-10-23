'use client'
import { React, useState, useEffect, useRef } from 'react'
import TextBox from './framerComponents/TextBox'
import { motion } from "framer-motion";

const ContentSection1 = () => {

  {/* Intersection Observer for scrolling in and out of view */}
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);  // Set to false when out of view
        }
      },
      { threshold: 0.2 }  // Trigger when 20% of the element is in view
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
  
  const slideLeftVariant = {
    hidden: { x: -200, opacity: 0 },  
    visible: { 
      x: 0, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 80, damping: 20, duration: .5, delay: 0.5 }  
    }
  };


  return (
<motion.div 
  ref={sectionRef}
  initial="hidden"
  animate={isInView ? "visible" : "hidden"}
  variants={slideLeftVariant}
  style={{ overflow: 'hidden' }}
  className="flex flex-col sm:flex-col md:flex-row justify-between items-start pl-3 pr-3 sm:pr-0 sm:pl-10 pt-6 pb-6 w-full"
  >
  
  {/* Left-aligned content with stacked elements */}
  <div className="flex flex-col w-12">
    <h1 className="text-xs font-semibold">01.</h1>
    <h1 className="text-xs font-medium text-gray-500 mt-1">WELCOME</h1>
  </div>
  
  {/* Center-aligned welcome message */}
  <div className="flex-1 mt-6 sm:ml-10 md:ml-20 sm:mr-10 sm:mt-3 md:mt-0">
    <h1 className="text-3xl font-bold text-balance tracking-tight">
      <span className="block">Farmers Insurance</span>
      <span className="block">Company of Flemington</span>
    </h1>

    <h2 className='mt-7 font-normal text-sm'> We offer a wide variety of quality home and business insurance products to suit your needs and we back them up with over 160 years of experience, financial strength, and superior customer service you can count on. </h2>
    <h2 className='mt-9 sm:mt-7 font-semibold text-xs'> 
        <span className="block">If you're not already,</span>
        <span className="block">we invite you to become a member of our Mutual!</span> 
        </h2>
    <div className='flex justify-between mt-6 items-center'>
        <div>
          <TextBox />
        </div>
        <motion.div 
          className="flex items-center bg-blue-500 rounded-full px-2 py-2 shadow-sm cursor-pointer"
          whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}} 
        >
          <motion.span 
            whileTap={{ color: "#3b82f6" }}
            className="font-semibold text-white text-sm">Sign up</motion.span>
        </motion.div>
    </div>

  </div>

  {/* Right-aligned image */}
  <div className="sm:w-full sm:flex sm:justify-center md:w-auto md:flex-none md:justify-start">
    <img src="/farmersImages/House.jpg" alt="Home Image" className="sm:max-w-md mt-10 sm:mt-6 md:mt-0 md:mr-6 rounded-2xl sm:flex sm:justify-center" />
  </div>

</motion.div>

  )
}

export default ContentSection1