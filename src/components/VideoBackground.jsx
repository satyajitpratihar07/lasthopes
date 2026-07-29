import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * VideoBackground — renders a fullscreen background video at the App level.
 * Placed outside any component with CSS transforms so position:fixed works
 * correctly without being clipped or offset.
 * Only visible on /login and /signup 
    <>
        preload="auto"
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
