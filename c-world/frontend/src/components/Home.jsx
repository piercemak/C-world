import { React, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import styles from './modules/radiogroup.module.css'
import { motion } from "framer-motion";



const Home = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState("");
  const [isHovered, setHovered] = useState("");

  const handleChange = (e) => {
    setSelectedImage(e.target.value);
  };

  const handleNavigate = () => {
    navigate("/video-player");
  };

  const inputVariants = {
    initial: { y: -100, opacity: 0 },
    hovered: { 
        y: 0, 
        opacity: 1,
        transition: {
          ease: "easeInOut"
        }
      }
  };
  const recentVariants = {
    initial: { opacity: 0 },
    hovered: { 
      opacity: 1,
      transition: {
        ease: "easeInOut"
      }
    }
  }
  const recentContentVariants = {
    initial: { x: -10, opacity: 0 },
    hovered: { 
        x: 0, 
        opacity: 1,
        transition: {
          ease: "easeInOut",
          type: "spring", 
          stiffness: 400,
        }
      }
  }
  const timeremainingVariants = {
    initial: { opacity: 0 },
    hovered: { 
        opacity: 1,
        transition: {
          ease: "easeInOut",
          duration: 0.5,
        }
      }
  }
  const labelVariants = {
    initial: { backgroundColor: "rgba(0,0,0,0)" },
    hovered: { backgroundColor: "rgba(0,0,0,0.8)" }
  };
  const parentVariants = {
    hovered: {
      transition: {
        staggerChildren: 0.3,
        when: "beforeChildren"
      }
    },
    initial: {}
  };

  {/* Color Storage */}
  useEffect(() => {
    const savedGradient = localStorage.getItem('userGradient');
    if (savedGradient) {
      document.documentElement.style.setProperty('--gradient-9', savedGradient);
    }
  }, []);

  {/* AWS Signed Urls */}
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const fetchSignedUrl = async (s3Key) => {
  const bucketName = "all-shows";
    try {
      const res = await fetch(`${API_BASE}/api/signed-url/?key=${encodeURIComponent(s3Key)}&bucket=${bucketName}`);
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error("❌ Failed to fetch signed URL:", err);
      return ""; 
    }
  };  
  const [videoUrl, setVideoUrl] = useState("");
  useEffect(() => {
    const getSignedUrl = async () => {
      const cloudKeys = [
        "misc/cartoonMashup1.mp4",
      ];
      const randomIndex = Math.floor(Math.random() * cloudKeys.length);
      const selectedKey = cloudKeys[randomIndex];
      const signed = await fetchSignedUrl(selectedKey);
      setVideoUrl(signed);
    };
    getSignedUrl();
  }, []);


  
  return (
    <div className={styles['body']}> 
      <fieldset className=''>
        <label style= {{"--_img": "url(https://assets.codepen.io/2585/fiddle-leaf.jpeg)" }}>
          <input type="radio" name="images" value="Fiddle Leaf" onChange={handleChange}/>
        </label>

        <label className='relative overflow-hidden'>
          {videoUrl && (
            <video
              className="absolute top-0 left-0 w-full h-dvh object-cover z-[2]"
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          )}          
          <input className='absolute' type="radio" name="images" value="Pink Princess" onChange={handleChange}/>
          {selectedImage === "Pink Princess" && (
            <motion.div 
              variants={labelVariants}
              initial="initial"
              animate={isHovered ? "hovered" : "initial"}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="w-full flex justify-center h-full items-center rounded-[2rem] overflow-hidden absolute z-[3]"
            >
              <motion.button
                animate={isHovered ? "hovered" : "initial"}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full w-full text-white font-bold rounded-lg cursor-pointer flex-row"
                onClick={handleNavigate}
              >
                <motion.div 
                  variants={parentVariants}
                  initial="initial"
                  animate={isHovered ? "hovered" : "initial"}                
                  className="w-full h-40 flex flex-row items-center"              
                > 
                  <motion.span variants={inputVariants} className=' flex justify-start h-60 w-1 ml-4 bg-[#add8e6]'/>
                  <div className="flex flex-col w-full text-left ml-4 text-[50px] ">
                    <motion.span variants={inputVariants} className='tracking-wider'> What Are </motion.span>
                    <motion.span variants={inputVariants} className='tracking-wider'> We Watching Today ? </motion.span>
                  </div>

  

                </motion.div>
              </motion.button>
            </motion.div>
          )}

        </label>
        <label style={{ "--_img": "url(https://assets.codepen.io/2585/pothos.jpeg)" }}>
          <input  type="radio" name="images" value="Pothos" onChange={handleChange}/>
        </label>
      </fieldset>


    </div>

  )
}

export default Home