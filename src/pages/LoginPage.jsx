import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import Features3D from '../components/Features3D'
export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const blob1Ref = useRef(null)
  const blob2Ref = useRef(null)
  const cardRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  // ── Digital Clock State ──
  const [now, setNow] = useState(new Date())
  const [blink, setBlink] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    const blinkTimer = setInterval(() => setBlink(b => !b), 500)
    return () => { clearInterval(tick); clearInterval(blinkTimer) }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Form State
  const initialRole = searchParams.get('role') === 'Admin' ? 'Admin' : 'Student'
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showSavedMenu, setShowSavedMenu] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('lastHopeSavedAccounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })

  // Typewriter state
  const [typedText, setTypedText] = useState('')
  const targetText = role === 'Admin' ? 'Command your campus.' : 'Ace every exam.'

  useEffect(() => {
    let index = 0
    setTypedText('')
    const interval = setInterval(() => {
      setTypedText((prev) => {
        const next = targetText.slice(0, index + 1)
        index++
        if (index >= targetText.length) clearInterval(interval)
        return next
      })
    }, 60)
    return () => clearInterval(interval)
  }, [role, targetText])

  // Auto-switch role if admin email typed
  useEffect(() => {
    if (email.toLowerCase().includes('admin') || email.toLowerCase() === 'orbiplatform@gmail.com') {
      setRole('Admin')
    } else {
      const queryRole = searchParams.get('role') === 'Admin' ? 'Admin' : 'Student'
      setRole(queryRole)
    }
  }, [email, searchParams])

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Hardcoded Admin Bypass
      if (email === 'orbiplatform@gmail.com' && password === '@Satyajit@@007') {
        localStorage.setItem('lastHopeRole', 'Admin')
        setLoading(false)
        navigate('/dashboard')
        return
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      let finalRole = 'Student';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          finalRole = userData.role || 'Student';
          localStorage.setItem('lastHopeRole', finalRole)
          if (userData.stream) localStorage.setItem('lastHopeStudentStream', userData.stream)
          if (userData.college) localStorage.setItem('lastHopeStudentCollege', userData.college)
        } else {
          finalRole = (email === 'admin@university.edu' || email.toLowerCase().includes('admin')) ? 'Admin' : 'Student';
          localStorage.setItem('lastHopeRole', finalRole)
        }
      } catch (dbErr) {
        console.warn("Could not load user profile from Firestore, using fallback:", dbErr.message);
        finalRole = (email === 'admin@university.edu' || email.toLowerCase().includes('admin')) ? 'Admin' : 'Student';
        localStorage.setItem('lastHopeRole', finalRole)
      }

      if (rememberMe) {
        const newSaved = savedAccounts.filter(acc => acc.email !== email);
        newSaved.push({ email, password, role: finalRole });
        setSavedAccounts(newSaved);
        localStorage.setItem('lastHopeSavedAccounts', JSON.stringify(newSaved));
      }

      setLoading(false)
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      console.error("Login failed:", err)
      setError(err.message || 'Invalid credentials. Please check your email and password.')
    }
  }

  const isAdmin = role === 'Admin'
  const accent = isAdmin ? 'text-amber-400' : 'text-teal-400'
  const ringAccent = isAdmin ? 'focus:ring-amber-500/40 focus:border-amber-500/50' : 'focus:ring-teal-500/40 focus:border-teal-500/50'
  const btnGrad = isAdmin
    ? 'bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600'
    : 'bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600'

  // ── Clock Formatting ──
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const colon = blink ? ':' : ' '
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
  const hour12 = String(now.getHours() % 12 || 12).padStart(2, '0')

  return (
    <div className="h-screen flex items-stretch relative text-white overflow-hidden">


      {/* Ambient blobs */}
      <div ref={blob1Ref} className="fixed top-1/3 left-1/5 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none z-[-1]"
        style={{ background: isAdmin ? 'rgba(217,119,6,0.10)' : 'rgba(20,184,166,0.10)' }} />
      <div ref={blob2Ref} className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none z-[-1]"
        style={{ background: 'rgba(84,95,115,0.08)' }} />

      {/* ── Digital Clock — fades out on scroll ── */}
      <div
        style={{
          position: 'fixed',
          top: '28px',
          right: '48px',
          zIndex: 50,
          pointerEvents: 'none',
          textAlign: 'right',
          userSelect: 'none',
          opacity: scrolled ? 0 : 1,
          transform: scrolled ? 'translateY(-12px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {/* Time digits */}
        <div
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 800,
            letterSpacing: '0.06em',
            lineHeight: 1,
            color: '#ffffff',
            textShadow: isAdmin
              ? '0 0 40px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.25), 0 2px 4px rgba(0,0,0,0.8)'
              : '0 0 40px rgba(45,212,191,0.6), 0 0 80px rgba(45,212,191,0.25), 0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          <span>{hour12}</span>
          <span style={{ opacity: blink ? 1 : 0.15, transition: 'opacity 0.1s' }}>:</span>
          <span>{mm}</span>
          <span style={{ opacity: blink ? 1 : 0.15, transition: 'opacity 0.1s' }}>:</span>
          <span>{ss}</span>
          <span
            style={{
              fontSize: 'clamp(14px, 1.5vw, 20px)',
              fontWeight: 600,
              marginLeft: '8px',
              verticalAlign: 'middle',
              color: isAdmin ? 'rgba(251,191,36,0.85)' : 'rgba(45,212,191,0.85)',
              letterSpacing: '0.12em',
            }}
          >{ampm}</span>
        </div>

        {/* Date line */}
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 'clamp(11px, 1.2vw, 15px)',
            fontWeight: 500,
            letterSpacing: '0.25em',
            marginTop: '6px',
            color: isAdmin ? 'rgba(251,191,36,0.70)' : 'rgba(45,212,191,0.70)',
            textShadow: '0 1px 6px rgba(0,0,0,0.7)',
            textTransform: 'uppercase',
          }}
        >
          {dateStr}
        </div>

        {/* Thin accent line below date */}
        <div style={{
          margin: '10px auto 0',
          width: 'clamp(60px, 10vw, 140px)',
          height: '1.5px',
          borderRadius: '2px',
          background: isAdmin
            ? 'linear-gradient(to right, transparent, rgba(251,191,36,0.7), transparent)'
            : 'linear-gradient(to right, transparent, rgba(45,212,191,0.7), transparent)',
        }} />
      </div>

      {/* ── Two-Column Layout ─────────────────────────────── */}
      <div className="w-full flex h-full">

        {/* ════════════════════════════════════════
            LEFT PANEL — Scrollable content
            ════════════════════════════════════════ */}
        <div className={`hidden lg:flex flex-col w-[58%] h-full overflow-y-auto px-16 py-12 gap-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isAdmin ? 'bg-amber-500/10 border-amber-500/30' : 'bg-teal-500/10 border-teal-500/30'}`}>
              <Icon name={isAdmin ? 'admin_panel_settings' : 'school'} filled size={30} className={accent} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Last Hope</h1>
              <p className={`text-xs font-mono mt-0.5 ${isAdmin ? 'text-amber-400/70' : 'text-teal-400/70'}`}>
                {isAdmin ? 'Admin Portal' : 'Student Portal'}
              </p>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-5">
            <h2 className="text-[80px] xl:text-[100px] leading-[0.88] font-extrabold text-white tracking-[-0.04em]">
              {typedText.split(' ').slice(0, -1).join(' ')}{' '}
              <span className={isAdmin ? 'text-gradient-admin' : 'text-gradient-student'}>
                {typedText.split(' ').slice(-1)[0]}
              </span>
              <span className="animate-pulse inline-block w-[3px] h-[70px] xl:h-[88px] bg-white/60 ml-2 align-middle rounded-full" />
            </h2>
            <p className="text-lg text-slate-300/80 leading-relaxed max-w-[520px]">
              {isAdmin
                ? 'Secure administrative access for faculty. Manage students, courses, streams, and institutional data from one unified dashboard.'
                : 'Your precision-engineered academic companion. Sync class schedules, notes, YouTube resources, and GATE prep — all in one place.'}
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex gap-3 flex-wrap">
            {[
              { icon: 'verified', label: isAdmin ? 'Verified Faculty' : 'Structured Learning' },
              { icon: 'bolt', label: 'Real-time Sync' },
              { icon: 'lock', label: 'End-to-End Encrypted' },
            ].map(({ icon, label }) => (
              <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border bg-white/5 backdrop-blur-sm border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all`}>
                <Icon name={icon} size={15} className={accent} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* ── Advanced System Details ───────────────── */}
          <div className="mt-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">System Telemetry</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Network Latency', value: '14ms', icon: 'speed', colorClass: 'text-teal-400', glowClass: 'bg-teal-500/10 group-hover:bg-teal-500/20' },
                { label: 'Active Modules', value: '42 / 42', icon: 'extension', colorClass: 'text-indigo-400', glowClass: 'bg-indigo-500/10 group-hover:bg-indigo-500/20' },
                { label: 'Data Encryption', value: 'AES-256', icon: 'security', colorClass: 'text-amber-400', glowClass: 'bg-amber-500/10 group-hover:bg-amber-500/20' },
                { label: 'Sync Status', value: 'Real-time', icon: 'sync', colorClass: 'text-cyan-400', glowClass: 'bg-cyan-500/10 group-hover:bg-cyan-500/20' },
              ].map((stat, i) => (
                <div key={i} className="relative group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden cursor-default">
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors ${stat.glowClass}`} />
                  <div className="relative z-10 flex flex-col gap-2">
                    <Icon name={stat.icon} size={20} className={`${stat.colorClass} group-hover:scale-110 transition-transform`} />
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-lg font-semibold text-white tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0f172a]/80 to-[#020617]/80 border border-white/10 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                <span className="text-xs font-mono text-slate-300 tracking-wider">CORE SYSTEMS ONLINE</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">v2.4.0-stable</span>
            </div>
            <Features3D isAdmin={isAdmin} />
          </div>

        </div>

        {/* ════════════════════════════════════════
            RIGHT PANEL — Sticky Login Form
            ════════════════════════════════════════ */}
        <div className={`flex-1 flex items-start justify-center px-6 pt-12 lg:pt-[160px] pb-12 lg:px-12 h-full overflow-y-auto lg:overflow-hidden lg:border-l border-white/5 transition-all duration-1000 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="w-full max-w-[440px] pb-24 lg:pb-0">

            {/* Mobile logo */}
            <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${isAdmin ? 'bg-amber-500/10 border-amber-500/30' : 'bg-teal-500/10 border-teal-500/30'}`}>
                <Icon name={isAdmin ? 'admin_panel_settings' : 'school'} filled size={32} className={accent} />
              </div>
              <h1 className="text-3xl font-bold text-white">Last Hope</h1>
            </div>

            {/* Card */}
            <div
              ref={cardRef}
              className="w-full rounded-3xl p-8 bg-[#020617]/50 backdrop-blur-xl border border-white/10 shadow-2xl"
              style={{ boxShadow: isAdmin ? '0 0 60px rgba(217,119,6,0.06), 0 25px 50px rgba(0,0,0,0.5)' : '0 0 60px rgba(20,184,166,0.06), 0 25px 50px rgba(0,0,0,0.5)' }}
            >
              {/* Header */}
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4 border ${isAdmin ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {isAdmin ? 'ADMIN SESSION' : 'STUDENT SESSION'}
                  </div>
                  <h3 className="text-[28px] font-bold text-white tracking-tight leading-tight">
                    {isAdmin ? 'Welcome, Admin' : 'Welcome Back'}
                  </h3>
                  <p className="text-slate-400 mt-1.5 text-sm">
                    {isAdmin ? 'Sign in to your administrative portal.' : 'Sign in to continue your academic journey.'}
                  </p>
                </div>
                
                {/* Saved Accounts Dropdown Toggle */}
                {savedAccounts.length > 0 && (
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowSavedMenu(v => !v)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${showSavedMenu ? 'bg-white/10 border-white/20 shadow-inner' : 'bg-white/5 border-white/10 hover:bg-white/10 shadow-sm'}`}
                      title="Saved Accounts"
                    >
                      <Icon name="manage_accounts" size={24} className="text-white/80" />
                    </button>
                    
                    {showSavedMenu && (
                      <div className="absolute right-0 top-full mt-3 w-[340px] bg-[#020617]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up origin-top-right">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-[11px] font-mono text-white/40 uppercase tracking-widest">Saved Accounts</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSavedAccounts([]);
                              localStorage.removeItem('lastHopeSavedAccounts');
                              setShowSavedMenu(false);
                            }}
                            className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors uppercase font-mono tracking-wider"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {savedAccounts.map((acc, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-xl border transition-all cursor-pointer group flex justify-between items-center ${acc.role === 'Admin' ? 'border-amber-500/20 bg-amber-950/20 hover:bg-amber-950/30 hover:border-amber-400/40' : 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/20'}`}
                              onClick={() => { setEmail(acc.email); setPassword(acc.password); setRole(acc.role); setShowSavedMenu(false); }}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <Icon name={acc.role === 'Admin' ? 'admin_panel_settings' : 'school'} size={18} className={`shrink-0 ${acc.role === 'Admin' ? 'text-amber-400' : 'text-teal-400'}`} />
                                <div className="truncate">
                                  <p className={`font-medium text-sm truncate ${acc.role === 'Admin' ? 'text-amber-400' : 'text-white'}`}>{acc.email}</p>
                                  <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">Click to auto-fill</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newSaved = savedAccounts.filter(a => a.email !== acc.email);
                                  setSavedAccounts(newSaved);
                                  localStorage.setItem('lastHopeSavedAccounts', JSON.stringify(newSaved));
                                  if (newSaved.length === 0) setShowSavedMenu(false);
                                }}
                                className="p-1.5 shrink-0 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                              >
                                <Icon name="close" size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5">
                  <Icon name="error" size={17} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-200 leading-snug">{error}</p>
                </div>
              )}

              {/* Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-[11px] font-mono text-white/50 tracking-widest uppercase px-1">
                    {isAdmin ? 'Admin Email' : 'Student Email'}
                  </label>
                  <div className="relative group">
                    <Icon name="alternate_email" size={18}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 text-white/30 ${isAdmin ? 'group-focus-within:text-amber-400' : 'group-focus-within:text-teal-400'}`} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={isAdmin ? 'orbiplatform@gmail.com' : 'student@university.edu'}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-[15px] transition-all outline-none placeholder:text-white/25 focus:ring-2 focus:bg-white/8 ${ringAccent}`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="password" className="text-[11px] font-mono text-white/50 tracking-widest uppercase">Password</label>
                    <a href="#" className={`text-xs font-medium hover:text-white transition-colors ${isAdmin ? 'text-amber-400/70' : 'text-teal-400/70'}`}>Forgot?</a>
                  </div>
                  <div className="relative group">
                    <Icon name="lock" size={18}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 text-white/30 ${isAdmin ? 'group-focus-within:text-amber-400' : 'group-focus-within:text-teal-400'}`} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={`w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white text-[15px] transition-all outline-none placeholder:text-white/25 focus:ring-2 focus:bg-white/8 ${ringAccent}`}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex justify-between items-center px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`peer appearance-none w-4 h-4 rounded-sm border bg-white/5 transition-all cursor-pointer ${isAdmin ? 'border-amber-500/30 checked:bg-amber-500 checked:border-amber-500 focus:ring-amber-500/30' : 'border-teal-500/30 checked:bg-teal-500 checked:border-teal-500 focus:ring-teal-500/30'}`}
                      />
                      <Icon name="check" size={12} className="absolute left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-[#020617] font-bold transition-opacity" />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Remember Me</span>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-[56px] text-white rounded-xl text-[16px] font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-2 shadow-lg ${btnGrad} ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                  style={{ boxShadow: isAdmin ? '0 8px 32px rgba(217,119,6,0.3)' : '0 8px 32px rgba(20,184,166,0.3)' }}
                >
                  {loading ? (
                    <><Icon name="sync" size={20} className="animate-spin" /> Authenticating…</>
                  ) : (
                    <>
                      Login to Dashboard
                      <Icon name="arrow_forward" size={20} />
                    </>
                  )}
                </button>
              </form>

              {/* Saved accounts moved to dropdown */}

              {/* Signup link */}
              <div className="mt-7 pt-5 border-t border-white/8 text-center">
                <p className="text-sm text-slate-500">
                  New to the system?{' '}
                  <Link to="/signup" className={`font-semibold hover:text-white transition-colors ${isAdmin ? 'text-amber-400' : 'text-teal-400'}`}>
                    Create Account →
                  </Link>
                </p>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center mt-6 text-[10px] font-mono text-white/25 uppercase tracking-widest">
              © 2025 Last Hope · Academic Systems
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
