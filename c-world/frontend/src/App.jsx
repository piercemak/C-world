import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';

import Home from './components/Home.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import Library from './components/Library.jsx';
import MobileHome from './components/MobileHome.jsx';
import MobileLibrary from './components/MobileLibrary.jsx';
import MobileShows from './components/MobileShows.jsx';
import User from './components/User.jsx';
import MobileUser from './components/MobileUser.jsx';
import Login from './components/Login.jsx';
import MobileLogin from './components/MobileLogin.jsx';
import IntroScreen from './components/IntroScreen.jsx';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RootRedirect() {
  const isMobile = window.innerWidth <= 768;
  return <Navigate to={isMobile ? "/home" : "/user"} replace />;
}

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={isMobile ? <MobileLogin /> : <Login />} />
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                {isMobile ? <MobileUser /> : <User />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/intro"
            element={
              <ProtectedRoute>
                <IntroScreen isMobile={isMobile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                {isMobile ? <MobileHome /> : <Home />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-player"
            element={
              <ProtectedRoute>
                <VideoPlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-library"
            element={
              <ProtectedRoute>
                {isMobile ? <MobileLibrary /> : <Navigate to="/" replace />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-library/:showId"
            element={
              <ProtectedRoute>
                {isMobile ? <Navigate to="/video-library" replace /> : <Library />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-shows/:showId"
            element={
              <ProtectedRoute>
                <MobileShows />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
