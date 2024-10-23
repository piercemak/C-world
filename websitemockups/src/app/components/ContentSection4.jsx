"use client";
import { React, useState, useEffect, useRef } from 'react'
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import RatingIcon from './RatingIcon'
import Reviews from './Reviews'
import { motion } from "framer-motion";



const ContentSection4 = () => {

  const RatingStarIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
  const RatingStarOutlineIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
  const [showReviews, setShowReviews] = useState(false);
  const [currentReview, setCurrentReview] = useState(false);

  {/* Hardcoded Reviews */}
  const reviews = [
    {
      name: "Edmund & Kathleen B.",
      image: "/farmersImages/FarmersReview1.svg",
      rating: 4,
      since: "Since 2014",
      text: "Farmers went over and above my expectations. I would and have recommended Farmers to many of my friends."
    },
    {
      name: "Vincent C.",
      image: "/farmersImages/FarmersReview2.svg",
      rating: 5,
      since: "Since 2011",
      text: "The best company that I have ever dealt with."
    },
    {
      name: "Tanya T.",
      image: "/farmersImages/FarmersReview4.svg",
      rating: 4,
      since: "Since 2002",
      text: "We highly appreciate everything that was done. Your company is very prompt and fair."
    },
    {
      name: "Mensur and Rabije D.",
      image: "/farmersImages/FarmersReview3.svg",
      rating: 5,
      since: "Since 2002",
      text: "You guys were great. We really appreciate everything you did."
    },
    {
      name: "Barry W.",
      image: "/farmersImages/FarmersReview5.svg",
      rating: 5,
      since: "Since 2002",
      text: "Outstanding service. Many thanks."
    },
    {
      name: "Marilyn F.",
      image: "/farmersImages/FarmersReview6.svg",
      rating: 5,
      since: "Since 2012",
      text: "I was surprised at how quickly the claim was settled."
    }
  ];

  const handleMouseEnter = (review) => {
    console.log("Hovered on: ", review);
    setCurrentReview(review); 
    setShowReviews(true);     
  };
  
  const handleMouseLeave = () => {
    setShowReviews(false);  
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
      className="flex flex-col items-start pl-3 pr-3 sm:pr-0 sm:pl-10 pt-24 pb-6 w-full"
      ref={sectionRef}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={slideRightVariant}
      style={{ overflow: 'hidden' }}
    >
      
      {/* Left-aligned content with stacked elements */}
      <div 
        className="flex flex-col w-full"
      >
        <h1 className="text-xs font-semibold">04.</h1>
        <h1 className="text-xs font-medium text-gray-500 mt-1">REVIEWS</h1>
      </div>
      
      {/* Center-aligned Text/Reviews */}
      <div className="flex-1 justify-center w-full">
        <h1 className="text-3xl font-bold text-center tracking-tight">
          <span className="block">Hear from our Customers</span>
        </h1>
        <h2 className="text-base text-gray-500 font-normal text-center tracking-tight mt-4">
          <span className="block">See why our clients recommend us—real reviews highlighting our reliable policies</span>
          <span className="block">and customer care.</span>
        </h2>

        {/* Review containers */}
        <div className='hidden md:block'>
          <div className="container flex justify-center items-center py-12 px-4">
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review, index) => (
                <div 
                  key={index} 
                  className="max-w-56 bg-gray-100 p-10 rounded-3xl shadow-lg"
                >
                  <div className="flex flex-col items-start mb-4">
                    <img className="size-8" src={review.image} alt={`Customer Image ${index + 1}`} />
                    <div
                      key={index}
                      className="relative"
                      onMouseEnter={() => handleMouseEnter(review)}  
                      onMouseLeave={handleMouseLeave}                
                    >
                      <div className="text-yellow-500 mt-2 cursor-pointer">
                        <RatingIcon rating={review.rating} />
                      </div>

                      {showReviews && currentReview.name === review.name && (
                        <div className="absolute left-0 z-50 transition-all duration-500 ease-in-out transform origin-top max-h-96 opacity-100">
                          <Reviews review={currentReview} /> {/* Pass current review */}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-nowrap">{review.name}</h4>
                      <p className="text-xs text-gray-600 text-nowrap mt-1">Policyholders {review.since}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 mt-20">"{review.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Review containers for Mobile */}
        <div className='md:hidden'>
          <div class="container flex justify-center items-center py-12 px-4">
            <div class="w-full">
              <Swiper
                spaceBetween={1}
                slidesPerView={1}
                navigation = {true}
                pagination={{ clickable: true }}
                modules={[Pagination, Navigation]}
                style={{
                  "--swiper-pagination-color": "#3b82f6",
                }}
              >
              {reviews.map((review, index) => (
                <SwiperSlide key={index}>
                  <div className="flex justify-center">
                    <div className="max-w-56 bg-gray-100 p-10 rounded-3xl shadow-lg">
                      <div className="flex flex-col items-start mb-4">
                        <img
                          className="size-8"
                          src={review.image}
                          alt={`Customer Image ${index + 1}`}
                        />
                        <div className="text-yellow-500 mt-2">
                          <RatingIcon rating={review.rating} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-nowrap">
                          {review.name}
                        </h4>
                        <p className="text-xs text-gray-600 text-nowrap mt-1">
                          Policyholders {review.since}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 mt-20">{review.text}</p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}

              </Swiper>
            </div>
          </div>
        </div>
      </div>




    </motion.div>

  )
}

export default ContentSection4