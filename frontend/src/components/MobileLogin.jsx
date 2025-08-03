import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MobileLogin = () => {

  const globeIcon = <svg xmlns="http://www.w3.org/2000/svg" className='size-8' fill="currentColor"  viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/></svg>  


  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const success = login(username, password);
    if (success) {
      navigate('/user');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full h-dvh  bg-[url('/images/misc/loginBackground.jpg')] bg-cover bg-center p-8 poppinsfont">
      <div className='text-white flex flex-col items-center justify-center gap-4 h-full bg-white/20 backdrop-blur border border-white/40 shadow-lg rounded-3xl'>
        <div className='flex flex-col items-center absolute h-full py-4'>
          <span className='flex flex-row text-3xl items-center gap-1 font-bold'> C {globeIcon}</span>
          <h2 className="text-3xl font-bold flex items-start h-dvh mt-8">Log In</h2>
        </div>
        

        
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-white/20 w-[70%] text-white p-2 rounded-lg focus:outline-none focus:ring-0 focus:border-none"
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white/20 w-[70%] text-white p-2 rounded-lg focus:outline-none focus:ring-0 focus:border-none"
          placeholder="Password"
        />
        <motion.button 
          type="submit" 
          className="bg-black p-2 w-[80%] h-14 px-6 rounded-full font-bold mt-4"
          whileTap={{ scale: 0.9, color: "color-mix(in oklab, var(--color-white) 60%, transparent)" }} 
          transition={{
              type: "spring",
              stiffness: 600,
              damping: 20    
          }}             
        >
          Log In
        </motion.button>
      </div>
    </form>
  );
};


export default MobileLogin