import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * VideoBackground — renders a fullscreen background video at the App level.
 * Placed outside any component with CSS transforms so position:fixed works
 * correctly without being clipped or offset.
 * Only visible on /login and /signup routes.
 */
export default function VideoBackground() {
  const location = useLocation()
  const videoRef = useRef(null)
  const isVisible = location.pathname === '/login' || location.pathname === '/signup'

  // When the route changes, ensure video plays
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isVisible) {
      video.play().catch(() => { })
    } else {
      video.pause()
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <>
      {/* The video element itself — position:fixed with 100vw/100vh fills viewport */}
      <video
        ref={videoRef}
        src="/login-video/199740-911047178.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          objectPosition: 'center center',
          zIndex: -40,
          pointerEvents: 'none',
          display: 'block',
        }}
      />

      {/* Dark overlay completely removed to make video full bright */}

      {/* Left-side gradient for login page left panel text */}
      {location.pathname === '/login' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -38,
            pointerEvents: 'none',
            background:
              'linear-gradient(to right, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0.08) 50%, transparent 100%)',
          }}
        />
      )}
    </>
  )
}
