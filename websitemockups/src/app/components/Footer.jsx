'use client'
import { React, useState, useEffect, useRef } from 'react'
import Logo from './Logo'
import { motion } from "framer-motion";


const Footer = () => {

    const markerIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
    const mailIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
    const phoneIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
    const linkedinIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="#1e40af" viewBox="0 0 448 512" className="size-4" strokeWidth={1.5} stroke="currentColor"><path d="M100.3 448H7.4V148.9h92.9zM53.8 108.1C24.1 108.1 0 83.5 0 53.8a53.8 53.8 0 0 1 107.6 0c0 29.7-24.1 54.3-53.8 54.3zM447.9 448h-92.7V302.4c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7V448h-92.8V148.9h89.1v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3V448z"/></svg>
    const instagramIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="#1e40af" viewBox="0 0 448 512" className="size-4" strokeWidth={1.5} stroke="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>
    const facebookIcon = <svg xmlns="http://www.w3.org/2000/svg"  fill="#1e40af" viewBox="0 0 320 512" className="size-4" strokeWidth={1.5} stroke="currentColor"><path d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z"/></svg>

    {/* Variants */}
    const slideUpVariants = {
        hidden: { opacity: 0, y: 20 }, 
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 100,
            damping: 20,
            duration: 1.5,
            staggerChildren: 0.1,
          },
        },
      };
      
      const parentVariants = {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
        },
      };


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

    const [phoneNumber, setPhoneNumber] = useState('');
    useEffect(() => {
        setPhoneNumber('908-782-4120'); 
      }, []);


  return (
    <motion.div className='w-full'  ref={sectionRef}>

        {/* Mobile footer */}
        <motion.div 
            className='py-6 px-2'
            animate={isInView ? "visible" : "hidden"}
            variants={slideUpVariants} 
        >
            <motion.div className='sm:hidden flex flex-col items-center' variants={slideUpVariants}>
                <motion.div className='flex flex-row items-center' variants={slideUpVariants}>
                    <Logo className="size-14"/>
                    <span className='text-3xl ml-1 font-bold text-blue-800 tracking-tighter'>Farmers </span>
                </motion.div>

                <motion.span className='flex flex-row text-md mt-4 items-center font-medium' variants={slideUpVariants}> 
                    <span className='mr-2 text-blue-800'>{markerIcon}</span>
                    23 Royal Rd, Flemington, NJ 08822
                </motion.span>
                <motion.span className='flex flex-row text-md mt-4 items-center font-medium ' variants={slideUpVariants}> 
                    <span className='mr-2 text-blue-800'>{mailIcon}</span>
                    FarmersInsurance@gmail.com
                </motion.span>
                <motion.span className='flex flex-row text-md mt-4 items-center font-medium ' variants={slideUpVariants}> 
                    <span className='mr-2 text-blue-800'>{phoneIcon}</span>
                    {phoneNumber}
                </motion.span>

                <motion.div className='mt-6 flex flex-row justify-between w-32' variants={slideUpVariants}>
                    <motion.div 
                        className='w-10 h-10 rounded-full bg-transparent border-2 border-blue-800 flex items-center justify-center cursor-pointer'
                        onClick={() => window.location.href = "https://www.linkedin.com/company/farmersofflemington"}
                        whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                    >
                        <span>{linkedinIcon}</span>
                    </motion.div>
                    <motion.div 
                        className='w-10 h-10 rounded-full bg-transparent border-2 border-blue-800 flex items-center justify-center cursor-pointer' 
                        whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                    >
                        <motion.span>{instagramIcon}</motion.span>
                    </motion.div>
                    <motion.div 
                        className='w-10 h-10 rounded-full bg-transparent border-2 border-blue-800 flex items-center justify-center cursor-pointer'
                        onClick={() => window.location.href = "https://www.facebook.com/FarmersOfFlemington/"}
                        whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                    >
                        <span>{facebookIcon}</span>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>


        <motion.div 
            className='hidden sm:flex justify-between w-full sm:px-8 lg:px-28 pb-20 mt-10'
            ref={sectionRef}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={parentVariants} 
        >
            <motion.div className='flex flex-col items-start sm:mr-16 lg:mr-0' variants={slideUpVariants}>
                <motion.div className='flex flex-row items-center' variants={slideUpVariants}>
                    <Logo className="size-12"/>
                    <span className='text-2xl ml-1 font-bold text-blue-800 tracking-tighter'>Farmers </span>
                </motion.div>

                <motion.span className='flex flex-row text-xs mt-4 items-center font-medium' variants={slideUpVariants}> 
                    <span className='mr-2 text-blue-800'>{markerIcon}</span>
                    23 Royal Rd, Flemington, NJ 08822
                </motion.span>
                <motion.span className='flex flex-row text-xs mt-4 items-center font-medium ' variants={slideUpVariants}> 
                    <span className='mr-2 text-blue-800'>{mailIcon}</span>
                    FarmersInsurance@gmail.com
                </motion.span>
                <motion.span className='flex flex-row text-xs mt-4 items-center font-medium ' variants={slideUpVariants}> 
                    <span className='mr-2 text-blue-800'>{phoneIcon}</span>
                    {phoneNumber}
                </motion.span>

                <motion.div className='mt-6 flex flex-row justify-between w-32' variants={slideUpVariants}>
                    <motion.div 
                        className='w-10 h-10 rounded-full bg-transparent border-2 border-blue-800 flex items-center justify-center cursor-pointer'
                        onClick={() => window.location.href = "https://www.linkedin.com/company/farmersofflemington"}
                        whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 400 } }}
                        whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                    >
                        <span>{linkedinIcon}</span>
                    </motion.div>
                    <motion.div 
                        className='w-10 h-10 rounded-full bg-transparent border-2 border-blue-800 flex items-center justify-center cursor-pointer' 
                        whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 400 } }}
                        whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                    >
                        <motion.span>{instagramIcon}</motion.span>
                    </motion.div>
                    <motion.div 
                        className='w-10 h-10 rounded-full bg-transparent border-2 border-blue-800 flex items-center justify-center cursor-pointer'
                        onClick={() => window.location.href = "https://www.facebook.com/FarmersOfFlemington/"}
                        whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 400 } }}
                        whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
                    >
                        <span>{facebookIcon}</span>
                    </motion.div>
                </motion.div>
            </motion.div>

            <motion.div className='hidden sm:flex flex-row text-xs items-start'>
                <motion.div className='flex flex-col sm:pr-8 lg:pr-14' variants={slideUpVariants}>
                    <span className='font-bold text-gray-500 cursor-pointer'>Product</span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Personal Lines</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Commercial Lines</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Cyber Coverage</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Umbrella Liability</motion.span>
                </motion.div>
            
                <motion.div className='flex flex-col sm:pr-8 lg:px-14' variants={slideUpVariants}>
                    <span className='font-bold text-gray-500 cursor-pointer'>Company</span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Features</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>About Us</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Why Farmers</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Testimonials</motion.span>
                </motion.div>

                <motion.div className='flex flex-col sm:pr-8 lg:px-14' variants={slideUpVariants}>
                    <span className='font-bold text-gray-500 cursor-pointer'>Support</span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Contact Us</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Privacy Policy</motion.span>
                    <motion.span className='mt-5 font-semibold cursor-pointer' variants={slideUpVariants} whileHover={{ scale: 1.05, color: '#2563eb', transition: { type: "spring", stiffness: 200 } }} whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 200 }}}>Terms of Service</motion.span>
                </motion.div>
            </motion.div>
        </motion.div>
    </motion.div>
  )
}

export default Footer