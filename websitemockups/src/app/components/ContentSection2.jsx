'use client'
import { React, useState, useEffect, useRef } from 'react'
import TextBox from './framerComponents/TextBox'
import { motion } from "framer-motion";

const ContentSection2 = () => {

  const [isPersonalOpen, setIsPersonalOpen] = useState(false);
  const [isCommercialOpen, setIsCommercialOpen] = useState(false);

  const downArrow = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6"> <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" /> </svg>
  const upArrow = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6"> <path fillRule="evenodd" d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z" clipRule="evenodd" /></svg>
  const houseIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>
  const businessIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6"><path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 0 0 7.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 0 0 4.902-5.652l-1.3-1.299a1.875 1.875 0 0 0-1.325-.549H5.223Z" /><path fillRule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 0 0 9.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 0 0 2.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H3Zm3-6a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1-.75-.75v-3Zm8.25-.75a.75.75 0 0 0-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-5.25a.75.75 0 0 0-.75-.75h-3Z" clipRule="evenodd" /></svg>


  {/* Intersection Observer for scrolling in and out of view */}
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);  
        }
      },
      { threshold: 0.2 }  
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
  
  const slideRightVariant = {
    hidden: { x: 200, opacity: 0 },  
    visible: { 
      x: 0, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 80, damping: 20, duration: .5, delay: 0.5 }  
    }
  };


  return (

    <motion.div
      ref={sectionRef} 
      className="flex flex-col sm:flex-col md:flex-row justify-between items-start pl-3 pr-3 sm:pr-0 sm:pl-10 pt-16 pb-6 w-full"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={slideRightVariant}
      style={{ overflow: 'hidden' }}
    >
      
      {/* Leftside content with stacked elements */}
      <div className="flex flex-col w-12">
        <h1 className="text-xs font-semibold">02.</h1>
        <h1 className="text-xs font-medium text-gray-500 mt-1">WE DO</h1>
      </div>
      
      {/* Centered welcome message */}
      <div className="flex-1 mt-6 sm:ml-10 md:ml-20 sm:mr-10 sm:mt-3 md:mt-0 w-full sm:w-auto">
        <h1 className="text-3xl font-bold text-balance tracking-tight">
          <span className="block">Our Products</span>
          <span className="block">and Services</span>
        </h1>

        <h2 className='mt-7 font-normal text-sm'> 
          <span className="block">Explore our comprehensive range of personal</span>
          <span className="block">and commercial insurance products designed to</span>
          <span className="block">protect what matters most.</span>
        </h2>

        {/* Personal Dropdown */}
        <div className="flex-col justify-center max-w-md sm:mr-12 mt-8 bg-gray-200 rounded-lg p-5">
          <button className="font-bold text-base text-nowrap mr-6 w-full flex justify-start" onClick={() => setIsPersonalOpen(!isPersonalOpen)}>
            Personal <span className=" flex justify-end w-full"> {isPersonalOpen ? upArrow : downArrow} </span>
          </button>
          <div
            className={`transition-all duration-500 ease-in-out transform origin-top overflow-hidden ${
              isPersonalOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
            style={{ transformOrigin: 'top' }}
          >
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Homeowners Insurance</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Condo Insurance</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Renters Insurance</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Combination Dwelling</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Personal Umbrella</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Homeowners Equipment Breakdown</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Service Line Coverage</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span>{houseIcon}</span>
              <span className='ml-2'>Personal Cyber Coverage</span>
            </h2>

          </div>
        </div>

        {/* Commercial Dropdown */}
        <hr className="w-lg border-t-2 border-gray-300 my-4 mr-12" />

        <div className="flex-col justify-start max-w-md sm:mr-12 bg-gray-200 rounded-lg p-5">
          <button className="font-bold text-base text-nowrap mr-6 w-full flex justify-start" onClick={() => setIsCommercialOpen(!isCommercialOpen)}>
            Commercial <span className=" flex justify-end w-full"> {isCommercialOpen ? upArrow : downArrow} </span>
          </button>
          <div
            className={`transition-all duration-500 ease-in-out transform origin-top overflow-hidden ${
              isCommercialOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
            style={{ transformOrigin: 'top' }}
          >
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span className=''>{businessIcon}</span>
              <span className='ml-2'>Businessowners Insurance</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span className=''>{businessIcon}</span>
              <span className='ml-2'>Commercial Package</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span className=''>{businessIcon}</span>
              <span className='ml-2'>Artisan Contractor Speciality</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span className=''>{businessIcon}</span>
              <span className='ml-2'>Commercial Equipment Breakdown</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span className=''>{businessIcon}</span>
              <span className='ml-2'>Commercial Auto</span>
            </h2>
            <h2 className="flex items-center font-normal text-xs leading-relaxed mt-4 hover:bg-sky-100 hover:rounded-lg hover:p-2 hover:ease-in-out hover:duration-200 hover:text-blue-500 hover:font-semibold">
              <span className=''>{businessIcon}</span>
              <span className='ml-2'>Commercial Umbrella Liability</span>
            </h2>

          </div>
        </div>           

      </div>

      {/* Rightside Text */}
      <div>
        <div className="flex justify-end max-w-md mr-12 mt-10 sm:mt-10 md:mt-0"> 
          <h2 className='font-bold text-sm text-nowrap mr-6'>Personal Lines</h2>
          <h2 className='font-normal text-xs ml-5 leading-relaxed'>Whether you own a home or condo, rent a house or apartment, or have an investment property you rent out seasonally, Farmers of Flemington has a policy to meet your needs.  Plus, as a Policyholder, you are more than just a number to us.</h2>
        </div>

        <hr className="w-lg border-t-2 border-gray-300 my-4 mr-5" />

        <div className="flex justify-end max-w-md mr-12"> 
          <h2 className='font-bold text-sm text-nowrap'>Commercial Lines</h2>
          <h2 className='font-normal text-xs ml-5 leading-relaxed'>Your business faces risks every day.  Farmers of Flemington offers business insurance coverage that is customizable to your needs so you can be sure your assets are protected.  That way you can focus on what matters — running your business.</h2>
        </div>
      </div>

    </motion.div>

  )
}

export default ContentSection2