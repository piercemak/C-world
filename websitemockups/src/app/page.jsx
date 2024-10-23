'use client'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import ContentBox from './components/ContentBox'
import ContentSection1 from './components/ContentSection1'
import ContentSection2 from './components/ContentSection2'
import ContentSection3 from './components/ContentSection3'
import ContentSection4 from './components/ContentSection4'
import Footer from './components/Footer'
import AIButton from './components/AIButtonToggle'
import { useState } from 'react'



export default function Home() {

const [showChat, setShowChat] = useState(false);
const toggleChat = () => {
  setShowChat(!showChat);
};
  return (
    
    <div>
      
      <HeroSection>

        <ContentBox>
          <Header />
          <hr className="w-full border-t-2 border-gray-300 my-2 sm:my-4" />
          <ContentSection1 />
          <ContentSection2 />
          <ContentSection3 toggleChat={toggleChat}/>
          <ContentSection4 />
          <hr className="w-full border-t-2 border-gray-300 mt-2 sm:mt-4" />
          <Footer />
          <AIButton showChat={showChat} toggleChat={toggleChat}/>
         
        </ContentBox>

      </HeroSection>
   

    </div>

    
  );
}
