import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const [timeLef
      if (gridRef.current)  gridRef.current.style.transform  = `translate(${x * -0.5}px, ${y * -0.5}px)`
      if (blob1Ref.current) blob1Ref.current.style.transform  = `translate(${x}px, ${y}px)`
      if (blob2Ref.current) blob2Ref.current.style.transform  = `translate(${-x}px, ${-y}px)`
    }
    window.addEventListener('mousemove', handleMouse)
    return () => { window.removeEventListener('mousemove', handleMouse); clearTimeout(t) }
  }, [])

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) { setCanResend(true); return }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  const fmt = (n) => String(n).padStart(2, '0')

  const handleInput = (e, i) => {
    const val = e.target.value.replace(/\D/g, '')
    e.target.value = val.slice(-1)
    if (val && i < 5) inputsRef.current[i + 1]?.focus()
  }

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !e.target.value && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e, startIdx) => {
    e.preventDefault()
    const chars = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    chars.forEach((ch, offset) => {
      const el = inputsRef.current[startIdx + offset]
      if (el) el.value = ch
    })
    const next = inputsRef.current[startIdx + chars.length]
    if (next) next.focus()
    else inputsRef.current[5]?.focus()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSuccess(true)
    setTimeout(() => navigate('/login'), 2800)
  }

  const handleResend = () => {
    setTimeLeft(59)
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-full mb-6 text-glow">
              <Icon name="shield_lock" className="text-secondary-fixed-dim" size={32} />
            </div>
            <h1 className="text-[28px] font-bold text-white mb-2 tracking-tight text-glow">Security Check</h1>
            <p className="text-white/60 text-sm max-w-[300px] mx-auto leading-relaxed">
              We've sent a 6-digit verification code to your academic email.
            </p>
          </div>

          {/* OTP Form */}
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="flex justify-between gap-2 md:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={el => inputsRef.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  pattern="[0-9]*"
                  required
                  className="otp-input w-full aspect-square text-center text-[28px] font-bold text-white bg-white/5 border border-white/10 rounded-xl transition-all focus:ring-1 focus:ring-secondary/50 focus:border-secondary"
                  onInput={e => handleInput(e, i)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  onPaste={e => handlePaste(e, i)}
                />
              ))}
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-[#004d47] text-white h-14 rounded-xl font-semibold text-[17px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 accent-glow"
              >
                Verify & Create Account
              </button>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend}
                  className="font-mono text-sm text-secondary-fixed-dim hover:text-white transition-colors underline decoration-2 underline-offset-4 disabled:text-white/30 disabled:no-underline"
                >
                  Resend OTP
                </button>
                <span className="font-mono text-xs text-white/40">
                  {canResend ? 'You can now resend the code' : `Available in 00:${fmt(timeLeft)}`}
                </span>
              </div>
            </div>
          </form>

          {/* Footer note */}
          <div className="mt-10 flex items-center justify-center gap-2 text-white/40">
            <Icon name="lock" size={16} />
            <span className="text-xs uppercase tracking-wider font-mono">Secure End-to-End Encryption</span>
          </div>
        </div>
      </main>

      {/* ── Success Overlay ──────────────────────────────── */}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md transition-opacity duration-500 ${success ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(2, 6, 23, 0.6)' }}>
        <div className={`premium-blur rim-light p-12 rounded-2xl text-center shadow-2xl transition-transform duration-500 ${success ? 'scale-100' : 'scale-90'} max-w-sm`}>
          <div className="w-20 h-20 bg-secondary/15 rounded-full flex items-center justify-center mx-auto mb-6 border border-secondary/35 text-glow">
            <Icon name="check_circle" className="text-secondary-fixed-dim" size={48} />
          </div>
          <h2 className="text-[28px] font-bold text-white mb-2 text-glow">Identity Verified</h2>
          <p className="text-white/60 mb-8">Redirecting to your study planner…</p>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div className="bg-secondary h-full animate-progress-bar" style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
