import { useLocation, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyOtpPage from './pages/VerifyOtpPage'
import DashboardPage from './pages/DashboardPage'
import ThreeBackground from './components/ThreeBackground'
import VideoBackground from './components/VideoBackground'

function AppInner() {
  const location = useLocation()
  // On login/signup, show video background; hide the Three.js particle canvas
  const isVideoPage = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <>
      {/* Three.js particle constellation — hidden on video pages to prevent lag */}
      {!isVideoPage && <ThreeBackground />}

      {/* Fullscreen video background — only on login / signup */}
      <VideoBackground />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </>
  )
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const pipUrl = urlParams.get('pipUrl');

  if (pipUrl) {
    return (
      <iframe 
        src={decodeURIComponent(pipUrl)}
        style={{ width: '100vw', height: '100vh', border: 'none', margin: 0, padding: 0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return <AppInner />
}
