import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Slight delay before fading in text
    const mountTimer = setTimeout(() => {
      setMounted(true)
    }, 300)

    // Redirect to login after 3.5 seconds
    const redirectTimer = setTimeout(() => {
      navigate('/login')
    }, 3500)

    return () => {
      clearTimeout(mountTimer)
      clearTimeout(redirectTimer)
    }
  }, [navigate])

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden z-[9999]">
      {/* Subtle background glow */}
      <div 
        className={`absolute inset-0 bg-white/5 blur-[150px] transition-opacity duration-[2000ms] ${mounted ? 'opacity-100' : 'opacity-0'}`} 
      />

      <div className={`relative transition-all duration-[1500ms] ease-out transform ${mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 blur-sm'}`}>
        <h1 
          className="text-[60px] md:text-[100px] lg:text-[140px] font-serif italic tracking-[0.1em] leading-none text-center"
          style={{
            textShadow: mounted ? '0 0 15px rgba(255,255,255,0.9), 0 0 30px rgba(255,255,255,0.6), 0 0 50px rgba(255,255,255,0.3), 0 0 80px rgba(255,255,255,0.1)' : 'none',
            color: mounted ? '#ffffff' : 'rgba(255,255,255,0)',
            transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          Last Hope
        </h1>
        <p 
          className={`text-center font-mono text-white/70 tracking-[0.6em] uppercase text-[10px] md:text-xs mt-6 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}
        >
          Academic Systems
        </p>
      </div>
    </div>
  )
}
