import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';

import { SnowProvider } from "./components/SnowContext.jsx"; // REMOVE AFTER HOLDAYS //
import SnowOverlay from "./components/SnowOverlay"; // REMOVE AFTER HOLDAYS //

const VideoPlayer = lazy(() => import('./components/VideoPlayer.jsx'));
const Library = lazy(() => import('./components/Library.jsx'));
const MobileLibrary = lazy(() => import('./components/MobileLibrary.jsx'));
const MobileShows = lazy(() => import('./components/MobileShows.jsx'));
const User = lazy(() => import('./components/User.jsx'));
const MobileUser = lazy(() => import('./components/MobileUser.jsx'));
const Login = lazy(() => import('./components/Login.jsx'));
const MobileLogin = lazy(() => import('./components/MobileLogin.jsx'));
const IntroScreen = lazy(() => import('./components/IntroScreen.jsx'));
const Reviews = lazy(() => import('./components/Reviews.jsx'));
const Archive = lazy(() => import('./components/Archive.jsx'));
const DesktopUpdater = lazy(() => import('./components/DesktopUpdater.jsx'));

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function RootRedirect() {
  return <Navigate to="/home" replace />;
}

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <SnowProvider> 
    <SnowOverlay />
    <AuthProvider>
      <Suspense fallback={null}>
      <DesktopUpdater />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={isMobile ? <MobileLogin /> : <Login />} />
          <Route
            path="/home"
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
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <Reviews />
              </ProtectedRoute>
            }
          />      
          <Route
            path="/archive"
            element={
              <ProtectedRoute>
                <Archive />
              </ProtectedRoute>
            }
          />      
        </Routes>
      </BrowserRouter>
      </Suspense>
    </AuthProvider>
    </SnowProvider>
  );
}

export default App;
