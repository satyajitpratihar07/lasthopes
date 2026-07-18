import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { 
    script.onerror = () => reject(new Error('SMTP.js load failed'));
    document.head.appendChild(script);
  });
};

export default function SignupPage() {
  const navigate = useNavigate()
  const [bgVideoEnabled, setBgVideoEnabled] = useState(() => {
    const saved = localStorage.getItem('lastHopeBgVideo');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('lastHopeBgVideo', JSON.stringify(bgVideoEnabled));
  }, [bgVideoEnabled]);
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [stream, setStream] = useState('')
  const [college, setCollege] = useState('')
  const [semester, setSemester] = useState('')
  const [colleges, setColleges] = useState([])
  const [isIdle, setIsIdle] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [tempUserData, setTempUserData] = useState(null)

  // Typewriter state
  const [typedDesc, setTypedDesc] = useState('')
  const targetDesc = 'Master your academic flow.'

  const fileRef = useRef(null)

  useEffect(() => {
    let timeoutId;
    const handleResetTimeout = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
    };

    timeoutId = setTimeout(() => {
      setIsIdle(true);
    }, 3000);

    window.addEventListener('mousemove', handleResetTimeout, { passive: true });
    window.addEventListener('mousedown', handleResetTimeout, { passive: true });
    window.addEventListener('keydown', handleResetTimeout, { passive: true });
    window.addEventListener('touchstart', handleResetTimeout, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleResetTimeout);
      window.removeEventListener('mousedown', handleResetTimeout);
      window.removeEventListener('keydown', handleResetTimeout);
      window.removeEventListener('touchstart', handleResetTimeout);
    };
  }, []);

  useEffect(() => {
    let index = 0
    setTypedDesc('')
    const interval = setInterval(() => {
      setTypedDesc((prev) => {
        const next = targetDesc.slice(0, index + 1)
        index++
        if (index >= targetDesc.length) {
          clearInterval(interval)
        }
        return next
      })
    }, 45)
    return () => clearInterval(interval)
  }, [targetDesc])
  const gridRef = useRef(null)
  const blob1Ref = useRef(null)
  const blob2Ref = useRef(null)
  const videoRef = useRef(null)
  const cardRef = useRef(null)

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:v=|v\/|vi\/|youtu\.be\/|embed\/|live\/|shorts\/)([\w-]{11})/i);
    return match ? match[1] : null;
  }

  const extractGoogleDriveId = (url) => {
    if (!url) return null;
    const regExp = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/(?:file\/d\/|open\?id=))([\w-]{25,})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  useEffect(() => {
    // Trigger mount animation
    const t = setTimeout(() => setMounted(true), 50)

    // Load Colleges list
    const saved = localStorage.getItem('lastHopeCollegesList')
    if (saved) {
      try { setColleges(JSON.parse(saved)) } catch (e) { }
    }
    const fetchColleges = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'colleges'))
        if (snap.exists() && snap.data().list) {
          const list = snap.data().list
          setColleges(list)
          localStorage.setItem('lastHopeCollegesList', JSON.stringify(list))
        }
      } catch (err) {
        console.warn("Could not load colleges snapshot", err)
      }
    }
    fetchColleges()

    return () => {
      clearTimeout(t)
    }
  }, [])

  const handleCollegeChange = (selectedName) => {
    setCollege(selectedName)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }



  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const fullname = document.getElementById('fullname').value
    const rollno = document.getElementById('rollno').value

    try {
      // Pre-check if email already exists
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods && methods.length > 0) {
          alert('This email is already registered. Please login instead.');
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Email pre-check failed or is restricted:', checkErr);
      }

      // Generate OTP locally
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('lastHope_signup_otp', generatedOtp);
      sessionStorage.setItem('lastHope_signup_otp_expiry', Date.now() + 5 * 60 * 1000);

      // Send Email via SMTPJS
      const emailBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f4f7f6; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Last Hope</h1>
          </div>
          <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
            <h2 style="color: #1e293b; font-size: 22px; margin-top: 0; margin-bottom: 10px;">Verify your email</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 35px;">
              You are almost there! Please use the verification code below to complete your registration.
            </p>
            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 auto; max-width: 250px;">
              <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0f172a; display: block; margin-left: 6px;">${generatedOtp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 35px; margin-bottom: 0;">
              This code will expire in 5 minutes.
            </p>
          </div>
        </div>
      `;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: "Your Verification Code - Last Hope",
            html: emailBody
          })
        });

        const data = await response.json();

        if (data.success) {
          setTempUserData({ email, password, fullname, rollno });
          setShowOtp(true);
        } else {
          throw new Error(data.error || "Failed to send email via backend.");
        }
      } catch (emailErr) {
        console.warn("Backend email service error, attempting direct SMTP.js fallback:", emailErr);
        try {
          await sendDirectEmail(email, "Your Verification Code - Last Hope", emailBody);
          setTempUserData({ email, password, fullname, rollno });
          setShowOtp(true);
        } catch (directErr) {
          console.warn("Direct SMTP failed:", directErr);
          // Fallback if completely offline
          alert(`Notice (Fallback): Your OTP is ${generatedOtp}`);
          setTempUserData({ email, password, fullname, rollno });
          setShowOtp(true);
        }
      }
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false);
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { email, password, fullname, rollno } = tempUserData;

      // Local OTP verification
      const storedOtp = sessionStorage.getItem('lastHope_signup_otp');
      const expiry = sessionStorage.getItem('lastHope_signup_otp_expiry');

      if (!storedOtp || !expiry) throw new Error('No active OTP found. Please request a new one.');
      if (Date.now() > parseInt(expiry)) throw new Error('OTP has expired.');
      if (otpInput !== storedOtp) throw new Error('Invalid OTP.');

      // OTP valid, cleanup
      sessionStorage.removeItem('lastHope_signup_otp');
      sessionStorage.removeItem('lastHope_signup_otp_expiry');

      // Update Auth Display Name so it's always accessible
      try {
        await updateProfile(user, { displayName: fullname });
      } catch (profileErr) {
        console.warn("Could not update auth display name:", profileErr);
      }

      // 2. Save profile in Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          fullname,
          email,
          rollno,
          stream,
          college,
          semester,
          role: 'Student',
          photoBase64: preview || null,
          createdAt: new Date().toISOString()
        })
      } catch (dbErr) {
        console.warn("Could not save user profile to Firestore, falling back to local storage:", dbErr);
      }

      if (stream) localStorage.setItem('lastHopeStudentStream', stream)
      if (college) localStorage.setItem('lastHopeStudentCollege', college)
      if (semester) localStorage.setItem('lastHopeStudentSemester', semester)
      localStorage.setItem('lastHopeRole', 'Student')

      // Send Welcome Email via backend or direct
      try {
        const subject = "Welcome to Last Hope!";
        const html = `<h2>Welcome, ${fullname}!</h2>
                   <p>You have successfully registered on the Last Hope platform.</p>
                   <p><strong>Stream:</strong> ${stream || 'Not provided'}</p>
                   <p><strong>College:</strong> ${college || 'Not provided'}</p>
                   <p><strong>Semester:</strong> ${semester || 'Not provided'}</p>
                   <br/>
                   <p>Log in to access your dashboard and courses.</p>`;

        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const resp = await fetch(`${apiUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: email, subject, html })
          });
          if (!resp.ok) throw new Error("Backend unavailable");
        } catch (e) {
          await sendDirectEmail(email, subject, html);
        }
      } catch (emailErr) {
        console.warn('Failed to send welcome email:', emailErr);
      }

      setLoading(false)
      setSent(true)
      setShowOtp(false)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (err) {
      setLoading(false)
      alert("Error: " + err.message)
    }
  }

  const activeCollegeObj = colleges.find(c => c.name === college)
  const activeVideoUrl = activeCollegeObj ? activeCollegeObj.videoUrl : ''

  const renderBackgroundVideo = () => {
    if (!activeVideoUrl || !bgVideoEnabled) return null;

    const ytId = extractYouTubeId(activeVideoUrl);
    if (ytId) {
      return (
        <div className="fixed inset-0 z-[-35] w-full h-full overflow-hidden">
          <iframe
            className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playsinline=1&fs=0&iv_load_policy=3&vq=hd2160&hd=1`}
            frameBorder="0"
            allow="autoplay; encrypted-media"
          />
          <div className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto" />
        </div>
      );
    }

    const driveId = extractGoogleDriveId(activeVideoUrl);
    if (driveId) {
      return (
        <div className="fixed inset-0 z-[-35] w-full h-full overflow-hidden pointer-events-none">
          <video
            src={`https://drive.google.com/uc?export=download&id=${driveId}`}
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            className="absolute top-1/2 left-1/2 w-full h-full object-cover -translate-x-1/2 -translate-y-1/2 opacity-80 pointer-events-none"
          />
        </div>
      );
    }

    const isImage = /\.(jpeg|jpg|gif|png|webp|avif|svg)(?:\?.*)?$/i.test(activeVideoUrl) || activeVideoUrl.includes('unsplash.com') || activeVideoUrl.includes('images.pexels');
    if (isImage) {
      return (
        <div className="fixed inset-0 z-[-35] w-full h-full overflow-hidden pointer-events-none">
          <img
            src={activeVideoUrl}
            className="absolute top-0 left-0 w-full h-full object-cover"
            alt="College Background"
          />
        </div>
      );
    }

    const instaMatch = activeVideoUrl.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
    if (instaMatch) {
      return (
        <div className="fixed inset-0 z-[-35] w-full h-full overflow-hidden pointer-events-none bg-black">
          <iframe
            className="absolute top-1/2 left-1/2 w-[100vw] h-[100vh] sm:w-[100vw] sm:h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2"
            src={`https://www.instagram.com/reel/${instaMatch[1]}/embed/?autoplay=1`}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[-35] w-full h-full overflow-hidden pointer-events-none">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          src={activeVideoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8">
      {renderBackgroundVideo()}

      {/* Ambient blobs on top of video */}
      <div ref={blob1Ref} className="fixed top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none z-[-1] mix-blend-screen" style={{ background: 'rgba(45,212,191,0.15)' }} />
      <div ref={blob2Ref} className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none z-[-1] mix-blend-screen" style={{ background: 'rgba(56,189,248,0.1)' }} />

      {/* ── Big Stylish Text (No Background) ──────────────── */}
      <div className={`hidden lg:block absolute top-[10%] left-[5%] lg:left-[10%] z-10 max-w-4xl transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.95]'
        } ease-out ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="inline-flex items-center gap-6 mb-6">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-teal-500/20 to-teal-500/5 border border-teal-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.2)]">
            <Icon name="school" filled size={40} className="text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter drop-shadow-2xl">Last Hope</h1>
        </div>
        <h2 className="text-7xl lg:text-[110px] leading-[0.95] font-black text-white tracking-tighter drop-shadow-2xl mb-8">
          Master your<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-100 to-sky-300 drop-shadow-lg">
            academic flow.
          </span>
        </h2>
        <div className="space-y-6 max-w-xl hidden md:block">
          {[
            { icon: 'verified', title: 'Structured Success', desc: 'Turn academic chaos into a clear, manageable path.' },
            { icon: 'speed', title: 'Fast Response', desc: 'Minimalist interface for high-stakes environments.' },
          ].map(({ icon, title, desc }, index) => {
            const delays = ['delay-[400ms]', 'delay-[600ms]'];
            return (
              <div key={title} className={`flex items-start gap-5 p-4 -mx-4 rounded-2xl transition-all duration-300 transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'} ${delays[index]}`}>
                <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Icon name={icon} className="text-teal-300" size={24} />
                </div>
                <div className="drop-shadow-lg">
                  <p className="font-bold text-white text-[20px] tracking-wide">{title}</p>
                  <p className="text-white/80 text-[16px] mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Form Section (Bottom Right) ──────────────────── */}
      <div className={`absolute bottom-0 right-0 md:bottom-8 md:right-8 z-20 w-full max-w-[420px] transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ease-out ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <main ref={cardRef} className="w-full max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] shadow-[0_16px_48px_rgba(0,0,0,0.8)] rounded-t-3xl md:rounded-3xl bg-black/20 backdrop-blur-2xl border border-white/10 ring-1 ring-white/5 relative group/main p-6 md:p-8">
          <div className="absolute inset-0 z-[-1] bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover/main:opacity-100 transition-opacity duration-1000 pointer-events-none" />

          <header className={`mb-8 transition-all duration-700 delay-300 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Create Account</h2>
            <p className="text-white/60 mt-1 text-[14px]">Enter your details to begin your academic flow.</p>
          </header>

          <form className="space-y-4" id="signupForm" onSubmit={handleSubmit}>
            {/* Avatar upload */}
            <div className={`flex flex-col items-center md:items-start mb-6 transition-all duration-700 delay-400 transform ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <label
                htmlFor="profile-upload"
                className="group relative w-20 h-20 rounded-full border-2 border-dashed border-white/20 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(250,204,21,0.2)] transition-all duration-500 cursor-pointer flex items-center justify-center overflow-hidden bg-black/20 backdrop-blur-md"
              >
                <input ref={fileRef} id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
                {preview ? (
                  <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="text-center transition-transform">
                    <Icon name="add_a_photo" className="text-white/50 group-hover:text-yellow-400 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 block mx-auto drop-shadow-md" size={24} />
                    <span className="text-[9px] font-bold text-white/50 group-hover:text-yellow-400 block mt-1 tracking-widest transition-colors duration-300">UPLOAD</span>
                  </div>
                )}
              </label>
            </div>

            {/* Grid fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', id: 'fullname', type: 'text', placeholder: 'John Doe' },
                { label: 'Email ID', id: 'email', type: 'email', placeholder: 'john@university.edu' },
                { label: 'Password', id: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Roll No', id: 'rollno', type: 'text', placeholder: '2024CS001' },
              ].map(({ label, id, type, placeholder }, index) => {
                const delays = ['delay-[500ms]', 'delay-[600ms]', 'delay-[700ms]', 'delay-[800ms]'];
                return (
                  <div key={id} className={`flex flex-col gap-1 transition-all duration-700 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${delays[index]}`}>
                    <label htmlFor={id} className="text-[12px] text-white/80 ml-1 font-medium tracking-wide">{label}</label>
                    <div className="relative group">
                      <input
                        id={id}
                        type={type}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 bg-white/5 hover:bg-yellow-400/10 focus:bg-yellow-400/10 border border-white/10 hover:border-yellow-400 focus:border-yellow-400 rounded-xl focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 text-white text-[14px] outline-none placeholder:text-white/30 backdrop-blur-md shadow-inner"
                      />
                    </div>
                  </div>
                );
              })}

              {/* College Selection */}
              <div className={`flex flex-col gap-1 sm:col-span-2 transition-all duration-700 delay-[900ms] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <label htmlFor="college" className="text-[12px] text-white/80 ml-1 font-medium tracking-wide">College / Institution</label>
                <div className="relative">
                  <select
                    id="college"
                    required
                    value={college}
                    onChange={e => handleCollegeChange(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/5 hover:bg-yellow-400/10 focus:bg-yellow-400/10 border border-white/10 hover:border-yellow-400 focus:border-yellow-400 rounded-xl focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 text-[14px] outline-none appearance-none cursor-pointer backdrop-blur-md shadow-inner [&>option]:bg-[#0f172a] [&>option]:text-white ${college ? 'text-white font-medium' : 'text-white/30'
                      }`}
                  >
                    <option value="" disabled className="text-white/40">Select College / Institution</option>
                    {colleges.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <Icon name="expand_more" size={18} />
                  </div>
                </div>
              </div>

              {/* Semester */}
              <div className={`flex flex-col gap-1 transition-all duration-700 delay-[1000ms] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <label htmlFor="semester" className="text-[12px] text-white/80 ml-1 font-medium tracking-wide">Semester</label>
                <div className="relative">
                  <select
                    id="semester"
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/5 hover:bg-yellow-400/10 focus:bg-yellow-400/10 border border-white/10 hover:border-yellow-400 focus:border-yellow-400 rounded-xl focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 text-[14px] outline-none appearance-none cursor-pointer backdrop-blur-md shadow-inner [&>option]:bg-[#0f172a] [&>option]:text-white ${semester ? 'text-white font-medium' : 'text-white/30'
                      }`}
                  >
                    <option value="" disabled className="text-white/40">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n}>Semester {n}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <Icon name="expand_more" size={18} />
                  </div>
                </div>
              </div>

              {/* Stream */}
              <div className={`flex flex-col gap-1 transition-all duration-700 delay-[1100ms] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <label htmlFor="stream" className="text-[12px] text-white/80 ml-1 font-medium tracking-wide">Stream</label>
                <div className="relative">
                  <select
                    id="stream"
                    required
                    value={stream}
                    onChange={e => setStream(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/5 hover:bg-yellow-400/10 focus:bg-yellow-400/10 border border-white/10 hover:border-yellow-400 focus:border-yellow-400 rounded-xl focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 text-[14px] outline-none appearance-none cursor-pointer backdrop-blur-md shadow-inner [&>option]:bg-[#0f172a] [&>option]:text-white ${stream ? 'text-white font-medium' : 'text-white/30'
                      }`}
                  >
                    <option value="" disabled className="text-white/40">Select Stream</option>
                    {['Computer Science', 'Information Technology', 'Mechanical Engineering', 'Electronics & Comm.', 'Civil Engineering'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <Icon name="expand_more" size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className={`flex items-start gap-3 py-2 transition-all duration-700 delay-[1200ms] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="relative flex items-center pt-0.5">
                <input id="terms" type="checkbox" required className="peer appearance-none w-4 h-4 rounded-sm border border-white/20 bg-white/5 checked:bg-teal-500 checked:border-teal-500 focus:ring-2 focus:ring-teal-500/30 transition-all cursor-pointer shadow-inner" />
                <Icon name="check" size={12} className="absolute left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-200" />
              </div>
              <label htmlFor="terms" className="text-[12px] text-white/60 leading-relaxed cursor-pointer select-none">
                By signing up, you agree to our{' '}
                <a href="#" className="text-teal-300 hover:text-teal-200 transition-colors underline decoration-teal-500/30 underline-offset-4">Terms of Service</a> and{' '}
                <a href="#" className="text-teal-300 hover:text-teal-200 transition-colors underline decoration-teal-500/30 underline-offset-4">Privacy Policy</a>.
              </label>
            </div>

            {/* Submit */}
            <div className={`pt-2 transition-all duration-700 delay-[1300ms] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <button
                type="submit"
                disabled={loading || sent}
                className={`group relative w-full h-12 flex items-center justify-center gap-3 rounded-xl text-white font-bold text-[15px] overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${sent ? 'bg-teal-600' : 'bg-white/10 border border-white/10 hover:border-yellow-400/50 hover:bg-yellow-400/20 hover:text-yellow-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.3)]'}`}
              >
                {!sent && !loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                )}

                {loading ? (
                  <>
                    <Icon name="sync" className="animate-spin text-yellow-400" />
                    <span className="text-white/90">Processing…</span>
                  </>
                ) : sent ? (
                  <>
                    <Icon name="check_circle" className="text-white animate-bounce-short" size={20} />
                    <span>OTP Sent!</span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wide">Create Account</span>
                    <Icon name="arrow_forward" className="text-yellow-400 group-hover:translate-x-1.5 transition-transform duration-300" size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <footer className={`mt-6 pt-4 border-t border-white/10 text-center transition-all duration-700 delay-[1400ms] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-white/60 text-[13px]">
              Already have an account?{' '}
              <Link to="/login" className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors underline decoration-2 decoration-yellow-400/30 underline-offset-4">Login here</Link>
            </p>
          </footer>
        </main>
      </div>

      {/* OTP Modal Overlay */}
      {showOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-teal-500/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="mark_email_read" size={32} className="text-teal-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Verify Email</h3>
            <p className="text-sm text-white/60 mb-6">
              We've sent a 6-digit OTP to <br />
              <strong className="text-teal-300">{tempUserData?.email}</strong>
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <input
                  type="text"
                  maxLength="6"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-white/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpInput.length !== 6}
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Icon name="sync" className="animate-spin" /> : <Icon name="check_circle" />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <button
              onClick={() => { setShowOtp(false); setOtpInput(''); }}
              className="mt-6 text-sm text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Floating Video Toggle Button */}
      <button
        onClick={() => setBgVideoEnabled(!bgVideoEnabled)}
        className={`fixed bottom-4 left-4 z-[100] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${bgVideoEnabled ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] hover:bg-yellow-300' : 'bg-white/10 text-white/50 border border-white/20 hover:bg-white/20 backdrop-blur-md'}`}
        title={bgVideoEnabled ? 'Turn Off Background Video' : 'Turn On Background Video'}
      >
        <Icon name={bgVideoEnabled ? 'videocam' : 'videocam_off'} size={24} />
      </button>
    </div>
  )
}
