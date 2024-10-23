import React from 'react'
import ContentBox from './ContentBox'
import { Content } from 'next/font/google'


const HeroSection = ({ children }) => {
  return (
    <div className='bg-cover bg-repeat bg-center z-0 relative py-6 sm:py-10' style={{ backgroundImage: `url('/farmersImages/BlurryBlue.jpg')` }}>
        { children }
    </div>
  )
}

export default HeroSection