import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const MobileLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const success = login(username, password);
    if (success) {
      navigate('/mobile-user');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full h-dvh bg-black text-white flex flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Log In</h2>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="bg-white text-black p-2 rounded"
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-white text-black p-2 rounded"
        placeholder="Password"
      />
      <button type="submit" className="bg-green-500 p-2 px-4 rounded font-bold">
        Log In
      </button>
    </form>
  );
};


export default MobileLogin