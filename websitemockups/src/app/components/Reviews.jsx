import React from 'react';
import RatingIcon from './RatingIcon';

const Reviews = ({ review }) => {
    if (!review) {
        return null;  // Avoid rendering anything if no review is passed
      }

    const reviews = [
        { rating: 4 },
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 5 },
        { rating: 5 },
    ];

    const totalReviews = reviews.length;
    const starCounts = [0, 0, 0, 0, 0];
      
    reviews.forEach(review => {
        starCounts[review.rating - 1]++;
    });
      
    const starPercentages = starCounts.map(count => (count / totalReviews) * 100);
    const rightArrow = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-2 ml-1"><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z" clipRule="evenodd" /></svg>
  

    return (
        <div>
            <div className='bg-white shadow-xl border border-gray-200 rounded-lg p-5'>
                <div className='flex flex-row items-center'>
                    <div className='text-yellow-500'> <RatingIcon rating={review.rating}/> </div>
                    <h2 className='ml-2 font-semibold whitespace-nowrap'>{review.rating} out of 5</h2>
                </div>
                <p className='mt-1 text-xs font-medium'>{totalReviews} national ratings</p>

                <div className='mt-3'>
                    <div className="flex items-center hover:text-yellow-600">
                        <span className="mr-2 text-sm w-10 whitespace-nowrap">5 star</span> 
                        <div className="w-[150px] h-2 bg-gray-200 rounded-sm overflow-hidden flex-1 mr-2 hover:w-[200px] hover:h-4 duration-300 cursor-pointer">
                            <div className="h-full bg-yellow-500" style={{ width: `${starPercentages[4]}%` }}></div>
                        </div>
                        <span className="text-sm whitespace-nowrap w-10">{starPercentages[4].toFixed(2)}%</span>
                    </div>

                    <div className="flex items-center mt-2 hover:text-yellow-600">
                        <span className="mr-2 text-sm w-10 whitespace-nowrap">4 star</span> 
                        <div className="w-[150px] h-2 bg-gray-200 rounded-sm overflow-hidden flex-1 mr-2 hover:w-[200px] hover:h-4 duration-300 cursor-pointer">
                            <div className="h-full bg-yellow-500" style={{ width: `${starPercentages[3]}%` }}></div>
                        </div>
                        <span className="text-sm whitespace-nowrap w-10 ">{starPercentages[3].toFixed(2)}%</span>
                    </div>

                    <div className="flex items-center mt-2 hover:text-yellow-600">
                        <span className="mr-2 text-sm w-10 whitespace-nowrap">3 star</span> 
                        <div className="w-[150px] h-2 bg-gray-200 rounded-sm overflow-hidden flex-1 mr-2 hover:w-[200px] hover:h-4 duration-300 cursor-pointer">
                            <div className="h-full bg-yellow-500" style={{ width: `${starPercentages[2]}%` }}></div>
                        </div>
                        <span className="text-sm whitespace-nowrap w-10 ">{starPercentages[2].toFixed(2)}%</span>
                    </div>

                    <div className="flex items-center mt-2 hover:text-yellow-600">
                        <span className="mr-2 text-sm w-10 whitespace-nowrap">2 star</span> 
                        <div className="w-[150px] h-2 bg-gray-200 rounded-sm overflow-hidden flex-1 mr-2 hover:w-[200px] hover:h-4 duration-300 cursor-pointer">
                            <div className="h-full bg-yellow-500" style={{ width: `${starPercentages[1]}%` }}></div>
                        </div>
                        <span className="text-sm whitespace-nowrap w-10 ">{starPercentages[1].toFixed(2)}%</span>
                    </div>

                    <div className="flex items-center mt-2 hover:text-yellow-600">
                        <span className="mr-2 text-sm w-10 whitespace-nowrap">1 star</span> 
                        <div className="w-[150px] h-2 bg-gray-200 rounded-sm overflow-hidden flex-1 mr-2 hover:w-[200px] hover:h-4 duration-300 cursor-pointer">
                            <div className="h-full bg-yellow-500 hover:bg-yellow-300" style={{ width: `${starPercentages[0]}%` }}></div>
                        </div>
                        <span className="text-sm whitespace-nowrap w-10 ">{starPercentages[0].toFixed(2)}%</span>
                    </div>
                </div>

                <hr className="w-full border-t-1 border-gray-500 mt-4" />
                <button className='w-full flex justify-center items-center text-xs mt-4 hover:text-yellow-500 hover:scale-105 duration-300'>See customer reviews {rightArrow}</button>
                
            </div>        
        </div>
    );
}

export default Reviews;
