import React from 'react'

const ContentBox = ({ children }) => {
  return (

    <div className='bg-white rounded-2xl max-w-sm sm:max-w-2xl md:max-w-6xl mx-auto shadow-lg flex items-center flex-col overflow-hidden z-55'>
        { children }
    </div>

  )
}

export default ContentBox