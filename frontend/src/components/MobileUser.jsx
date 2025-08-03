import { useAuth } from './AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

const MobileUser = () => {

  const editIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
  const globeIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-7" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/></svg>  

  const { user, login } = useAuth(); 
  const navigate = useNavigate();

  {/* Profile Image */}
  const DEFAULT_IMAGE = "/images/misc/profilepictureBlank.webp";
  const fileInputRef = useRef(null);
  const storedImage = localStorage.getItem('profileImage');
  const [profileImage, setProfileImage] = useState(() => 
    localStorage.getItem('userProfileImage') || DEFAULT_IMAGE
  );
 const isDefaultImage = profileImage === DEFAULT_IMAGE;
  useEffect(() => {
    const stored = localStorage.getItem('userProfileImage');
    if (stored) setProfileImage(stored);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setProfileImage(result);
      localStorage.setItem('userProfileImage', result);
    };
    reader.readAsDataURL(file);
  }; 

  {/* Reset Image */}
  const handleResetImage = () => {
    localStorage.removeItem('userProfileImage');
    setProfileImage(DEFAULT_IMAGE);
  };  


  const handleProfileClick = () => {
    navigate('/home'); 
  };

  return (
    <div className='w-full h-dvh flex flex-col bg-black'>
      <div className='w-full flex flex-row justify-center items-center gap-1 text-white relative poppinsfont'>
        <span className='font-bold text-4xl'> C </span>
        <span>{globeIcon}</span>
      </div>
      <div className='flex flex-col leading-none mt-18'>
        <span className='text-white flex justify-center text-[50px] font-bold tracking-wide'> Who's </span>
        <span className='text-white flex justify-center text-[50px] font-bold tracking-wide'> Watching? </span>
      </div>
      <div className='w-full flex justify-center'>
        <motion.div
          whileTap={{
            scale: 0.9,
            transition: {
              type: 'spring',
              stiffness: 500,
              damping: 10,
            },
          }}
          className='w-80 h-80 bg-cover bg-center rounded-4xl flex justify-center p-6 mt-10 shadow-lg shadow-white/5 border border-white/20'
          onClick={handleProfileClick}
          style={{
              backgroundImage: `url(${profileImage})`,
          }}              
        >
          <div className='flex flex-row items-end'>
            <span className='flex items-center justify-center w-32 h-10 rounded-full bg-white p-4 gap-2'>
              <span className='size-[9px] bg-green-400 rounded-full relative z-20'>
                <span className='size-[10px] bg-green-400 rounded-full absolute z-10 animate-ping'/>
              </span>
              <span className='text-lg font-semibold'> Ceara </span>
            </span>
          </div>
        </motion.div>       
      </div>
      <motion.div 
          whileTap={{
              scale: 0.9,
              transition: {
              type: 'spring',
              stiffness: 500,
              damping: 10,
              },
          }} 
          onClick={() => fileInputRef.current?.click()}                 
          className='text-white flex flex-col mt-6 justify-center items-center cursor-pointer z-20'
      >
          <span> {editIcon} </span>
          <span 
              className='w-10 h-[2px] bg-white mt-1 rounded-full'           
          />
      </motion.div>      
      <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
      />       
    </div>
  );
};

export default MobileUser;
