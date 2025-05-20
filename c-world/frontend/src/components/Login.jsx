import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Login = () => {

  const globeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-globe-americas" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/></svg>  

  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/user');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="w-full h-screen flex bg-[url('/images/misc/loginBackground.jpg')] bg-cover bg-center text-white overflow-hidden p-10">
      {/* Left - quote area */}
      <div className="w-1/2 p-12 flex flex-col justify-between border-[10px] border-white rounded-l-3xl">
        <div className="text-sm uppercase tracking-wider flex items-center gap-1 poppinsfont">   
                <span className='text-lg font-bold'> C </span>            
                <span>{globeIcon}</span>  
        </div>
        <div className="mb-10">
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Log in <br /> and Start <br /> Watching
          </h1>
          <p className="text-white/90 text-sm max-w-sm font-medium">
            Once signed in proceed to profile selection . . . if you can pass the gate.
          </p>
        </div>
      </div>

      {/* Right - form panel with cutout effect */}
      <div className="w-1/2 h-full bg-white text-black relative z-10 rounded-r-3xl">
        <div className="absolute top-0 left-[-40px] h-full w-[80px] bg-white rounded-tl-[50px] rounded-bl-[50px] z-0" />
        <div className="h-full flex flex-col justify-center items-center relative z-10 px-10">
          <div className="w-full max-w-md">
            <div className='flex w-full justify-center items-center relative -top-40 font-semibold text-black/90 gap-2 poppinsfont'> 
                <span>{globeIcon}</span>
                <span className='text-lg'> CearaWorld </span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-gray-600 mb-6">Enter your username and password to access your account</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Username"
                className="border border-gray-300 p-3 rounded"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="border border-gray-300 p-3 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-between items-center text-sm"></div>
              <motion.button 
                whileTap={{
                    scale: 0.9,
                    transition: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 10,
                    },
                }}
                type="submit" 
                className="bg-black text-white p-3 rounded-3xl font-bold cursor-pointer">Sign In
              </motion.button>
            </form>
            <p className="text-sm text-center mt-6">
              Don’t have an account? <span className="text-blue-500 hover:underline cursor-pointer">Good.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
