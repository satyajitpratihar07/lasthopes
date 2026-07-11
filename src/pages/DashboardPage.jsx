import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { db, auth } from '../firebase'
import defaultColleges from '../data/collegeVideoLinks.json'
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged, updateEmail, updatePassword } from 'firebase/auth'
import DraggablePiP from '../components/DraggablePiP'
import StudentGradeCalculator from '../components/StudentGradeCalculator'
import ChatBot from '../components/ChatBot'

const sendDirectEmail = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const send = () => {
      window.Email.send({
        Host: 'smtp.gmail.com',
        Username: 'orbiplatform@gmail.com',
        Password: 'vyof mngp wxxh ctyc',
        To: to,
        From: 'orbiplatform@gmail.com',
        Subject: subject,
        Body: html
      }).then(msg => msg === 'OK' ? resolve() : reject(new Error(msg))).catch(reject);
    };
    if (window.Email) return send();
    const script = document.createElement('script');
    script.src = 'https://smtpjs.com/v3/smtp.js';
    script.onload = send;
    script.onerror = () => reject(new Error('SMTP.js load failed'));
    document.head.appendChild(script);
  });
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-900/50 border border-red-500 rounded-xl text-white">
          <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
          <pre className="text-xs overflow-auto bg-black/50 p-4 rounded">{this.state.error && this.state.error.toString()}</pre>
          <pre className="text-xs overflow-auto bg-black/50 p-4 rounded mt-2">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to extract YouTube ID for thumbnails
const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:v=|v\/|vi\/|youtu\.be\/|embed\/|live\/|shorts\/)([\w-]{11})/i);
  return match ? match[1] : null;
}

// Helper to extract Google Drive File ID for embedding
const extractGoogleDriveId = (url) => {
  if (!url) return null;
  const regExp = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/(?:file\/d\/|open\?id=))([\w-]{25,})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const engineeringClasses = [
  'Computer Science',
  'Information Technology',
  'Mechanical Engineering',
  'Electronics & Comm.',
  'Civil Engineering'
]

const DEFAULT_COURSES = [
  {
    id: 1,
    title: 'Introduction to Data Structures',
    className: 'Computer Science',
    semester: 'Semester 3',
    subject: 'Data Structures',
    module: 'Module 1',
    description: 'Learn the fundamentals of arrays, linked lists, trees, and graphs.',
    url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
    thumbnail: 'https://img.youtube.com/vi/RBSGKlAvoiM/hqdefault.jpg'
  }
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const role = localStorage.getItem('lastHopeRole') || 'Student'
  const [mounted, setMounted] = useState(false)
  const [bgVideoEnabled, setBgVideoEnabled] = useState(() => {
    const saved = localStorage.getItem('lastHopeBgVideo');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('lastHopeBgVideo', JSON.stringify(bgVideoEnabled));
  }, [bgVideoEnabled]);

  const [activeTab, setActiveTab] = useState(role === 'Admin' ? 'Overview' : 'Overview')
  const [unlockingCourse, setUnlockingCourse] = useState(null)
  const [showDemoList, setShowDemoList] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState(null)

  // Sidebar expanded state
  const [expandedNav, setExpandedNav] = useState(null)
  const [expandedClass, setExpandedClass] = useState(null)
  const [expandedSemester, setExpandedSemester] = useState(null)

  // Filter state
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedModule, setSelectedModule] = useState(null)

  // QR Code Modal State
  const [showQrModal, setShowQrModal] = useState(null)

  // Payment Upload Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentName, setPaymentName] = useState('')
  const [paymentScreenshot, setPaymentScreenshot] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState(null)

  // User Profile State
  const [currentUserProfile, setCurrentUserProfile] = useState({ fullname: '', photoBase64: '' })

  // Current user logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUserProfile({
              fullname: data.fullname || user.displayName || '',
              photoBase64: data.photoBase64 || ''
            });
          } else {
            setCurrentUserProfile({
              fullname: user.displayName || '',
              photoBase64: ''
            });
          }
        } catch (err) {
          console.warn("Failed to fetch user profile from Firestore, using auth display name fallback:", err);
          setCurrentUserProfile({
            fullname: user.displayName || '',
            photoBase64: ''
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);
  const [approvingCourseId, setApprovingCourseId] = useState(null)
  const [requestedDuration, setRequestedDuration] = useState(1)
  const [playingVideo, setPlayingVideo] = useState(null)
  const [pipVideo, setPipVideo] = useState(null)

  // Profile Settings Modal State
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileFormData, setProfileFormData] = useState({ name: '', photoBase64: '', email: '', password: '' })
  const [profileEditMode, setProfileEditMode] = useState(null)
  const [profileOtpStep, setProfileOtpStep] = useState(false)
  const [profileOtpCode, setProfileOtpCode] = useState('')
  const [profileIsLoading, setProfileIsLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [rateLimitStatus, setRateLimitStatus] = useState({ count: 0, text: '' })

  const handleOpenProfileModal = async () => {
    setProfileFormData({
      name: currentUserProfile.fullname || '',
      photoBase64: currentUserProfile.photoBase64 || '',
      email: auth.currentUser?.email || '',
      password: ''
    })
    setProfileError('')
    setProfileSuccess('')
    setProfileEditMode(null)
    setProfileOtpStep(false)
    setShowProfileModal(true)

    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const changes = userDoc.data().sensitiveChanges || [];
          const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
          const recent = changes.filter(t => t > fifteenDaysAgo);
          setRateLimitStatus({
            count: recent.length,
            text: `Rate Limit: ${recent.length}/5 sensitive changes used in the last 15 days.`
          })
        }
      } catch (err) {
        console.warn("Could not check profile rate limit:", err);
      }
    }
  }

  const checkRateLimit = async () => {
    if (!auth.currentUser) return false;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return true;

      const data = userDoc.data();
      const changes = data.sensitiveChanges || [];
      const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
      const recentChanges = changes.filter(t => t > fifteenDaysAgo);

      if (recentChanges.length >= 5) {
        setProfileError('Rate limit exceeded: You can only change sensitive info 5 times every 15 days.');
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Could not verify rate limit from Firestore, allowing update by default:", err);
      return true;
    }
  };



  const handleSendOtp = async (mode) => {
    setProfileError('');
    setProfileSuccess('');
    setProfileIsLoading(true);

    try {
      const allowed = await checkRateLimit();
      if (!allowed) {
        setProfileIsLoading(false);
        return;
      }
      if (mode === 'email' && profileFormData.email === auth.currentUser?.email) {
        setProfileError('Please enter a new email address.');
        setProfileIsLoading(false);
        return;
      }
      if (mode === 'password' && !profileFormData.password) {
        setProfileError('Please enter a new password.');
        setProfileIsLoading(false);
        return;
      }

      // Generate OTP locally
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('lastHope_dashboard_otp', otp);
      sessionStorage.setItem('lastHope_dashboard_otp_expiry', Date.now() + 5 * 60 * 1000);

      // Send Email via SMTPJS
      const targetEmail = auth.currentUser.email;

      const emailBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f4f7f6; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Last Hope</h1>
          </div>
          <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
            <h2 style="color: #1e293b; font-size: 22px; margin-top: 0; margin-bottom: 10px;">Verify your request</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 35px;">
              Please use the verification code below to authorize your profile change.
            </p>
            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 auto; max-width: 250px;">
              <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0f172a; display: block; margin-left: 6px;">${otp}</span>
            </div>
          </div>
        </div>
      `;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetEmail,
            subject: "Your Verification Code - Last Hope",
            html: emailBody
          })
        });

        const data = await response.json();

        if (data.success) {
          setProfileEditMode(mode);
          setProfileOtpStep(true);
        } else {
          throw new Error(data.error || "Failed to send email via backend.");
        }
      } catch (emailErr) {
        console.warn("Backend email service error, attempting direct SMTP.js fallback:", emailErr);
        try {
          await sendDirectEmail(targetEmail, "Your Verification Code - Last Hope", emailBody);
          setProfileEditMode(mode);
          setProfileOtpStep(true);
        } catch (directErr) {
          console.warn("Direct SMTP failed:", directErr);
          // Fallback if completely offline
          alert(`Notice (Fallback): Your Dashboard OTP is ${otp}`);
          setProfileEditMode(mode);
          setProfileOtpStep(true);
        }
      }
    } catch (err) {
      setProfileError(err.message || 'An error occurred.');
    } finally {
      setProfileIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileIsLoading(true);
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          fullname: profileFormData.name,
          photoBase64: profileFormData.photoBase64
        });
        setCurrentUserProfile(prev => ({ ...prev, fullname: profileFormData.name, photoBase64: profileFormData.photoBase64 }));
        setProfileSuccess('Profile updated successfully.');
        setTimeout(() => setShowProfileModal(false), 2000);
      }
    } catch (err) {
      setProfileError(err.message || 'An error occurred.');
    } finally {
      setProfileIsLoading(false);
    }
  };

  const handleProfileOtpVerify = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileIsLoading(true);

    try {
      // Local OTP verification
      const storedOtp = sessionStorage.getItem('lastHope_dashboard_otp');
      const expiry = sessionStorage.getItem('lastHope_dashboard_otp_expiry');

      if (!storedOtp || !expiry) throw new Error('No active OTP found. Please request a new one.');
      if (Date.now() > parseInt(expiry)) throw new Error('OTP has expired.');
      if (profileOtpCode !== storedOtp) throw new Error('Invalid OTP.');

      // OTP is valid! Apply the change
      sessionStorage.removeItem('lastHope_dashboard_otp');
      sessionStorage.removeItem('lastHope_dashboard_otp_expiry');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      let sensitiveChanges = userDoc.exists() ? (userDoc.data().sensitiveChanges || []) : [];
      const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
      sensitiveChanges = sensitiveChanges.filter(t => t > fifteenDaysAgo);

      if (profileEditMode === 'email') {
        await updateEmail(auth.currentUser, profileFormData.email);
        await updateDoc(userRef, { email: profileFormData.email });
      } else if (profileEditMode === 'password') {
        await updatePassword(auth.currentUser, profileFormData.password);
      }

      sensitiveChanges.push(Date.now());
      await updateDoc(userRef, { sensitiveChanges });

      setProfileSuccess(`${profileEditMode === 'email' ? 'Email' : 'Password'} updated successfully.`);
      setTimeout(() => {
        setProfileOtpStep(false);
        setProfileEditMode(null);
        setProfileOtpCode('');
        setProfileFormData(p => ({ ...p, password: '' }));
      }, 2000);

    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setProfileError('Security required: Please log out and log back in to change your email/password.');
      } else {
        setProfileError(err.message || 'Verification failed.');
      }
    } finally {
      setProfileIsLoading(false);
    }
  };

  // Persist Courses to LocalStorage
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('lastHopeCourses')
    return saved ? JSON.parse(saved) : DEFAULT_COURSES
  })

  // Persist Access Status { [courseId]: 'locked' | 'pending' | 'approved' }
  const [courseAccess, setCourseAccess] = useState(() => {
    const saved = localStorage.getItem('lastHopeCourseAccess')
    return saved ? JSON.parse(saved) : {}
  })

  // Admin QR Code & Pricing
  const [adminQrCode, setAdminQrCode] = useState(() => {
    return localStorage.getItem('lastHopeAdminQrCode') || null;
  });
  const [originalPrice, setOriginalPrice] = useState(() => {
    return localStorage.getItem('lastHopeOriginalPrice') || '199';
  });
  const [offerPrice, setOfferPrice] = useState(() => {
    return localStorage.getItem('lastHopeOfferPrice') || '99';
  });

  // Student Features State
  const [timerTime, setTimerTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('lastHopeTodos');
    return saved ? JSON.parse(saved) : [{ id: 1, text: 'Complete Assignment 1', done: false }, { id: 2, text: 'Review Data Structures', done: true }];
  });
  const [newTodo, setNewTodo] = useState('');
  const [gameBoard, setGameBoard] = useState(Array(9).fill(null));

  const [scheduleData, setScheduleData] = useState(() => {
    const saved = localStorage.getItem('lastHopeSchedule');
    return saved ? JSON.parse(saved) : [
      { id: 1, day: 'Monday', time: '09:00 AM - 10:30 AM', subject: 'Database Management Systems', type: 'Lecture', room: 'Room 304' },
      { id: 2, day: 'Monday', time: '11:00 AM - 12:30 PM', subject: 'Software Engineering', type: 'Lab', room: 'Lab 2' },
      { id: 3, day: 'Tuesday', time: '10:00 AM - 11:30 AM', subject: 'Data Structures', type: 'Lecture', room: 'Room 102' },
      { id: 4, day: 'Wednesday', time: '09:00 AM - 11:00 AM', subject: 'Computer Networks', type: 'Lecture', room: 'Room 401' },
      { id: 5, day: 'Wednesday', time: '02:00 PM - 04:00 PM', subject: 'Database Management Systems', type: 'Lab', room: 'Lab 1' },
      { id: 6, day: 'Thursday', time: '11:00 AM - 12:30 PM', subject: 'Operating Systems', type: 'Lecture', room: 'Room 205' },
      { id: 7, day: 'Friday', time: '10:00 AM - 12:00 PM', subject: 'Data Structures', type: 'Lab', room: 'Lab 3' },
    ];
  });
  const [editingScheduleItem, setEditingScheduleItem] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [gameXIsNext, setGameXIsNext] = useState(true);

  // Dynamic Features State (Managed by Admin)
  const [roadmapStages, setRoadmapStages] = useState(() => {
    const saved = localStorage.getItem('lastHopeRoadmap');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Foundation', status: 'completed' },
      { id: 2, title: 'Core Subjects', status: 'completed' },
      { id: 3, title: 'Advanced Concepts', status: 'current' },
      { id: 4, title: 'Projects', status: 'upcoming' },
      { id: 5, title: 'Placement Prep', status: 'upcoming' },
    ];
  });

  const [gateSubjects, setGateSubjects] = useState(() => {
    const saved = localStorage.getItem('lastHopeGateSubjects');
    return saved ? JSON.parse(saved) : [
      'Data Structures & Algorithms',
      'Operating Systems',
      'Computer Networks',
      'Database Management Systems',
      'Theory of Computation'
    ];
  });

  const [collegeUpdates, setCollegeUpdates] = useState(() => {
    const saved = localStorage.getItem('lastHopeUpdates');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'End Semester Examination Dates Announced', content: 'The final examinations for the Fall 2026 semester will commence from December 5th. Detailed timetables will be emailed shortly.', urgency: 'URGENT', time: '2 hours ago' },
      { id: 2, title: 'Tech Fest \'26 Registration Open', content: 'Register now for the annual technology festival. Events include hackathons, coding challenges, and robotics competitions. Huge prizes to be won!', urgency: 'NORMAL', time: '1 day ago' },
      { id: 3, title: 'Campus Placement Drive: Google & Microsoft', content: 'Pre-placement talks for final year students will be held in the main auditorium this Friday at 10 AM. Mandatory attendance for eligible students.', urgency: 'NORMAL', time: '3 days ago' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('lastHopeSchedule', JSON.stringify(scheduleData));
  }, [scheduleData]);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime(time => time - 1);
      }, 1000);
    } else if (timerTime === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  // Sync Admin Data across multiple tabs/windows
  useEffect(() => {
    const handleStorage = () => {
      const savedUpdates = localStorage.getItem('lastHopeUpdates');
      if (savedUpdates) setCollegeUpdates(JSON.parse(savedUpdates));

      const savedRoadmap = localStorage.getItem('lastHopeRoadmap');
      if (savedRoadmap) setRoadmapStages(JSON.parse(savedRoadmap));

      const savedGate = localStorage.getItem('lastHopeGateSubjects');
      if (savedGate) setGateSubjects(JSON.parse(savedGate));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem('lastHopeUpdates', JSON.stringify(collegeUpdates));
  }, [collegeUpdates]);

  const handleSavePrices = async () => {
    try {
      localStorage.setItem('lastHopeOriginalPrice', originalPrice);
      localStorage.setItem('lastHopeOfferPrice', offerPrice);
      await setDoc(doc(db, 'settings', 'payment'), { originalPrice, offerPrice }, { merge: true });
    } catch (e) {
      console.warn("Could not save prices", e);
    }
  };

  const handleAdminQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 600;
          if (width > height && width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setAdminQrCode(compressedDataUrl);
          try {
            localStorage.setItem('lastHopeAdminQrCode', compressedDataUrl);
            setDoc(doc(db, 'settings', 'payment'), { adminQrCode: compressedDataUrl }, { merge: true });
          } catch (err) {
            console.error('Failed to save QR code to localStorage/Firebase:', err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    localStorage.setItem('lastHopeCourses', JSON.stringify(courses))
  }, [courses])

  useEffect(() => {
    localStorage.setItem('lastHopeCourseAccess', JSON.stringify(courseAccess))
  }, [courseAccess])

  // Sync state across tabs and Firebase
  useEffect(() => {
    // 1. Setup Firebase Listener for Courses
    const unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const firebaseCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setCourses(firebaseCourses)
      localStorage.setItem('lastHopeCourses', JSON.stringify(firebaseCourses))
    }, (error) => {
      console.warn("Firestore access denied or uninitialized. Falling back to Local Storage.", error.message)
    })

    // 2. Setup Firebase Listener for Access requests
    const unsubscribeAccess = onSnapshot(collection(db, 'courseAccess'), (snapshot) => {
      let accessMap = {}
      const currentRole = localStorage.getItem('lastHopeRole')

      snapshot.docs.forEach(doc => {
        const data = doc.data();

        // Auto-delete screenshots older than 15 days to save DB space
        if (data.status === 'approved' && data.approvedAt && data.screenshot) {
          const daysOld = (Date.now() - data.approvedAt) / (1000 * 60 * 60 * 24);
          if (daysOld >= 15) {
            const { screenshot, ...rest } = data;

            // Only the Admin actually runs the deletion on the database to prevent write conflicts
            if (currentRole === 'Admin' || currentRole === 'admin') {
              setDoc(doc.ref, rest).catch(() => { });
            }

            accessMap[doc.id] = rest;
            return;
          }
        }

        accessMap[doc.id] = data;
      })
      setCourseAccess(accessMap)
      localStorage.setItem('lastHopeCourseAccess', JSON.stringify(accessMap))
    }, (error) => { })

    // 3. Setup Firebase Listener for Admin QR Code (Settings)
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'payment'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.adminQrCode) {
          setAdminQrCode(data.adminQrCode);
          localStorage.setItem('lastHopeAdminQrCode', data.adminQrCode);
        }
        if (data.originalPrice) {
          setOriginalPrice(data.originalPrice);
          localStorage.setItem('lastHopeOriginalPrice', data.originalPrice);
        }
        if (data.offerPrice) {
          setOfferPrice(data.offerPrice);
          localStorage.setItem('lastHopeOfferPrice', data.offerPrice);
        }
      }
    }, (error) => {
      console.warn("Could not load settings from Firebase", error.message);
    });

    // 5. Setup Firebase Listener for Colleges
    const unsubscribeColleges = onSnapshot(doc(db, 'settings', 'colleges'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.list) {
          setColleges(data.list);
          localStorage.setItem('lastHopeCollegesList', JSON.stringify(data.list));
        }
      }
    }, (error) => {
      console.warn("Could not load colleges from Firebase", error.message);
    });

    // 4. Local Storage cross-tab sync as fallback
    const handleStorageChange = (e) => {
      if (e.key === 'lastHopeCourses') {
        try { setCourses(JSON.parse(e.newValue) || DEFAULT_COURSES) } catch (err) { }
      }
      if (e.key === 'lastHopeCourseAccess') {
        try { setCourseAccess(JSON.parse(e.newValue) || {}) } catch (err) { }
      }
      if (e.key === 'lastHopeCollegesList') {
        try { setColleges(JSON.parse(e.newValue) || []) } catch (err) { }
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      unsubscribeCourses()
      unsubscribeAccess()
      unsubscribeSettings()
      unsubscribeColleges()
    }
  }, [])

  // Form State for adding a course
  const [newCourse, setNewCourse] = useState({
    url: '', title: '', subject: '', module: '', className: '', semester: '', description: '', isLocked: true, college: ''
  })

  // College management states
  const [colleges, setColleges] = useState(() => {
    const saved = localStorage.getItem('lastHopeCollegesList')
    return saved ? JSON.parse(saved) : defaultColleges;
  })
  const [showAddCollegeInput, setShowAddCollegeInput] = useState(false)
  const [newCollegeName, setNewCollegeName] = useState('')
  const [collegeInputName, setCollegeInputName] = useState('')
  const [selectedVideoFile, setSelectedVideoFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [adminPreviewCollege, setAdminPreviewCollege] = useState(() => {
    return localStorage.getItem('lastHopeAdminPreviewCollege') || ''
  })

  // Inactivity check removed as requested

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('lastHopeRole')
    navigate('/login')
  }

  const isAdmin = role === 'Admin'

  // Theme variables based on role
  const theme = {
    bg: isAdmin ? 'bg-[#060d1a]/85 backdrop-blur-md' : 'bg-[#020617]/85 backdrop-blur-md',
    accent: isAdmin ? 'text-amber-400' : 'text-secondary-fixed-dim',
    accentBg: isAdmin ? 'bg-amber-500' : 'bg-secondary',
    accentGlow: isAdmin ? 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'shadow-[0_0_15px_rgba(107,216,203,0.3)]',
    border: isAdmin ? 'border-amber-500/20' : 'border-secondary/20',
    hoverBg: isAdmin ? 'hover:bg-amber-500/10' : 'hover:bg-secondary/10',
    gradient: isAdmin ? 'from-amber-600 to-amber-800' : 'from-secondary to-[#004d47]',
    inputFocus: isAdmin ? 'focus:border-amber-500/50 focus:ring-amber-500/50' : 'focus:border-secondary/50 focus:ring-secondary/50'
  }

  const navItems = isAdmin
    ? ['Overview', 'Students', 'Courses', 'System Logs', 'Payment Approvals', 'Roadmap', 'GATE Prep', 'College Update', 'SignUp Theme', 'Settings']
    : ['Overview', 'My Courses', 'Payment', 'Schedule', 'Grades', 'Timer', 'To-Do List', 'Roadmap', 'GATE Prep', 'Game', 'College Update', 'Feature Guide', 'Settings']

  // Count pending approvals for admin stats
  const pendingCount = Object.values(courseAccess).filter(data => data === 'pending' || data?.status === 'pending').length
  const uniqueStudentsCount = new Set(Object.values(courseAccess).map(data => data?.userName).filter(Boolean)).size;

  const stats = isAdmin ? [
    { label: 'Total Students', value: uniqueStudentsCount.toString(), icon: 'groups', trend: 'Active Users' },
    { label: 'Active Courses', value: courses.length.toString(), icon: 'menu_book', trend: 'Available' },
    { label: 'Pending Approvals', value: pendingCount.toString(), icon: 'payments', trend: pendingCount > 0 ? 'Requires Action' : 'All Clear' },
  ] : [
    { label: 'Current GPA', value: '3.8', icon: 'grade', trend: 'Top 10%' },
    { label: 'Pending Assignments', value: '4', icon: 'assignment_late', trend: 'Due soon' },
    { label: 'Credits Completed', value: '84', icon: 'task_alt', trend: 'On track' },
  ]

  const getIconForTab = (item) => {
    switch (item) {
      case 'Overview': return 'dashboard'
      case 'Courses': return 'menu_book'
      case 'Demo Uploads': return 'cloud_upload'
      case 'Payment': return 'payments'
      case 'Schedule': return 'calendar_month'
      case 'Grades': return 'military_tech'
      case 'Students': return 'group'
      case 'System Logs': return 'terminal'
      case 'Payment Approvals': return 'account_balance_wallet'
      case 'Timer': return 'timer'
      case 'To-Do List': return 'checklist'
      case 'Roadmap': return 'map'
      case 'GATE Prep': return 'school'
      case 'Game': return 'sports_esports'
      case 'College Update': return 'campaign'
      case 'SignUp Theme': return 'video_library'
      case 'Feature Guide': return 'help'
      default: return 'settings'
    }
  }

  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!newCourse.title || !newCourse.url || !newCourse.className || !newCourse.semester) return

    const videoId = extractYouTubeId(newCourse.url)
    const thumb = videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'

    const courseData = {
      ...newCourse,
      thumbnail: thumb,
      isDemo: activeTab === 'Demo Uploads'
    }

    try {
      if (editingCourseId) {
        setCourses(courses.map(c => c.id === editingCourseId ? { id: editingCourseId, ...courseData } : c))
        if (typeof editingCourseId === 'string') {
          await updateDoc(doc(db, 'courses', editingCourseId), courseData)
        }
      } else {
        const tempId = Date.now()
        setCourses([{ id: tempId, ...courseData }, ...courses])
        await addDoc(collection(db, 'courses'), courseData)
      }
    } catch (err) {
      console.warn("Could not save to Firebase. Saved locally only.", err.message)
    }

    setEditingCourseId(null)
    setNewCourse({ url: '', title: '', subject: '', module: '', className: '', semester: '', description: '', isLocked: true, college: '' })
  }

  const handleDeleteCourse = async (courseId) => {
    try {
      setCourses(courses.filter(c => c.id !== courseId))
      if (typeof courseId === 'string') {
        await deleteDoc(doc(db, 'courses', courseId))
      }
    } catch (err) {
      console.warn("Could not delete from Firebase.", err.message)
    }
  }

  const handleEditClick = (course) => {
    setNewCourse({
      title: course.title,
      description: course.description,
      url: course.url,
      className: course.className,
      semester: course.semester,
      subject: course.subject || '',
      module: course.module || '',
      isLocked: course.isLocked !== false, // Default to true if undefined
      college: course.college || ''
    })
    setEditingCourseId(course.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUnlockRequest = async (courseId, userName, screenshot, reqDuration) => {
    if (processing) return
    setProcessing(true)
    const requestId = `${courseId}_${userName}`
    localStorage.setItem('lastHopeUserName', userName)

    // Find course details to attach to request
    const course = courses.find(c => c.id === courseId) || {}

    const newRecord = {
      courseId,
      status: 'pending',
      userName,
      screenshot,
      requestedDuration: reqDuration,
      className: course.className || '',
      semester: course.semester || ''
    }

    // Optimistic Update
    setCourseAccess({ ...courseAccess, [requestId]: newRecord })
    try {
      // Save to Firebase
      await setDoc(doc(db, 'courseAccess', requestId), newRecord)
    } catch (err) {
      console.warn("Could not sync access to Firebase.", err)
    }
    setProcessing(false)
    setUnlockingCourse(null)
    setActiveTab('My Courses')
  }

  const handleApproveUnlock = async (requestId, durationMonths) => {
    const existing = courseAccess[requestId] || {};
    const newRecord = {
      ...existing,
      status: 'approved',
      approvedAt: Date.now(),
      durationMonths: durationMonths
    };

    // Optimistic Update
    setCourseAccess({ ...courseAccess, [requestId]: newRecord })
    try {
      // Save to Firebase
      await setDoc(doc(db, 'courseAccess', requestId), newRecord)
    } catch (err) {
      console.warn("Could not sync approval to Firebase.", err)
    }
    setApprovingCourseId(null);
  }

  const handleRejectPayment = async (requestId) => {
    const updated = { ...courseAccess }
    delete updated[requestId]
    setCourseAccess(updated)
    try {
      await deleteDoc(doc(db, 'courseAccess', requestId))
    } catch (err) {
      console.warn("Could not delete from Firebase.", err)
    }
  }

  const renderAdminRoadmap = () => {
    const handleAdd = () => {
      const newStage = { id: Date.now(), title: 'New Stage', status: 'upcoming' };
      const updated = [...roadmapStages, newStage];
      setRoadmapStages(updated);
      localStorage.setItem('lastHopeRoadmap', JSON.stringify(updated));
    };
    const handleDelete = (id) => {
      const updated = roadmapStages.filter(s => s.id !== id);
      setRoadmapStages(updated);
      localStorage.setItem('lastHopeRoadmap', JSON.stringify(updated));
    };
    const handleUpdate = (id, field, value) => {
      const updated = roadmapStages.map(s => s.id === id ? { ...s, [field]: value } : s);
      setRoadmapStages(updated);
      localStorage.setItem('lastHopeRoadmap', JSON.stringify(updated));
    };

    return (
      <div className="animate-fade-in max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-amber-400">Manage Roadmap</h2>
          <button onClick={handleAdd} className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-2">
            <Icon name="add" size={20} /> Add Stage
          </button>
        </div>
        <div className="space-y-4">
          {roadmapStages.map((stage, idx) => (
            <div key={stage.id} className="bg-[#060d1a] border border-amber-500/10 p-4 rounded-xl flex items-center gap-4">
              <span className="text-white/50 w-6 font-bold">{idx + 1}.</span>
              <input
                type="text"
                value={stage.title}
                onChange={(e) => handleUpdate(stage.id, 'title', e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 outline-none"
              />
              <select
                value={stage.status}
                onChange={(e) => handleUpdate(stage.id, 'status', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 outline-none [&>option]:bg-[#060d1a]"
              >
                <option value="completed">Completed</option>
                <option value="current">Current</option>
                <option value="upcoming">Upcoming</option>
              </select>
              <button onClick={() => handleDelete(stage.id)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg">
                <Icon name="delete" size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderAdminGatePrep = () => {
    const handleAdd = () => {
      const updated = [...gateSubjects, 'New Subject'];
      setGateSubjects(updated);
      localStorage.setItem('lastHopeGateSubjects', JSON.stringify(updated));
    };
    const handleDelete = (idx) => {
      const updated = gateSubjects.filter((_, i) => i !== idx);
      setGateSubjects(updated);
      localStorage.setItem('lastHopeGateSubjects', JSON.stringify(updated));
    };
    const handleUpdate = (idx, value) => {
      const updated = [...gateSubjects];
      updated[idx] = value;
      setGateSubjects(updated);
      localStorage.setItem('lastHopeGateSubjects', JSON.stringify(updated));
    };

    return (
      <div className="animate-fade-in max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-amber-400">Manage GATE Prep Subjects</h2>
          <button onClick={handleAdd} className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-2">
            <Icon name="add" size={20} /> Add Subject
          </button>
        </div>
        <div className="space-y-4">
          {gateSubjects.map((sub, idx) => (
            <div key={idx} className="bg-[#060d1a] border border-amber-500/10 p-4 rounded-xl flex items-center gap-4">
              <input
                type="text"
                value={sub}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 outline-none"
              />
              <button onClick={() => handleDelete(idx)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg">
                <Icon name="delete" size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderAdminCollegeUpdates = () => {
    const handleAdd = () => {
      const newUpdate = { id: Date.now(), title: 'New Update', content: 'Description here', urgency: 'NORMAL', time: 'Just now' };
      const updated = [newUpdate, ...collegeUpdates];
      setCollegeUpdates(updated);
      localStorage.setItem('lastHopeUpdates', JSON.stringify(updated));
    };
    const handleDelete = (id) => {
      const updated = collegeUpdates.filter(s => s.id !== id);
      setCollegeUpdates(updated);
      localStorage.setItem('lastHopeUpdates', JSON.stringify(updated));
    };
    const handleUpdate = (id, field, value) => {
      const updated = collegeUpdates.map(s => s.id === id ? { ...s, [field]: value } : s);
      setCollegeUpdates(updated);
      localStorage.setItem('lastHopeUpdates', JSON.stringify(updated));
    };

    return (
      <div className="animate-fade-in max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-amber-400">Manage College Updates</h2>
          <button onClick={handleAdd} className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-2">
            <Icon name="add" size={20} /> Post Update
          </button>
        </div>
        <div className="space-y-6">
          {collegeUpdates.map((update) => (
            <div key={update.id} className="bg-[#060d1a] border border-amber-500/10 p-6 rounded-xl space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={update.title}
                  onChange={(e) => handleUpdate(update.id, 'title', e.target.value)}
                  placeholder="Title"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-bold focus:border-amber-500/50 outline-none"
                />
                <select
                  value={update.urgency}
                  onChange={(e) => handleUpdate(update.id, 'urgency', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 outline-none [&>option]:bg-[#060d1a]"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="URGENT">URGENT</option>
                </select>
                <input
                  type="text"
                  value={update.time}
                  onChange={(e) => handleUpdate(update.id, 'time', e.target.value)}
                  placeholder="e.g. 2 hours ago"
                  className="w-32 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-amber-500/50 outline-none"
                />
                <button onClick={() => handleDelete(update.id)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg">
                  <Icon name="delete" size={20} />
                </button>
              </div>
              <textarea
                value={update.content}
                onChange={(e) => handleUpdate(update.id, 'content', e.target.value)}
                placeholder="Content..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderStudentDashboardOverview = () => {
    const currentUserName = localStorage.getItem('lastHopeUserName') || 'Natalia Niti';
    const enrolledCourses = courses.filter(course => {
      if (role === 'Admin') return true;
      if (course.isLocked === false) return true;
      if (!currentUserName) return false;
      const accessList = Object.values(courseAccess).filter(a => a?.userName === currentUserName);
      const isApproved = accessList.some(a =>
        a?.className === course.className &&
        a?.semester === course.semester &&
        (a?.status === 'approved' || a === 'approved')
      );
      if (isApproved) return true;
      const exactData = courseAccess[`${course.id}_${currentUserName}`];
      return (exactData?.status || exactData) === 'approved';
    });

    let totalCredits = 0;
    let totalProgress = 0;
    let completedCourses = 0;

    const courseStats = enrolledCourses.map(course => {
      const idString = String(course.id);
      let hash = 0;
      for (let i = 0; i < idString.length; i++) {
        hash = idString.charCodeAt(i) + ((hash << 5) - hash);
      }
      const numericId = Math.abs(hash);
      const credits = course.credits || (3 + (numericId % 2));
      const progressPercent = course.progress !== undefined ? course.progress : (20 + ((numericId * 37) % 80));

      totalCredits += credits;
      totalProgress += progressPercent;
      if (progressPercent > 90) completedCourses++;

      return { ...course, calculatedCredits: credits, calculatedProgress: progressPercent };
    });

    const avgProgress = courseStats.length > 0 ? Math.round(totalProgress / courseStats.length) : 0;
    const totalAssignments = courseStats.length > 0 ? courseStats.length * 4 : 40;
    const completedAssignments = courseStats.length > 0 ? Math.round((avgProgress / 100) * totalAssignments) : 34;
    const totalExams = courseStats.length > 0 ? courseStats.length : 5;
    const completedExams = courseStats.length > 0 ? completedCourses : 3;

    return (
      <div className="animate-fade-in bg-transparent text-white p-6 -mx-8 -mt-6 rounded-xl font-sans min-h-screen">

        {/* Top Navbar / Header area to match image strictly */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white tracking-wide">Dashboard Analytics</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="text" placeholder="Search" className="bg-[#212332] rounded-full py-2 pl-10 pr-6 text-sm text-white focus:outline-none w-64 border border-transparent focus:border-[#4d4d7a] transition-all" />
            </div>
            <div className="flex items-center gap-3">
              <button className="w-9 h-9 rounded-full bg-[#212332] flex items-center justify-center hover:bg-[#2d3042] transition-colors"><Icon name="mail" size={16} className="text-white/70" /></button>
              <button className="w-9 h-9 rounded-full bg-[#212332] flex items-center justify-center hover:bg-[#2d3042] transition-colors relative"><Icon name="notifications" size={16} className="text-white/70" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-500 rounded-full"></span></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left 3 columns */}
          <div className="xl:col-span-3 space-y-6">

            {/* TOP 4 CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { val: courseStats.length > 0 ? avgProgress : 85, color: '#8b5cf6', label: 'Assignments', amt: `${completedAssignments}/${totalAssignments}` },
                { val: courseStats.length > 0 ? Math.round((completedExams / totalExams) * 100) : 60, color: '#0ea5e9', label: 'Exams', amt: `${completedExams}/${totalExams}` },
                { val: courseStats.length > 0 ? Math.min(100, Math.round((totalCredits / 100) * 100)) : 75, color: '#ec4899', label: 'Credits Earned', amt: `${courseStats.length > 0 ? totalCredits : 85}/100` },
                { val: courseStats.length > 0 ? Math.max(0, 95 - (courseStats.length * 2)) : 95, color: '#f59e0b', label: 'Attendance', amt: `${courseStats.length > 0 ? Math.max(0, 95 - (courseStats.length * 2)) : 95}%` },
              ].map((c, i) => (
                <div key={i} className="bg-[#212332] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={c.color} strokeWidth="3" strokeDasharray={`${c.val * 0.94} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{c.val}%</div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{c.amt}</h3>
                    <p className="text-[11px] text-white/50">{c.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* MIDDLE CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line Chart */}
              <div className="bg-[#212332] rounded-2xl p-6 border border-white/5 relative min-h-[250px] overflow-hidden">
                <h3 className="text-sm font-semibold text-white/60 mb-8 text-center">Your GPA in 2023</h3>
                {/* Y Axis */}
                <div className="absolute left-6 top-16 bottom-12 flex flex-col justify-between text-[9px] text-white/30">
                  <span>4.0</span><span>3.5</span><span>3.0</span><span>2.5</span><span>2.0</span><span>1.5</span>
                </div>
                {/* Chart SVG */}
                <svg viewBox="0 0 500 200" className="w-full h-32 mt-4" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,150 Q40,150 60,110 T130,80 T200,40 T270,100 T340,30 T400,120 T500,40 L500,200 L0,200 Z" fill="url(#lineGrad)" />
                  <path d="M0,150 Q40,150 60,110 T130,80 T200,40 T270,100 T340,30 T400,120 T500,40" fill="none" stroke="#8b5cf6" strokeWidth="4" />

                  {/* Tooltip Point */}
                  <circle cx="340" cy="30" r="6" fill="#f59e0b" stroke="white" strokeWidth="2" />
                </svg>
                {/* Tooltip */}
                <div className="absolute top-[80px] left-[61%] transform -translate-x-1/2 bg-[#8b5cf6] px-2 py-1 rounded text-[10px] font-bold">
                  3.8 GPA
                </div>
                <div className="absolute top-[108px] left-[61%] w-[1px] h-20 bg-white/20 border-dashed" />

                {/* X Axis */}
                <div className="flex justify-between text-[10px] text-white/40 mt-4 ml-8">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>June</span><span>July</span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-[#212332] rounded-2xl p-6 border border-white/5 relative min-h-[250px]">
                <div className="flex justify-between items-center mb-8 px-4">
                  <h3 className="text-sm font-semibold text-white/60">Weekly Study Hours</h3>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ec4899]"></div> Target</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></div> Actual</span>
                  </div>
                </div>

                {/* Y Axis */}
                <div className="absolute left-6 top-16 bottom-12 flex flex-col justify-between text-[9px] text-white/30">
                  <span>40h</span><span>32h</span><span>24h</span><span>16h</span><span>8h</span><span>0h</span>
                </div>

                <div className="flex justify-between items-end h-32 ml-8 mr-2 relative z-10">
                  {[
                    { d: 'Mon', p1: 30, p2: 45 }, { d: 'Tue', p1: 60, p2: 80 }, { d: 'Wed', p1: 75, p2: 100 },
                    { d: 'Thu', p1: 55, p2: 70, active: true }, { d: 'Fri', p1: 20, p2: 30 }, { d: 'Sat', p1: 60, p2: 85 }, { d: 'Sun', p1: 50, p2: 65 }
                  ].map(b => (
                    <div key={b.d} className={`flex flex-col items-center w-[12%] relative ${b.active ? 'bg-white/5 rounded-full pb-2 -mx-1 pt-3 -mt-3' : 'pb-2'}`}>
                      <div className="flex gap-1.5 h-[100px] items-end w-full justify-center">
                        <div className="w-2.5 bg-[#ec4899] rounded-t-full" style={{ height: `${b.p1}%` }}></div>
                        <div className="w-2.5 bg-[#8b5cf6] rounded-t-full" style={{ height: `${b.p2}%` }}></div>
                      </div>
                      <span className="text-[10px] text-white/40 mt-3">{b.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTTOM ROW (Donut + Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut Chart */}
              <div className="bg-[#212332] rounded-2xl p-6 border border-white/5 flex flex-col justify-between min-h-[300px]">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-white/50">Credits</h3>
                    <span className="text-xl font-bold">{courseStats.length > 0 ? totalCredits : 85}</span>
                  </div>
                  <span className="text-[10px] text-white/30">From 100</span>
                </div>

                <div className="relative w-36 h-36 mx-auto my-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#333" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray={`${courseStats.length > 0 ? Math.min(100, totalCredits * 0.4) : 37.7} 251.2`} />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray={`${courseStats.length > 0 ? Math.min(100, totalCredits * 0.3) : 62.8} 251.2`} className="transform origin-center rotate-[54deg]" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ec4899" strokeWidth="12" strokeDasharray={`${courseStats.length > 0 ? Math.min(100, totalCredits * 0.3) : 113} 251.2`} className="transform origin-center rotate-[144deg]" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-3xl font-black">%{courseStats.length > 0 ? Math.min(100, Math.round((totalCredits / 100) * 100)) : 85}</div>
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white text-green-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">+12</div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-white/60 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Core</span>
                  <span className="text-[10px] text-white/60 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Elective</span>
                  <span className="text-[10px] text-white/60 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" /> Projects</span>
                </div>
              </div>

              {/* Table */}
              <div className="lg:col-span-2 bg-[#212332] rounded-2xl p-6 border border-white/5 overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-white/30 border-b border-white/5">
                      <th className="pb-4 font-normal">Course</th>
                      <th className="pb-4 font-normal">Subject</th>
                      <th className="pb-4 font-normal">Credits</th>
                      <th className="pb-4 font-normal">Progress</th>
                      <th className="pb-4 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    {(() => {
                      return courseStats.length > 0 ? (
                        courseStats.map((course) => {
                          const credits = course.calculatedCredits;
                          const progressPercent = course.calculatedProgress;
                          const isComplete = progressPercent > 90;
                          const statusText = isComplete ? 'Complete' : 'In Progress';
                          const statusColor = isComplete ? 'text-amber-500 bg-amber-500/10' : 'text-blue-500 bg-blue-500/10';

                          return (
                            <tr key={course.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                              <td className="py-4 text-white/90 max-w-[200px] truncate" title={course.title}>{course.title}</td>
                              <td className="py-4 text-white/60">{course.subject || 'General'}</td>
                              <td className="py-4">{credits}</td>
                              <td className="py-4 w-48 pr-6">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${isComplete ? 'bg-amber-500' : 'bg-blue-500'}`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-white/50 w-8">{progressPercent}%</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-semibold ${statusColor}`}>{statusText}</span>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-white/40">No courses enrolled yet. Explore the catalog!</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Calendar */}
            <div className="bg-[#212332] rounded-2xl p-6 border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">February 2022 <Icon name="expand_more" size={16} className="text-white/40" /></h3>
                <div className="flex gap-2">
                  <Icon name="arrow_upward" size={14} className="text-white/40 cursor-pointer hover:text-white" />
                  <Icon name="arrow_downward" size={14} className="text-white/40 cursor-pointer hover:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center text-xs">
                <div className="text-white/30 mb-2">S</div><div className="text-white/30 mb-2">M</div><div className="text-white/30 mb-2">T</div><div className="text-white/30 mb-2">W</div><div className="text-white/30 mb-2">T</div><div className="text-white/30 mb-2">F</div><div className="text-white/30 mb-2">S</div>
                <div className="text-white/30">30</div><div className="text-white/30">31</div><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div>
                <div>6</div><div>7</div><div>8</div><div>9</div><div>10</div><div>11</div><div className="text-white/30 border border-white/20 rounded-full w-6 h-6 flex items-center justify-center mx-auto">12</div>
                <div>13</div><div>14</div><div>15</div><div>16</div><div className="bg-[#8b5cf6] text-white font-bold rounded-full w-6 h-6 flex items-center justify-center mx-auto shadow-[0_0_8px_#8b5cf6]">17</div><div>18</div><div>19</div>
                <div>20</div><div>21</div><div>22</div><div>23</div><div>24</div><div>25</div><div>26</div>
                <div>27</div><div>28</div><div>29</div><div>30</div><div>1</div><div>2</div><div>3</div>
                <div>4</div><div>5</div><div>6</div><div>7</div><div>8</div><div>9</div><div>10</div>
              </div>
              <div className="mt-6 text-right">
                <span className="text-[#8b5cf6] text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">Today</span>
              </div>
            </div>

            {/* Trending */}
            <div className="bg-[#212332] rounded-2xl p-5 border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-white/80">Upcoming Deadlines</h3>
                <span className="text-[10px] text-teal-400 cursor-pointer hover:text-teal-300">See All</span>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Project Phase 1', sub: 'Data Structures', val: '2 Days', c: 'bg-blue-500/20 text-blue-400', i: 'assignment' },
                  { title: 'Midterm Exam', sub: 'Algorithms', val: '5 Days', c: 'bg-purple-500/20 text-purple-400', i: 'school' },
                  { title: 'Lab Report', sub: 'Networking', val: '1 Week', c: 'bg-teal-500/20 text-teal-400', i: 'science' }
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.c}`}><Icon name={t.i} size={18} /></div>
                      <div>
                        <p className="text-xs font-semibold">{t.title}</p>
                        <p className="text-[10px] text-white/40">{t.sub}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-400 flex items-center gap-0.5"><Icon name="schedule" size={14} /> {t.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#212332] rounded-2xl p-5 border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-white/80">Recent Activity</h3>
                <span className="text-[10px] text-teal-400 cursor-pointer hover:text-teal-300">See All</span>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Assignment Graded', sub: 'Web Dev - A-', val: '2h ago', c: 'bg-indigo-500/20 text-indigo-400', i: 'task_alt' },
                  { title: 'Course Material', sub: 'Databases Chapter 4', val: '5h ago', c: 'bg-blue-500/20 text-blue-400', i: 'menu_book' }
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.c}`}><Icon name={t.i} size={18} /></div>
                      <div>
                        <p className="text-xs font-semibold">{t.title}</p>
                        <p className="text-[10px] text-white/40">{t.sub}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-400 flex items-center gap-0.5"><Icon name="history" size={14} /> {t.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => {
    if (!isAdmin) {
      return renderStudentDashboardOverview()
    }

    const recentActivity = courses.slice(0, 3).map(c => ({
      text: `New course material added to Server: ${c.title}`,
      time: 'Recently by SuperAdmin'
    }));

    if (recentActivity.length === 0) {
      recentActivity.push({ text: 'System initialized. Ready for operations.', time: 'System Log' });
    }

    return (
      <div className="space-y-8 pb-20 animate-fade-in">
        {/* Welcome Banner */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${theme.gradient} p-8 border border-white/10 shadow-2xl transition-all duration-1000 delay-300 ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, Administrator!
            </h1>
            <p className="text-white/80 max-w-lg leading-relaxed">
              All systems are running smoothly. You have {pendingCount} pending payment approvals to review.
            </p>
            <button
              onClick={() => setActiveTab('approvals')}
              className="mt-6 px-6 py-2.5 bg-white text-black rounded-lg font-semibold text-sm hover:scale-105 transition-transform"
            >
              View Approvals
            </button>
          </div>
          <div className="absolute right-0 top-0 w-64 h-full overflow-hidden pointer-events-none">
            <div className="absolute right-[-20%] top-[-50%] w-64 h-64 bg-white/20 blur-3xl rounded-full" />
            <div className="absolute right-[20%] bottom-[-50%] w-48 h-48 bg-black/20 blur-2xl rounded-full" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`p-6 rounded-2xl bg-white/5 border border-white/10 premium-blur transition-all duration-700 hover:-translate-y-1`}
              style={{ transitionDelay: `${400 + i * 100}ms`, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
                  <Icon name={stat.icon} size={24} className={theme.accent} />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stat.trend === 'Requires Action' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/10 text-white/80'}`}>
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Section */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-1000 delay-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 premium-blur">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Icon name="history" size={20} className={theme.accent} />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-4 items-start p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                  <div className="w-2 h-2 mt-2 rounded-full bg-white/20" />
                  <div>
                    <p className="font-medium text-sm">
                      {activity.text}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 premium-blur flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className={`w-20 h-20 rounded-full ${theme.accentBg}/10 flex items-center justify-center mb-4 border ${theme.border} ${theme.accentGlow}`}>
              <Icon name="security_update_good" size={36} className={theme.accent} />
            </div>
            <h3 className="text-lg font-semibold mb-2">System is Secure</h3>
            <p className="text-sm text-white/50 max-w-xs">
              All security protocols are active. No anomalies detected in the last 30 days.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderAdminPaymentApprovals = () => {
    const pendingRequests = Object.entries(courseAccess).filter(([id, data]) => data === 'pending' || data?.status === 'pending').map(([id, data]) => ({ requestId: id, ...data }))
    const approvedRequests = Object.entries(courseAccess).filter(([id, data]) => data?.status === 'approved').map(([id, data]) => ({ requestId: id, ...data }))

    return (
      <div className="space-y-12 pb-20 animate-fade-in max-w-5xl">

        {/* PAYMENT SETTINGS SECTION */}
        <div>
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className={`w-10 h-10 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
              <Icon name="settings" size={20} className={theme.accent} />
            </div>
            <h3 className="text-2xl font-bold">Payment Settings</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 premium-blur flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-2">Institution QR Code</h4>
              <p className="text-sm text-white/50 mb-4">Upload the official UPI QR code for students to scan when making payments.</p>
              <input type="file" accept="image/*" onChange={handleAdminQrUpload} className={`w-full max-w-sm bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-transparent focus:ring-2 ${theme.inputFocus} transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer`} />
            </div>
            {adminQrCode ? (
              <div className="relative group w-32 h-32 rounded-xl overflow-hidden border-2 border-white/20 flex-shrink-0">
                <img src={adminQrCode} alt="Admin QR" className="w-full h-full object-cover" />
                <button onClick={() => { setAdminQrCode(null); localStorage.removeItem('lastHopeAdminQrCode'); }} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-sm">Remove</button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/30 flex-shrink-0">
                <Icon name="qr_code" size={32} className="mb-2" />
                <span className="text-xs">No QR</span>
              </div>
            )}
          </div>

          {/* Pricing Settings */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 premium-blur mt-4 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-2">Bumper Offer Pricing</h4>
              <p className="text-sm text-white/50 mb-4">Set the original price and the discounted offer price to show below the QR code.</p>
              <div className="flex gap-4">
                <div className="space-y-1 w-32">
                  <label className="text-xs font-mono text-white/50">ORIGINAL</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                    <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={`w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all`} />
                  </div>
                </div>
                <div className="space-y-1 w-32">
                  <label className="text-xs font-mono text-white/50">OFFER</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-amber-400 font-bold">₹</span>
                    <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className={`w-full bg-white/5 border border-amber-500/30 rounded-xl py-2 pl-7 pr-3 text-sm text-amber-400 font-bold focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all`} />
                  </div>
                </div>
                <div className="flex items-end pb-[2px]">
                  <button onClick={handleSavePrices} className={`px-6 py-2.5 rounded-xl font-bold text-[#091426] transition-transform hover:scale-[1.02] active:scale-[0.98] ${theme.accentBg}`}>
                    Save Prices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PENDING REQUESTS SECTION */}
        <div>
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className={`w-10 h-10 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
              <Icon name="payments" size={20} className={theme.accent} />
            </div>
            <h3 className="text-2xl font-bold">Pending Payment Approvals</h3>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10 premium-blur flex flex-col items-center">
              <Icon name="check_circle" size={48} className="text-white/20 mb-4" />
              <h4 className="text-xl font-semibold mb-2">All Caught Up!</h4>
              <p className="text-white/50">There are no pending course unlock requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map(request => {
                const userName = request.userName || 'Unknown Student';
                const screenshot = request.screenshot || null;
                const courseTitle = courses.find(c => c.id === request.courseId)?.title || 'Unknown Course';
                const isApproving = approvingCourseId === request.courseId;

                return (
                  <div key={request.requestId} className="bg-white/5 border border-amber-500/30 rounded-2xl p-6 premium-blur flex flex-col transition-all hover:bg-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        {screenshot ? (
                          <div
                            onClick={() => setFullScreenImage(screenshot)}
                            className="group relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 flex-shrink-0 cursor-pointer"
                          >
                            <img src={screenshot} alt="Payment Proof" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Icon name="zoom_in" size={24} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex flex-shrink-0 items-center justify-center">
                            <Icon name="person" size={28} className="text-white/80" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1">{userName} <span className="text-xs text-white/40 ml-2 font-normal">Requested Access</span></h4>
                          <p className="text-sm text-white/60 mb-1">
                            Course: <span className="font-semibold text-white">{courseTitle}</span> <br />
                            Dept: <span className="text-white/80">{request.className}</span> | Sem: <span className="text-white/80">{request.semester}</span>
                          </p>
                          <p className="text-xs text-amber-400 font-mono">Status: Payment Verification Pending</p>
                        </div>
                      </div>

                      {!isApproving ? (
                        <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                          <button
                            onClick={() => handleRejectPayment(request.requestId)}
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium transition-colors text-sm"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setApprovingCourseId(request.courseId)}
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-amber-500 text-[#060d1a] hover:bg-amber-400 font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] text-sm flex items-center justify-center gap-2"
                          >
                            <Icon name="check" size={18} />
                            Approve Access
                          </button>
                        </div>
                      ) : (
                        <div className="w-full md:w-auto mt-4 md:mt-0 p-4 bg-black/40 rounded-xl border border-amber-500/20 animate-fade-in flex flex-col gap-3">
                          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest text-center">Set Access Duration</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: '1 Month', months: 1 },
                              { label: '3 Months', months: 3 },
                              { label: '6 Months', months: 6 },
                              { label: 'Lifetime', months: 1200 } // 100 years
                            ].map(duration => (
                              <button
                                key={duration.months}
                                onClick={() => handleApproveUnlock(request.requestId, duration.months)}
                                className="px-4 py-2 bg-white/5 hover:bg-amber-500 hover:text-[#060d1a] border border-white/10 hover:border-amber-500 transition-colors rounded-lg text-sm font-medium text-white"
                              >
                                {duration.label}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setApprovingCourseId(null)} className="text-xs text-white/50 hover:text-white underline mt-1 text-center">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* APPROVAL HISTORY SECTION */}
        <div>
          <div className="flex items-center gap-3 mb-6 px-1 border-t border-white/10 pt-8 mt-4">
            <div className={`w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/30`}>
              <Icon name="history" size={20} className="text-green-400" />
            </div>
            <h3 className="text-2xl font-bold">Approval History</h3>
          </div>

          {approvedRequests.length === 0 ? (
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 premium-blur flex flex-col items-center">
              <Icon name="hourglass_empty" size={32} className="text-white/20 mb-3" />
              <p className="text-white/50 text-sm">No recent approvals found in history.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 opacity-80 hover:opacity-100 transition-opacity">
              {approvedRequests.map(request => {
                const userName = request.userName || 'Unknown Student';
                const screenshot = request.screenshot || null;
                const duration = request.durationMonths || 0;
                const courseTitle = courses.find(c => c.id === request.courseId)?.title || 'Unknown Course';

                return (
                  <div key={request.requestId} className="bg-white/5 border border-white/10 rounded-xl p-4 premium-blur flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      {screenshot && (
                        <div
                          onClick={() => setFullScreenImage(screenshot)}
                          className="group relative w-12 h-12 rounded-lg overflow-hidden border border-white/20 flex-shrink-0 cursor-pointer"
                        >
                          <img src={screenshot} alt="Payment Proof" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Icon name="zoom_in" size={16} className="text-white" />
                          </div>
                          {request.approvedAt && (
                            <div className="absolute bottom-0 inset-x-0 bg-red-500 text-[9px] font-bold text-white text-center py-px tracking-wider">
                              {(() => {
                                const daysOld = (Date.now() - request.approvedAt) / (1000 * 60 * 60 * 24);
                                const daysLeft = Math.max(0, Math.ceil(15 - daysOld));
                                return `${daysLeft}d left`;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-bold text-white mb-0.5">{userName}</h4>
                        <p className="text-xs text-white/50 mb-1">
                          Course: <span className="text-white/80">{courseTitle}</span> <br />
                          Dept: <span className="text-white/80">{request.className}</span> | Sem: <span className="text-white/80">{request.semester}</span>
                        </p>
                        <p className="text-xs text-green-400 mt-1">
                          Approved for {duration === 1200 ? 'Lifetime' : `${duration} Month${duration > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRejectPayment(request.requestId)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs font-medium"
                    >
                      <Icon name="delete" size={16} />
                      Delete Record
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    )
  }

  const renderAdminCourses = () => {
    const isDemoTab = activeTab === 'Demo Uploads'
    let displayedCourses = courses.filter(c => isDemoTab ? c.isDemo : !c.isDemo);
    if (selectedClass) {
      displayedCourses = displayedCourses.filter(c => c.className === selectedClass);
    }
    if (selectedSemester) {
      displayedCourses = displayedCourses.filter(c => c.semester === selectedSemester);
    }

    const availableSubjects = [...new Set(displayedCourses.map(c => c.subject).filter(Boolean))].sort();

    if (selectedSubject) {
      displayedCourses = displayedCourses.filter(c => c.subject === selectedSubject);
    }

    const availableModules = [...new Set(displayedCourses.map(c => c.module).filter(Boolean))].sort();

    if (selectedModule) {
      displayedCourses = displayedCourses.filter(c => c.module === selectedModule);
    }

    return (
      <div className="space-y-8 pb-20 animate-fade-in max-w-5xl">
        {/* Add Course Form */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 premium-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
              <Icon name="add_circle" size={20} className={theme.accent} />
            </div>
            <h3 className="text-xl font-semibold">Upload New Course Material</h3>
          </div>

          <form onSubmit={handleAddCourse} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-mono text-white/50">YOUTUBE URL</label>
                  <button
                    type="button"
                    onClick={() => setNewCourse({ ...newCourse, isLocked: !newCourse.isLocked })}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${newCourse.isLocked !== false ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}
                  >
                    <Icon name={newCourse.isLocked !== false ? 'lock' : 'lock_open'} size={14} />
                    {newCourse.isLocked !== false ? 'LOCKED' : 'UNLOCKED (FREE)'}
                  </button>
                </div>
                <input type="url" required placeholder="https://youtube.com/watch?v=..."
                  value={newCourse.url} onChange={e => setNewCourse({ ...newCourse, url: e.target.value })}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all`} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 px-1">COURSE TITLE</label>
                <input type="text" required placeholder="e.g. Advanced Mathematics"
                  value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all`} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 px-1">CLASS</label>
                <select required
                  value={newCourse.className} onChange={e => setNewCourse({ ...newCourse, className: e.target.value })}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all appearance-none cursor-pointer`}>
                  <option value="" disabled className="text-black">Select Engineering Stream</option>
                  {engineeringClasses.map(stream => <option key={stream} value={stream} className="text-black">{stream}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 px-1">SEMESTER</label>
                <select required
                  value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all appearance-none cursor-pointer`}>
                  <option value="" disabled className="text-black">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={`Semester ${n}`} className="text-black">Semester {n}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 px-1">SUBJECT</label>
                <input type="text" required placeholder="e.g. Data Structures"
                  value={newCourse.subject || ''} onChange={e => setNewCourse({ ...newCourse, subject: e.target.value })}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all`} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 px-1">MODULE</label>
                <select required
                  value={newCourse.module || ''} onChange={e => setNewCourse({ ...newCourse, module: e.target.value })}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all appearance-none cursor-pointer`}>
                  <option value="" disabled className="text-black">Select Module</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={`Module ${n}`} className="text-black">Module {n}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 px-1">COLLEGE / INSTITUTION</label>
                {!showAddCollegeInput ? (
                  <div className="flex gap-2">
                    <select
                      value={newCourse.college || ''}
                      onChange={e => setNewCourse({ ...newCourse, college: e.target.value })}
                      className={`flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} appearance-none cursor-pointer`}
                    >
                      <option value="" className="text-black">Select College</option>
                      {colleges.map(c => <option key={c.name} value={c.name} className="text-black">{c.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCollegeInput(true)}
                      className={`px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-1`}
                    >
                      <Icon name="add" size={16} />
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={newCollegeName}
                      onChange={e => setNewCollegeName(e.target.value)}
                      className={`flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCollegeName.trim()) {
                          const name = newCollegeName.trim()
                          if (!colleges.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                            const updated = [...colleges, { name, videoUrl: '' }]
                            setColleges(updated)
                            localStorage.setItem('lastHopeCollegesList', JSON.stringify(updated))
                            setDoc(doc(db, 'settings', 'colleges'), { list: updated }, { merge: true }).catch(() => { })
                          }
                          setNewCourse({ ...newCourse, college: name })
                          setNewCollegeName('')
                          setShowAddCollegeInput(false)
                        }
                      }}
                      className={`px-4 py-3 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-500 transition-colors`}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCollegeInput(false)
                        setNewCollegeName('')
                      }}
                      className={`px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-white/50 px-1">DESCRIPTION</label>
              <textarea required rows={3} placeholder="Brief description of the course content..."
                value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} transition-all resize-none`} />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              {editingCourseId && (
                <button type="button" onClick={() => { setEditingCourseId(null); setNewCourse({ url: '', title: '', subject: '', className: '', semester: '', description: '', isLocked: true, college: '' }) }} className="px-8 py-3 rounded-xl font-semibold text-sm text-white border border-white/20 hover:bg-white/5 transition-colors">
                  Cancel Edit
                </button>
              )}
              <button type="submit" className={`px-8 py-3 rounded-xl font-semibold text-sm text-[#091426] transition-transform hover:scale-[1.02] active:scale-[0.98] ${theme.accentBg}`}>
                {editingCourseId ? 'Update Course Material' : 'Add Course Material'}
              </button>
            </div>
          </form>
        </div>

        {/* Course List Display */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Icon name="video_library" size={20} className={theme.accent} />
              Published {isDemoTab ? 'Demo' : ''} Course Materials
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value || null)}
                className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
              >
                <option value="" className="text-black">All Departments</option>
                {engineeringClasses.map(stream => <option key={stream} value={stream} className="text-black">{stream}</option>)}
              </select>

              <select
                value={selectedSemester || ''}
                onChange={(e) => setSelectedSemester(e.target.value || null)}
                className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
              >
                <option value="" className="text-black">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={`Semester ${n}`} className="text-black">Semester {n}</option>)}
              </select>

              {availableSubjects.length > 0 && (
                <select
                  value={selectedSubject || ''}
                  onChange={(e) => setSelectedSubject(e.target.value || null)}
                  className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
                >
                  <option value="" className="text-black">All Subjects</option>
                  {availableSubjects.map(sub => <option key={sub} value={sub} className="text-black">{sub}</option>)}
                </select>
              )}

              {availableModules.length > 0 && (
                <select
                  value={selectedModule || ''}
                  onChange={(e) => setSelectedModule(e.target.value || null)}
                  className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
                >
                  <option value="" className="text-black">All Modules</option>
                  {availableModules.map(mod => <option key={mod} value={mod} className="text-black">{mod}</option>)}
                </select>
              )}

              {(selectedClass || selectedSemester || selectedSubject || selectedModule) && (
                <button
                  onClick={() => { setSelectedClass(null); setSelectedSemester(null); setSelectedSubject(null); setSelectedModule(null); setExpandedClass(null); }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {displayedCourses.length === 0 ? (
            <div className="text-center p-10 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-white/50">No courses published yet matching criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {displayedCourses.map(course => (
                <div key={course.id} className="flex flex-col md:flex-row gap-6 bg-white/5 border border-white/10 rounded-2xl p-4 premium-blur hover:bg-white/10 transition-colors">

                  {/* Thumbnail */}
                  <div className="w-full md:w-64 h-40 bg-black/50 rounded-xl overflow-hidden relative flex-shrink-0 border border-white/10 group cursor-pointer">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform">
                        <Icon name="play_arrow" size={28} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xl font-bold mb-2 text-white">{course.title}</h4>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditClick(course)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                            <Icon name="edit" size={16} className="text-white/60" />
                          </button>
                          <button onClick={() => handleDeleteCourse(course.id)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                            <Icon name="delete" size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${theme.accentBg}/10 ${theme.accent} border ${theme.border}`}>
                          {course.className}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/10 text-white/80">
                          {course.semester}
                        </span>
                        {course.subject && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {course.subject}
                          </span>
                        )}
                        {course.college && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            <Icon name="business" size={12} />
                            {course.college}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-white/60 leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                      <Icon name="link" size={14} />
                      <a href={course.url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors truncate">
                        {course.url}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStudentCourses = () => {
    const isDemoTab = activeTab === 'Payment'
    // Read the stream chosen by the student during signup
    const studentStream = localStorage.getItem('lastHopeStudentStream') || null;

    // Filter out regular vs demo courses
    let displayedCourses = courses.filter(c => isDemoTab ? c.isDemo : !c.isDemo);

    // If they have a stream, filter. Otherwise show all (or could show none)
    if (studentStream) {
      displayedCourses = displayedCourses.filter(c => c.className === studentStream);
    }

    if (selectedSemester) {
      displayedCourses = displayedCourses.filter(c => c.semester === selectedSemester);
    }

    const availableSubjects = [...new Set(displayedCourses.map(c => c.subject).filter(Boolean))].sort();

    if (selectedSubject) {
      displayedCourses = displayedCourses.filter(c => c.subject === selectedSubject);
    }

    const availableModules = [...new Set(displayedCourses.map(c => c.module).filter(Boolean))].sort();

    if (selectedModule) {
      displayedCourses = displayedCourses.filter(c => c.module === selectedModule);
    }

    // Group courses by semester
    const groupedCourses = displayedCourses.reduce((acc, course) => {
      const sem = course.semester || 'Other';
      if (!acc[sem]) acc[sem] = [];
      acc[sem].push(course);
      return acc;
    }, {});

    const sortedSemesters = Object.keys(groupedCourses).sort();

    return (
      <div className="space-y-8 pb-20 animate-fade-in max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-1">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
              <Icon name={isDemoTab ? 'play_circle' : 'menu_book'} size={20} className={theme.accent} />
            </div>
            {isDemoTab ? 'Demo Courses' : 'Course Directory'} {studentStream && <span className="text-white/50 text-xl font-normal ml-2 hidden md:inline">/ {studentStream}</span>}
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSemester || ''}
              onChange={(e) => setSelectedSemester(e.target.value || null)}
              className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
            >
              <option value="" className="text-black">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={`Semester ${n}`} className="text-black">Semester {n}</option>)}
            </select>

            {availableSubjects.length > 0 && (
              <select
                value={selectedSubject || ''}
                onChange={(e) => setSelectedSubject(e.target.value || null)}
                className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
              >
                <option value="" className="text-black">All Subjects</option>
                {availableSubjects.map(sub => <option key={sub} value={sub} className="text-black">{sub}</option>)}
              </select>
            )}

            {availableModules.length > 0 && (
              <select
                value={selectedModule || ''}
                onChange={(e) => setSelectedModule(e.target.value || null)}
                className={`bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-1 ${theme.inputFocus} cursor-pointer appearance-none`}
              >
                <option value="" className="text-black">All Modules</option>
                {availableModules.map(mod => <option key={mod} value={mod} className="text-black">{mod}</option>)}
              </select>
            )}

            {(selectedSemester || selectedSubject || selectedModule) && (
              <button
                onClick={() => { setSelectedSemester(null); setSelectedSubject(null); setSelectedModule(null); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {displayedCourses.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10 premium-blur">
            <Icon name="search_off" size={48} className="text-white/20 mb-4 mx-auto" />
            <h4 className="text-xl font-semibold mb-2">No Courses Found</h4>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              There are no courses published yet for <strong className="text-white/80">{studentStream || 'your stream'}</strong> {selectedSemester ? `in ${selectedSemester}` : ''}.
              <br /><br />
              <span className="text-amber-400/80 text-xs">Note: If you uploaded a course as Admin to a different stream (like IT or Civil), you must log in as a student of that specific stream to see it!</span>
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedSemesters.map(semester => (
              <div key={semester} className="animate-fade-in">
                <div className="flex items-center gap-4 mb-4">
                  <h4 className="text-xl font-bold text-white tracking-wide">{semester}</h4>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedCourses[semester].map(course => {
                    const currentUserName = localStorage.getItem('lastHopeUserName');
                    let accessData = null;
                    let status = 'locked';

                    if (isAdmin || isDemoTab || course.isLocked === false) {
                      status = 'approved';
                    } else if (currentUserName) {
                      const accessList = Object.values(courseAccess).filter(a => a?.userName === currentUserName);
                      const approvedMatch = accessList.find(a => a?.className === course.className && a?.semester === course.semester && (a?.status === 'approved' || a === 'approved'));
                      const pendingMatch = accessList.find(a => a?.className === course.className && a?.semester === course.semester && (a?.status === 'pending' || a === 'pending'));

                      const exactData = courseAccess[`${course.id}_${currentUserName}`];
                      const exactStatus = exactData?.status || exactData || 'locked';

                      if (approvedMatch) {
                        status = 'approved';
                        accessData = approvedMatch;
                      } else if (pendingMatch) {
                        status = 'pending';
                        accessData = pendingMatch;
                      } else if (exactData) {
                        status = exactStatus;
                        accessData = exactData;
                      }
                    }

                    let daysRemaining = null;

                    if (status === 'approved' && !isDemoTab && accessData?.approvedAt && accessData?.durationMonths) {
                      const approvedAt = new Date(accessData.approvedAt);
                      const expiryDate = new Date(approvedAt.setMonth(approvedAt.getMonth() + accessData.durationMonths));
                      const timeDiff = expiryDate - new Date();

                      if (timeDiff <= 0) {
                        status = 'locked'; // Expired
                      } else {
                        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                      }
                    }

                    return (
                      <div key={course.id} className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden premium-blur flex flex-col h-full transition-transform hover:-translate-y-1 duration-500">

                        {/* Thumbnail */}
                        <div className="w-full h-48 bg-black/50 relative flex-shrink-0 border-b border-white/10">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className={`w-full h-full object-cover transition-all duration-500 ${status !== 'approved' ? 'opacity-70 blur-md group-hover:blur-sm' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}`}
                          />

                          {/* Status Overlays */}
                          {status === 'locked' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                              <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-2xl">
                                <Icon name="lock" size={32} className="text-white/90" />
                              </div>
                              <span className="px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-semibold text-white/90 uppercase tracking-widest">
                                Access Restricted
                              </span>
                            </div>
                          )}

                          {status === 'pending' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-900/40 backdrop-blur-[1px]">
                              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 backdrop-blur-md flex items-center justify-center mb-3 shadow-2xl">
                                <Icon name="schedule" size={32} className="text-amber-400" />
                              </div>
                              <span className="px-4 py-1.5 rounded-full bg-black/60 border border-amber-500/30 text-xs font-semibold text-amber-400 uppercase tracking-widest">
                                Awaiting Approval
                              </span>
                            </div>
                          )}

                          {status === 'approved' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <a href={course.url} target="_blank" rel="noreferrer" className="w-14 h-14 bg-red-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                                <Icon name="play_arrow" size={32} className="text-white" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${theme.accentBg}/10 ${theme.accent} border ${theme.border}`}>
                              {course.className}
                            </span>
                            {course.subject && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {course.subject}
                              </span>
                            )}
                            {course.college && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                <Icon name="business" size={12} />
                                {course.college}
                              </span>
                            )}
                            {course.isLocked === false && (
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/20`}>
                                FREE
                              </span>
                            )}
                            {daysRemaining !== null && daysRemaining <= 30000 && (
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/20`}>
                                Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xl font-bold mb-3 text-white">{course.title}</h4>
                          <p className="text-sm text-white/50 leading-relaxed line-clamp-2 mb-6 flex-1">
                            {course.description}
                          </p>

                          {status === 'locked' && (
                            <button
                              onClick={() => {
                                setUnlockingCourse(course)
                                setActiveTab('Payment')
                                setShowDemoList(false)
                              }}
                              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-white/10 hover:brightness-110 active:scale-[0.98] ${theme.accentBg} text-[#091426] shadow-lg`}
                            >
                              <Icon name="key" size={18} />
                              Request Unlock
                            </button>
                          )}

                          {status === 'pending' && (
                            <button disabled className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-amber-500/30 bg-amber-500/10 text-amber-400 cursor-not-allowed">
                              <Icon name="hourglass_empty" size={18} />
                              Payment Processing...
                            </button>
                          )}

                          {status === 'approved' && (
                            <div className="flex flex-col gap-2 w-full mt-auto">
                              <button
                                onClick={() => setPlayingVideo(course.url)}
                                className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-red-400 shadow-lg"
                              >
                                <Icon name="play_circle" size={16} />
                                Play Here
                              </button>
                              <div className="flex gap-2 w-full">
                                <button
                                  onClick={() => setPipVideo(course.url)}
                                  className="flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1 border border-teal-500/30 hover:bg-teal-500/20 text-teal-400 shadow-lg"
                                >
                                  <Icon name="picture_in_picture_alt" size={16} />
                                  PiP (No Ads)
                                </button>
                                <button
                                  onClick={() => window.open(course.url, '_blank')}
                                  onContextMenu={(e) => e.preventDefault()}
                                  className="flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-secondary-fixed-dim/30 hover:bg-secondary-fixed-dim/20 text-secondary-fixed-dim shadow-lg"
                                >
                                  <Icon name="open_in_new" size={16} />
                                  YouTube
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAssignments = () => {
    if (showDemoList) {
      return (
        <div className="animate-fade-in max-w-5xl mx-auto">
          <button
            onClick={() => setShowDemoList(false)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
          >
            <Icon name="arrow_back" size={20} /> Back to Payments
          </button>
          <ErrorBoundary>
            {renderStudentCourses()}
          </ErrorBoundary>
        </div>
      )
    }

    return (
      <ErrorBoundary>
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
          {unlockingCourse && (
            <button
              onClick={() => { setUnlockingCourse(null); setActiveTab('My Courses') }}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <Icon name="arrow_back" size={20} /> Back to Courses
            </button>
          )}

          <div className="premium-blur p-8 rounded-3xl w-full shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
            <div className={`absolute top-0 right-0 w-64 h-64 opacity-10 blur-3xl ${theme.accentBg}`} />

            <div className="flex-1 text-left relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-white/5 border border-white/10 ${theme.accentGlow}`}>
                <Icon name="qr_code_scanner" size={32} className={theme.accent} />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Payment Required</h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                {unlockingCourse
                  ? <>You are requesting access to <strong>{unlockingCourse.title}</strong>.</>
                  : <>Scan the QR code to make a general payment or unlock a specific course.</>
                }
                {' '}Scan the QR code via your banking app to initiate the payment.
                Once initiated, request approval and our administrators will verify the transaction.
              </p>

              <div className="p-4 bg-black/20 rounded-xl border border-white/5 mb-8">
                <h4 className="font-semibold text-white mb-2">Payment Details</h4>
                <p className="text-sm text-white/50 mb-1">UPI ID: university@bank</p>
                <p className="text-sm text-white/50">Amount: Course specific fees apply</p>
              </div>

              <div className="flex gap-4">
                {unlockingCourse && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-[#091426] transition-transform hover:scale-[1.02] active:scale-[0.98] ${theme.accentBg}`}
                  >
                    <Icon name="check_circle" size={20} className="inline mr-2 -mt-1" />
                    Confirm Payment
                  </button>
                )}
                <button
                  onClick={() => setShowDemoList(true)}
                  className={`${unlockingCourse ? 'flex-1' : 'w-full'} py-3.5 px-6 rounded-xl font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors shadow-lg`}
                >
                  <Icon name="play_circle" size={20} className="inline mr-2 -mt-1 text-blue-400" />
                  View Demo Courses
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl shadow-xl relative z-10 border-4 border-white flex-shrink-0 mb-4">
                {adminQrCode ? (
                  <img src={adminQrCode} alt="Institution QR Code" className="w-56 h-56 object-contain" />
                ) : (
                  <div className="w-56 h-56 grid grid-cols-5 grid-rows-5 gap-1 bg-white">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`w-full h-full ${(i % 2 === 0 || i % 3 === 0 || i === 12) ? 'bg-black rounded-sm' : 'bg-transparent'}`} />
                    ))}
                    {/* QR Code Anchor Squares */}
                    <div className="col-start-1 row-start-1 col-span-2 row-span-2 border-4 border-black bg-white flex items-center justify-center rounded">
                      <div className="w-1/2 h-1/2 bg-black rounded-sm" />
                    </div>
                    <div className="col-start-4 row-start-1 col-span-2 row-span-2 border-4 border-black bg-white flex items-center justify-center rounded">
                      <div className="w-1/2 h-1/2 bg-black rounded-sm" />
                    </div>
                    <div className="col-start-1 row-start-4 col-span-2 row-span-2 border-4 border-black bg-white flex items-center justify-center rounded">
                      <div className="w-1/2 h-1/2 bg-black rounded-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* Stylish Price Tag */}
              <div className="relative group w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative bg-[#091426] border border-white/20 rounded-xl p-3 flex flex-col items-center justify-center shadow-2xl">
                  <div className="absolute -top-3 px-3 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg border border-red-400 transform -rotate-2">
                    Bumper Offer
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/40 font-bold text-lg line-through decoration-red-500/70 decoration-2">
                      ₹{originalPrice}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-amber-400 font-black text-3xl">₹{offerPrice}</span>
                      <span className="text-white/60 text-xs font-semibold uppercase">Only</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </ErrorBoundary>
    )
  }

  const renderStudentSchedule = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const handleSaveSchedule = (e) => {
      e.preventDefault();
      if (editingScheduleItem.id) {
        setScheduleData(scheduleData.map(item => item.id === editingScheduleItem.id ? editingScheduleItem : item));
      } else {
        setScheduleData([...scheduleData, { ...editingScheduleItem, id: Date.now() }]);
      }
      setShowScheduleModal(false);
      setEditingScheduleItem(null);
    };

    const handleRemoveSchedule = (id) => {
      setScheduleData(scheduleData.filter(item => item.id !== id));
    };

    const handleEditSchedule = (item) => {
      setEditingScheduleItem(item);
      setShowScheduleModal(true);
    };

    const handleAddSchedule = () => {
      setEditingScheduleItem({ day: 'Monday', time: '', subject: '', type: 'Lecture', room: '' });
      setShowScheduleModal(true);
    };

    return (
      <div className="animate-fade-in max-w-5xl space-y-8 pb-20 relative">
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
              <Icon name="calendar_month" size={20} className={theme.accent} />
            </div>
            <h3 className="text-2xl font-bold">Academic Schedule</h3>
          </div>
          <button onClick={handleAddSchedule} className={`bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors`}>
            <Icon name="add" size={18} /> Add Class
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 premium-blur overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-5 gap-4">
            {days.map(day => (
              <div key={day} className="flex flex-col gap-3">
                <h4 className="text-center font-bold py-2 border-b border-white/10 text-white/80">{day}</h4>
                {scheduleData.filter(s => s.day === day).length === 0 ? (
                  <div className="text-center text-xs text-white/30 py-4 italic">No classes</div>
                ) : (
                  scheduleData.filter(s => s.day === day).map((item, i) => (
                    <div key={item.id || i} className={`group relative p-3 rounded-xl border ${item.type === 'Lab' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'} transition-transform hover:-translate-y-1 shadow-lg`}>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#020617]/80 rounded p-1 z-10">
                        <button onClick={() => handleEditSchedule(item)} className="text-white hover:text-amber-400 p-1"><Icon name="edit" size={14} /></button>
                        <button onClick={() => handleRemoveSchedule(item.id)} className="text-white hover:text-red-400 p-1"><Icon name="delete" size={14} /></button>
                      </div>
                      <div className="text-[10px] font-mono text-white/60 mb-1">{item.time}</div>
                      <div className="text-sm font-bold leading-tight mb-2 pr-8">{item.subject}</div>
                      <div className="flex justify-between items-center text-xs text-white/50">
                        <span className={`px-1.5 py-0.5 rounded ${item.type === 'Lab' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{item.type}</span>
                        <span className="flex items-center gap-1"><Icon name="room" size={12} />{item.room}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Edit Modal */}
        {showScheduleModal && editingScheduleItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in relative">
              <h3 className="text-xl font-bold mb-4">{editingScheduleItem.id ? 'Edit Class' : 'Add Class'}</h3>
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Day</label>
                  <select
                    value={editingScheduleItem.day}
                    onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, day: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                  >
                    {days.map(d => <option key={d} value={d} className="bg-[#0f172a]">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Time</label>
                  <input
                    type="text"
                    value={editingScheduleItem.time}
                    onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, time: e.target.value })}
                    placeholder="e.g. 09:00 AM - 10:30 AM"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editingScheduleItem.subject}
                    onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, subject: e.target.value })}
                    placeholder="e.g. Database Management Systems"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <h4 className="font-bold text-lg mb-3">Add Video</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Type</label>
                    <select
                      value={editingScheduleItem.type}
                      onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="Lecture" className="bg-[#0f172a]">Lecture</option>
                      <option value="Lab" className="bg-[#0f172a]">Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Room</label>
                    <input
                      type="text"
                      value={editingScheduleItem.room}
                      onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, room: e.target.value })}
                      placeholder="e.g. Room 304"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">Cancel</button>
                  <button type="submit" className={`flex-1 py-2 rounded-lg ${theme.accentBg} text-[#020617] font-bold transition-colors hover:brightness-110`}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const renderStudentGrades = () => {
    return <StudentGradeCalculator theme={theme} />;
  }

  const renderStudentTimer = () => {
    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <div className={isTimerRunning ? "fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center animate-fade-in" : "flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full p-8 md:p-12 rounded-3xl premium-blur shadow-2xl border border-white/10 animate-fade-in"}>

        {isTimerRunning && (
          <div className="absolute top-32 text-4xl md:text-6xl font-black text-green-400 animate-bounce drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">
            Now Start!
          </div>
        )}

        {!isTimerRunning && (
          <>
            <div className={`w-24 h-24 rounded-full ${theme.accentBg}/10 flex items-center justify-center mb-8 border ${theme.border} ${theme.accentGlow}`}>
              <Icon name="timer" size={48} className={theme.accent} />
            </div>
            <h2 className="text-4xl font-bold mb-2">Study Timer</h2>
            <p className="text-white/60 mb-8">Stay focused and track your study sessions</p>
          </>
        )}

        <div className={`${isTimerRunning ? 'text-[25vw] md:text-[200px]' : 'text-[120px]'} font-mono font-black tracking-tighter text-white mb-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-1000`}>
          {formatTime(timerTime)}
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-4">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${isTimerRunning ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 shadow-[0_0_20px_rgba(74,222,128,0.3)]'}`}
            >
              {isTimerRunning ? 'Stop Timer' : 'Start Timer'}
            </button>
            {!isTimerRunning && (
              <button
                onClick={() => { setIsTimerRunning(false); setTimerTime(25 * 60); }}
                className="px-8 py-3 rounded-full font-bold text-lg transition-all bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              >
                Reset
              </button>
            )}
          </div>

          {!isTimerRunning && (
            <div className="mt-8 animate-fade-in w-full">
              <p className="text-center text-sm font-semibold text-white/50 mb-4 uppercase tracking-widest">Suggested Durations</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map(min => (
                  <button
                    key={min}
                    onClick={() => setTimerTime(min * 60)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all font-mono text-sm text-white/80"
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderStudentToDo = () => {
    const handleAdd = (e) => {
      e.preventDefault();
      if (!newTodo.trim()) return;
      setTodos([{ id: Date.now(), text: newTodo, done: false }, ...todos]);
      setNewTodo('');
    };

    return (
      <div className="animate-fade-in max-w-2xl mx-auto pt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-12 h-12 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
            <Icon name="checklist" size={24} className={theme.accent} />
          </div>
          <h2 className="text-3xl font-bold">My Tasks</h2>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-8">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/50"
          />
          <button type="submit" className="bg-secondary text-[#091426] px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all">
            Add
          </button>
        </form>

        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="text-center text-white/40 py-12 italic bg-white/5 rounded-xl border border-white/5">You have no tasks!</div>
          ) : (
            todos.map(todo => (
              <div key={todo.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${todo.done ? 'bg-white/5 border-transparent opacity-50' : 'bg-white/10 border-white/10'}`}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTodos(todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))}>
                  <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${todo.done ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>
                    {todo.done && <Icon name="check" size={16} className="text-[#091426]" />}
                  </div>
                  <span className={`text-lg ${todo.done ? 'line-through text-white/50' : 'text-white'}`}>{todo.text}</span>
                </div>
                <button
                  onClick={() => setTodos(todos.filter(t => t.id !== todo.id))}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Icon name="delete" size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const renderStudentRoadmap = () => {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto pt-8 pb-20">
        <div className="flex items-center gap-3 mb-10">
          <div className={`w-12 h-12 rounded-xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
            <Icon name="map" size={24} className={theme.accent} />
          </div>
          <h2 className="text-3xl font-bold">Academic Roadmap</h2>
        </div>

        <div className="relative border-l-2 border-white/10 ml-6 space-y-12 pb-12">
          {roadmapStages.map((step, i) => (
            <div key={step.id || i} className="relative pl-8">
              <div className={`absolute -left-[13px] top-1 w-6 h-6 rounded-full border-4 border-[#091426] flex items-center justify-center ${step.status === 'completed' ? 'bg-green-500' : step.status === 'current' ? 'bg-amber-500 animate-pulse' : 'bg-white/20'}`}>
                {step.status === 'completed' && <Icon name="check" size={12} className="text-[#091426]" />}
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur hover:bg-white/10 transition-colors">
                <span className={`text-xs font-bold px-2 py-1 rounded mb-3 inline-block uppercase tracking-wider ${step.status === 'completed' ? 'bg-green-500/20 text-green-400' : step.status === 'current' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}`}>{step.status}</span>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-white/60">{step.desc || 'No description provided.'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderStudentGatePrep = () => {
    return (
      <div className="animate-fade-in max-w-5xl mx-auto pt-8 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20`}>
            <Icon name="school" size={24} className="text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold">GATE CSE Preparation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Icon name="menu_book" size={20} className="text-purple-400" /> Core Subjects</h3>
            <ul className="space-y-3">
              {gateSubjects.map((sub, idx) => (
                <li key={idx} className="flex items-center gap-3 text-white/70 bg-white/5 p-3 rounded-lg border border-white/5">
                  <Icon name="play_arrow" size={16} className="text-purple-400/50" /> {sub}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 p-6 rounded-2xl premium-blur relative overflow-hidden">
              <h3 className="text-xl font-bold mb-2">Mock Test Series</h3>
              <p className="text-white/70 mb-4 text-sm">Attempt full-length mock tests designed by experts to gauge your GATE readiness.</p>
              <button className="px-5 py-2 bg-purple-500 text-white rounded-lg font-bold text-sm shadow-lg hover:bg-purple-400 transition-colors">Start Mock Test</button>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Previous Year Papers</h3>
                <p className="text-xs text-white/50">2010 to 2025</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><Icon name="download" size={20} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderStudentGame = () => {
    const handleSquareClick = (i) => {
      if (gameBoard[i] || calculateWinner(gameBoard)) return;
      const newBoard = [...gameBoard];
      newBoard[i] = gameXIsNext ? 'X' : 'O';
      setGameBoard(newBoard);
      setGameXIsNext(!gameXIsNext);
    };

    const calculateWinner = (squares) => {
      const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
          return squares[a];
        }
      }
      return null;
    };

    const winner = calculateWinner(gameBoard);
    const isDraw = !winner && !gameBoard.includes(null);
    let status = winner ? `Winner: ${winner}` : isDraw ? 'Draw!' : `Next player: ${gameXIsNext ? 'X' : 'O'}`;

    return (
      <div className="animate-fade-in flex flex-col items-center pt-12 pb-20">
        <div className={`w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20`}>
          <Icon name="sports_esports" size={32} className="text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Relax Zone</h2>
        <p className="text-white/50 mb-8">Take a break with a quick game of Tic-Tac-Toe</p>

        <div className="text-xl font-bold mb-6 px-6 py-2 rounded-full bg-white/5 border border-white/10">{status}</div>

        <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-2xl border border-white/10 premium-blur">
          {gameBoard.map((square, i) => (
            <button
              key={i}
              onClick={() => handleSquareClick(i)}
              className="w-24 h-24 bg-[#091426] border border-white/5 rounded-xl text-4xl font-bold hover:bg-white/5 transition-colors flex items-center justify-center focus:outline-none"
            >
              <span className={square === 'X' ? 'text-blue-400' : square === 'O' ? 'text-red-400' : ''}>{square}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setGameBoard(Array(9).fill(null)); setGameXIsNext(true); }}
          className="mt-8 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-bold"
        >
          Restart Game
        </button>
      </div>
    );
  }

  const renderCollegeUpdate = () => {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto pt-8 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20`}>
            <Icon name="campaign" size={24} className="text-orange-400" />
          </div>
          <h2 className="text-3xl font-bold">College Updates</h2>
        </div>

        <div className="space-y-4">
          {collegeUpdates.length === 0 ? (
            <div className="text-center text-white/50 py-10">No updates posted yet.</div>
          ) : (
            collegeUpdates.map(update => (
              <div key={update.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur relative overflow-hidden">
                {update.urgency === 'URGENT' && (
                  <>
                    <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                    <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-2">
                      <Icon name="notifications_active" size={14} /> URGENT
                    </div>
                  </>
                )}
                <h3 className="text-xl font-bold mb-2">{update.title}</h3>
                <p className="text-white/70 whitespace-pre-line">{update.content}</p>
                <div className="text-xs text-white/40 mt-4">Posted {update.time}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const renderFeatureGuide = () => {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto pt-8 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20`}>
            <Icon name="help" size={24} className="text-teal-400" />
          </div>
          <h2 className="text-3xl font-bold">Platform Guide</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-teal-400 mb-3"><Icon name="menu_book" size={20} /> <h3 className="font-bold">My Courses</h3></div>
            <p className="text-white/70 text-sm">View all the courses you have unlocked. Click 'Play Here' to watch directly on the platform without distractions.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-teal-400 mb-3"><Icon name="payments" size={20} /> <h3 className="font-bold">Payment & Unlocking</h3></div>
            <p className="text-white/70 text-sm">Scan the Admin QR code, upload your payment screenshot, and the course will be unlocked once approved by the administrator.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-teal-400 mb-3"><Icon name="timer" size={20} /> <h3 className="font-bold">Study Timer</h3></div>
            <p className="text-white/70 text-sm">Use the built-in Pomodoro timer to manage your study sessions effectively. Focus for 25 minutes, then take a break.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl premium-blur hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-teal-400 mb-3"><Icon name="sports_esports" size={20} /> <h3 className="font-bold">Take a Break</h3></div>
            <p className="text-white/70 text-sm">Head over to the Game tab for a quick round of Tic-Tac-Toe to relax your mind between intense study sessions.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderSignUpTheme = () => {
    const handleSaveCollegeTheme = async (e) => {
      e.preventDefault();
      const name = collegeInputName.trim();
      if (!name) return;

      let videoUrl = '';
      const existsIdx = colleges.findIndex(c => c.name.toLowerCase() === name.toLowerCase());

      if (selectedVideoFile && typeof selectedVideoFile === 'string' && selectedVideoFile.trim() !== '') {
        videoUrl = selectedVideoFile.trim();
      } else {
        // If updating an existing college and no new video link is provided, retain the old URL.
        if (existsIdx > -1) {
          videoUrl = colleges[existsIdx].videoUrl;
        } else {
          alert('Please enter a YouTube video link.');
          return;
        }
      }

      let updated = [...colleges];
      if (existsIdx > -1) {
        updated[existsIdx] = { name: updated[existsIdx].name, videoUrl };
      } else {
        updated.push({ name, videoUrl });
      }

      setColleges(updated);
      localStorage.setItem('lastHopeCollegesList', JSON.stringify(updated));
      setCollegeInputName('');
      setSelectedVideoFile('');

      try {
        await setDoc(doc(db, 'settings', 'colleges'), { list: updated }, { merge: true });
      } catch (err) {
        console.warn("Firebase colleges save failed", err);
      }
    };

    const handleDelete = async (nameToDelete) => {
      const updated = colleges.filter(c => c.name !== nameToDelete);
      setColleges(updated);
      localStorage.setItem('lastHopeCollegesList', JSON.stringify(updated));
      if (adminPreviewCollege === nameToDelete) {
        setAdminPreviewCollege('');
        localStorage.removeItem('lastHopeAdminPreviewCollege');
      }
      try {
        await setDoc(doc(db, 'settings', 'colleges'), { list: updated }, { merge: true });
      } catch (err) {
        console.warn("Firebase colleges delete failed", err);
      }
    };

    return (
      <div className="animate-fade-in max-w-6xl mx-auto pt-8 pb-20 space-y-12">
        <div>
          <h2 className="text-3xl font-bold mb-2">SignUp Theme Settings</h2>
          <p className="text-white/50 text-sm">Configure college specific background videos by pasting YouTube links.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add / Edit Form */}
          <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-6 premium-blur h-fit">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="add_to_photos" className="text-amber-400" size={20} />
              Add/Update College Video
            </h3>
            <form onSubmit={handleSaveCollegeTheme} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-white/50">COLLEGE NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford University"
                  value={collegeInputName}
                  onChange={e => setCollegeInputName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-white/50">MEDIA LINK (YOUTUBE, INSTAGRAM, IMAGE)</label>
                <input
                  type="url"
                  placeholder="Paste YouTube, Instagram Reel, or Image link..."
                  required={!colleges.some(c => c.name.toLowerCase() === collegeInputName.toLowerCase())}
                  value={selectedVideoFile || ''}
                  onChange={e => setSelectedVideoFile(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Icon name="sync" className="animate-spin" size={16} />
                    Uploading Video...
                  </>
                ) : (
                  'Save College Theme'
                )}
              </button>
            </form>
          </div>

          {/* List and Actions */}
          <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-6 premium-blur">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="business" className="text-amber-400" size={20} />
              Configured Institution Themes
            </h3>
            {colleges.length === 0 ? (
              <p className="text-white/40 text-sm">No colleges added yet.</p>
            ) : (
              <div className="space-y-4">
                {colleges.map(c => {
                  const isPlayable = !!c.videoUrl;
                  const isActive = adminPreviewCollege === c.name;

                  return (
                    <div key={c.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-white flex items-center gap-1.5">
                          {c.name}
                          {isActive && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-mono">ACTIVE BG</span>}
                        </h4>
                        <p className="text-xs text-white/50 truncate max-w-sm mt-1">{c.videoUrl || 'No video uploaded'}</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {isPlayable && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPlayingVideo(c.videoUrl)}
                              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <Icon name="visibility" size={14} /> Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isActive) {
                                  setAdminPreviewCollege('');
                                  localStorage.removeItem('lastHopeAdminPreviewCollege');
                                } else {
                                  setAdminPreviewCollege(c.name);
                                  localStorage.setItem('lastHopeAdminPreviewCollege', c.name);
                                }
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isActive ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'}`}
                            >
                              <Icon name="wallpaper" size={14} /> {isActive ? 'Disable Bg' : 'Apply Bg'}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.name)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto pt-8 pb-20 space-y-12">
        <div>
          <h2 className="text-3xl font-bold mb-2">Settings</h2>
          <p className="text-white/50 text-sm">Manage configuration details, custom assets, and session logout.</p>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl premium-blur">
          <h3 className="text-lg font-bold mb-2">Student Profile Details</h3>
          <p className="text-sm text-white/60 mb-6">
            College: <strong className="text-white">{localStorage.getItem('lastHopeStudentCollege') || 'None Selected'}</strong> <br />
            Stream: <strong className="text-white">{localStorage.getItem('lastHopeStudentStream') || 'None Selected'}</strong>
          </p>
        </div>

        <div className="pt-6 border-t border-white/5 flex justify-end">
          <button
            onClick={handleLogout}
            className="px-8 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all font-semibold text-sm"
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    );
  }

  const renderPlaceholderTab = (title, desc, iconName) => (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
      <div className={`w-24 h-24 rounded-full ${theme.accentBg}/10 flex items-center justify-center mb-6 border ${theme.border} ${theme.accentGlow}`}>
        <Icon name={iconName} size={48} className={theme.accent} />
      </div>
      <h2 className="text-3xl font-bold mb-3">{title}</h2>
      <p className="text-white/60 max-w-md text-center leading-relaxed">
        {desc}
      </p>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview': return renderOverview();
      case 'Students': return renderPlaceholderTab('Student Directory', 'Manage student records, enrollment status, and academic flags across the institution.', 'group');
      case 'Courses':
      case 'Demo Uploads': return isAdmin ? renderAdminCourses() : renderStudentCourses();
      case 'My Courses': return renderStudentCourses();
      case 'Payment Approvals': return isAdmin ? renderAdminPaymentApprovals() : renderOverview();
      case 'Payment': return renderAssignments();
      case 'Schedule': return renderStudentSchedule();
      case 'Grades': return renderStudentGrades();
      case 'Timer': return renderStudentTimer();
      case 'To-Do List': return renderStudentToDo();
      case 'Roadmap': return isAdmin ? renderAdminRoadmap() : renderStudentRoadmap();
      case 'GATE Prep': return isAdmin ? renderAdminGatePrep() : renderStudentGatePrep();
      case 'Game': return renderStudentGame();
      case 'College Update': return isAdmin ? renderAdminCollegeUpdates() : renderCollegeUpdate();
      case 'SignUp Theme': return isAdmin ? renderSignUpTheme() : renderOverview();
      case 'Feature Guide': return renderFeatureGuide();
      case 'Settings': return renderSettings();
      case 'System Logs': return renderPlaceholderTab('System Activity Logs', 'Monitor real-time server activity, security events, and administrative audits.', 'terminal');
      default: return renderOverview();
    }
  }

  // Get active college video background
  const activeCollegeName = isAdmin
    ? adminPreviewCollege
    : (localStorage.getItem('lastHopeStudentCollege') || '')
  const activeCollegeObj = colleges.find(c => c.name === activeCollegeName)
  const bgVideoUrl = (activeCollegeObj && activeCollegeObj.videoUrl) ? activeCollegeObj.videoUrl : '/login-video/199740-911047178.mp4'

  const renderDashboardBgVideo = () => {
    if (!bgVideoUrl || (typeof bgVideoEnabled !== 'undefined' && !bgVideoEnabled)) return null;

    const ytMatch = bgVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const ytId = ytMatch ? ytMatch[1] : null;

    if (ytId) {
      return (
        <div className="fixed inset-0 overflow-hidden z-[-48]">
          <iframe
            className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 opacity-80 pointer-events-none"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playsinline=1&fs=0&iv_load_policy=3&vq=hd2160&hd=1`}
            frameBorder="0"
            allow="autoplay; encrypted-media"
          />
          <div className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto" />
        </div>
      );
    }

    const driveMatch = bgVideoUrl.match(/[-\w]{25,}/);
    const driveId = bgVideoUrl.includes('drive.google.com') ? (driveMatch ? driveMatch[0] : null) : null;

    if (driveId) {
      return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-48]">
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

    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-48]">
        <video
          src={bgVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-1/2 left-1/2 w-full h-full object-cover -translate-x-1/2 -translate-y-1/2 opacity-80 pointer-events-none"
        />
      </div>
    );
  };

  return (
    <div
      className="h-screen w-full bg-transparent text-white flex overflow-hidden font-sans relative select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Loop College Video Background if selected */}
      {renderDashboardBgVideo()}

      {/* Translucent overlay to darken video slightly for text contrast without blurring */}
      <div
        className={`fixed inset-0 pointer-events-none z-[-45] ${isAdmin ? 'bg-[#060d1a]/25' : 'bg-[#020617]/25'
          }`}
      />

      {/* ── Background Ambient Effects ── */}
      <div className="fixed inset-0 pointer-events-none z-[-46]">
        <div className="absolute top-0 left-0 w-full h-full geometric-grid opacity-20" />
        <div className={`absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 transition-colors duration-1000 ${isAdmin ? 'bg-amber-600' : 'bg-secondary'}`} />
        <div className={`absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 transition-colors duration-1000 ${isAdmin ? 'bg-orange-600' : 'bg-primary-fixed-dim'}`} />
      </div>

      {/* Mobile Hamburger Menu */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={`md:hidden fixed top-3 right-4 z-[45] w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-2xl transition-transform active:scale-95 ${mounted ? 'scale-100' : 'scale-0'}`}
      >
        <Icon name="menu" size={28} className="text-white drop-shadow-md" />
      </button>

      {/* Main Content Layout Wrapper */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-[100vw]">

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[48] md:hidden animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`fixed inset-y-0 left-0 z-[50] md:relative w-72 md:w-64 border-r border-white/10 ${isAdmin ? 'bg-[#060d1a]/80 backdrop-blur-xl' : 'bg-[#020617]/80 backdrop-blur-xl'} flex flex-col transition-transform duration-300 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

          {/* Brand */}
          <div className="h-16 md:h-20 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${theme.accentBg}/20 border ${theme.border}`}>
                <Icon name={isAdmin ? 'admin_panel_settings' : 'school'} filled size={20} className={theme.accent} />
              </div>
              <span className="font-bold text-lg md:text-xl tracking-tight">Last Hope</span>
            </div>
            {/* Close button for mobile inside sidebar */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Icon name="close" size={20} className="text-white/70" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col flex-1 px-4 py-6 space-y-2 overflow-x-hidden overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const hasSubmenu = (isAdmin && (item === 'Courses' || item === 'Demo Uploads')) || (!isAdmin && item === 'My Courses');
              const isExpanded = expandedNav === item;
              const isActive = activeTab === item;

              return (
                <div key={item} className="block">
                  <button
                    onClick={() => {
                      setActiveTab(item)
                      setIsSidebarOpen(false) // Close sidebar on mobile when tab clicked
                      if (item === 'Payment') {
                        setShowDemoList(false)
                        setUnlockingCourse(null)
                      }
                      if (hasSubmenu) {
                        setExpandedNav(isExpanded ? null : item)
                        if (isExpanded) {
                          setSelectedClass(null)
                          setSelectedSemester(null)
                          setSelectedSubject(null)
                          setExpandedClass(null)
                          setExpandedSemester(null)
                        }
                      } else {
                        setExpandedNav(null)
                      }
                    }}
                    className={`flex items-center gap-2 md:gap-3 px-4 py-2 md:px-4 md:py-3 rounded-xl transition-all font-medium text-sm
                    ${isActive
                        ? `${theme.accentBg}/20 ${theme.accent} border border-white/5 shadow-lg`
                        : `text-white/60 ${theme.hoverBg} hover:text-white`}`}
                  >
                    <Icon name={getIconForTab(item)} size={20} />
                    <span className="flex-1 text-left">{item}</span>

                    {/* Badge for Payment Approvals */}
                    {item === 'Payment Approvals' && pendingCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                        {pendingCount}
                      </span>
                    )}

                    {hasSubmenu && (
                      <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={18} className="opacity-50" />
                    )}
                  </button>

                  {/* Submenu Accordion for Admin Courses -> Streams -> Semesters */}
                  {hasSubmenu && isExpanded && isAdmin && (
                    <div className="ml-5 pl-5 pr-2 py-2 mt-1 mb-2 border-l border-white/10 flex flex-col gap-1">
                      {engineeringClasses.map(cls => (
                        <div key={cls}>
                          <button
                            onClick={() => {
                              setActiveTab(item)
                              setExpandedClass(expandedClass === cls ? null : cls)
                              setSelectedClass(cls)
                              setSelectedSemester(null) // reset semester filter when clicking class
                            }}
                            className={`w-full flex items-center justify-between text-left text-sm py-2.5 px-4 transition-all
                            ${expandedClass === cls
                                ? `bg-[#2a2f3f]/80 text-white font-bold border border-white/80 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)]`
                                : `text-white/60 hover:text-white hover:bg-white/5 border border-transparent rounded-lg`}`}
                          >
                            {cls}
                            <Icon name={expandedClass === cls ? 'expand_less' : 'expand_more'} size={16} className={expandedClass === cls ? 'text-white' : 'opacity-50'} />
                          </button>

                          {/* Semester Sub-Submenu */}
                          {expandedClass === cls && (
                            <div className="ml-4 pl-2 py-1 border-l border-white/10 flex flex-col mt-1 gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
                                const sem = `Semester ${n}`
                                const isSelected = selectedClass === cls && selectedSemester === sem
                                const isSemExpanded = expandedSemester === sem
                                const semSubjects = [...new Set(courses.filter(c => c.className === cls && c.semester === sem).map(c => c.subject).filter(Boolean))].sort()

                                return (
                                  <div key={n}>
                                    <button
                                      onClick={() => {
                                        setSelectedClass(cls)
                                        setSelectedSemester(sem)
                                        setExpandedSemester(isSemExpanded ? null : sem)
                                        setSelectedSubject(null) // reset subject filter when clicking semester
                                      }}
                                      className={`w-full flex items-center justify-between text-left text-sm py-2 px-4 transition-all ${isSemExpanded
                                        ? `bg-[#2a2f3f]/80 text-white font-bold border border-white/80 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] mt-1 mb-1`
                                        : isSelected
                                          ? `${theme.accent} font-bold bg-white/5 rounded-lg`
                                          : `text-white/50 hover:text-white hover:bg-white/5 border border-transparent rounded-lg`
                                        }`}
                                    >
                                      Semester {n}
                                      {semSubjects.length > 0 && (
                                        <Icon name={isSemExpanded ? 'expand_less' : 'expand_more'} size={16} className={isSemExpanded ? 'text-white' : 'opacity-50'} />
                                      )}
                                    </button>

                                    {isSemExpanded && semSubjects.length > 0 && (
                                      <div className="ml-4 pl-2 border-l border-white/10 flex flex-col mt-1 gap-1 mb-1">
                                        {semSubjects.map(sub => (
                                          <button
                                            key={sub}
                                            onClick={() => {
                                              setSelectedClass(cls)
                                              setSelectedSemester(sem)
                                              setSelectedSubject(sub)
                                            }}
                                            className={`w-full text-left text-[13px] py-1.5 px-4 rounded-lg transition-colors ${selectedSubject === sub
                                              ? `${theme.accent} font-bold bg-white/5`
                                              : 'text-white/80 hover:text-white hover:bg-white/5'
                                              }`}
                                          >
                                            {sub}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submenu for Student 'My Courses' -> Semesters */}
                  {hasSubmenu && isExpanded && !isAdmin && (
                    <div className="ml-5 pl-5 pr-2 py-2 mt-1 mb-2 border-l border-white/10 flex flex-col gap-1">
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2 px-2">
                        {localStorage.getItem('lastHopeStudentStream') || 'All Streams'}
                      </div>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
                        const sem = `Semester ${n}`
                        const isSelected = selectedSemester === sem
                        const isSemExpanded = expandedSemester === sem
                        const studentStream = localStorage.getItem('lastHopeStudentStream') || null
                        const semSubjects = [...new Set(courses.filter(c => (!studentStream || c.className === studentStream) && c.semester === sem).map(c => c.subject).filter(Boolean))].sort()

                        return (
                          <div key={n}>
                            <button
                              onClick={() => {
                                setActiveTab(item)
                                setSelectedSemester(sem)
                                setExpandedSemester(isSemExpanded ? null : sem)
                                setSelectedSubject(null) // reset subject filter when clicking semester
                              }}
                              className={`w-full flex items-center justify-between text-left text-sm py-2 px-4 transition-all ${isSemExpanded
                                ? `bg-[#2a2f3f]/80 text-white font-bold border border-white/80 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] mt-1 mb-1`
                                : isSelected
                                  ? `${theme.accent} font-bold bg-white/5 rounded-lg`
                                  : `text-white/50 hover:text-white hover:bg-white/5 border border-transparent rounded-lg`
                                }`}
                            >
                              Semester {n}
                              {semSubjects.length > 0 && (
                                <Icon name={isSemExpanded ? 'expand_less' : 'expand_more'} size={16} className={isSemExpanded ? 'text-white' : 'opacity-50'} />
                              )}
                            </button>

                            {isSemExpanded && semSubjects.length > 0 && (
                              <div className="ml-4 pl-2 border-l border-white/10 flex flex-col mt-1 gap-1 mb-1">
                                {semSubjects.map(sub => (
                                  <button
                                    key={sub}
                                    onClick={() => {
                                      setActiveTab(item)
                                      setSelectedSemester(sem)
                                      setSelectedSubject(sub)
                                    }}
                                    className={`w-full text-left text-[13px] py-1.5 px-4 rounded-lg transition-colors ${selectedSubject === sub
                                      ? `${theme.accent} font-bold bg-white/5`
                                      : 'text-white/80 hover:text-white hover:bg-white/5'
                                      }`}
                                  >
                                    {sub}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* User / Logout */}
          <div className="p-4 border-t border-white/10">
            <div
              className="flex items-center gap-3 px-2 mb-4 cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-colors relative"
              onClick={handleOpenProfileModal}
            >
              {currentUserProfile.photoBase64 ? (
                <div className={`w-10 h-10 rounded-full overflow-hidden border ${theme.border}`}>
                  <img src={currentUserProfile.photoBase64} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border ${theme.border}`}>
                  <Icon name="person" size={20} className="text-white/80" />
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold truncate max-w-[110px] pr-4">{isAdmin ? 'System Admin' : (currentUserProfile.fullname || 'Student')}</p>
                <p className="text-xs text-white/50">{isAdmin ? 'Superuser' : (localStorage.getItem('lastHopeStudentStream') || 'Student')}</p>
              </div>
              <div className="absolute right-2 flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                <Icon name="edit" size={14} className="text-white/70 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm font-medium"
              >
                <Icon name="logout" size={18} />
                Sign Out
              </button>
              <button
                onClick={() => setBgVideoEnabled(!bgVideoEnabled)}
                className={`w-11 flex flex-col items-center justify-center rounded-lg border transition-colors ${bgVideoEnabled ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}
                title={bgVideoEnabled ? 'Turn Off Background Video' : 'Turn On Background Video'}
              >
                <Icon name={bgVideoEnabled ? 'videocam' : 'videocam_off'} size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Dashboard Area ── */}
        <main className={`flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden transition-all duration-700 delay-300 w-full ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>

          {/* Top Header */}
          {(!(!isAdmin && activeTab === 'Overview')) && (
            <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-white/10 premium-blur sticky top-0 z-20 shrink-0 w-full transition-all duration-700 delay-200">
              <h2 className="text-xl font-semibold tracking-tight">
                {activeTab}
                {selectedClass && <span className="opacity-50 text-base font-normal ml-2">/ {selectedClass}</span>}
                {selectedSemester && <span className="opacity-50 text-base font-normal ml-1">/ {selectedSemester}</span>}
              </h2>

              <div className="flex items-center gap-4">
                <button className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${theme.hoverBg} transition-colors relative`}>
                  <Icon name="notifications" size={20} className="text-white/80" />
                  <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${theme.accentBg} ${theme.accentGlow} animate-pulse`} />
                </button>
              </div>
            </header>
          )}
          {/* Dynamic Content Area */}
          <div className="p-8 max-w-[1800px] mx-auto w-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Payment Upload Modal (Global) */}
      {showPaymentModal && unlockingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#091426] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative animate-fade-in my-8">
            <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
              <Icon name="cloud_upload" size={28} className={theme.accent} />
              Upload Payment Proof
            </h3>

            {/* Course Summary Box */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-lg mb-1">{unlockingCourse.title}</h4>
              <div className="flex items-center gap-4 text-xs text-white/50 mb-2">
                <span><Icon name="business" size={14} className="inline mr-1 align-sub" />{unlockingCourse.className}</span>
                <span><Icon name="school" size={14} className="inline mr-1 align-sub" />Semester {unlockingCourse.semester}</span>
              </div>
              <p className="text-xs text-white/70 line-clamp-2 italic border-l-2 border-white/20 pl-2">{unlockingCourse.description}</p>
            </div>

            <p className="text-white/60 text-sm mb-6">Please choose your desired access duration, upload a screenshot of your successful transaction, and enter your name to verify.</p>

            <div className="space-y-6 mb-8">

              {/* Duration Selection */}
              <div>
                <label className="text-xs font-mono text-white/50 px-1 mb-2 block">SELECT ACCESS DURATION</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '1 Month', value: 1 },
                    { label: '3 Months', value: 3 },
                    { label: '6 Months', value: 6 },
                    { label: 'Lifetime', value: 1200 }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setRequestedDuration(option.value)}
                      className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${requestedDuration === option.value
                        ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-white/50 px-1 mb-1 block">YOUR NAME</label>
                <input type="text" value={paymentName} onChange={e => setPaymentName(e.target.value)} required placeholder="e.g. John Doe" className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-transparent focus:ring-2 ${theme.inputFocus} transition-all`} />
              </div>
              <div>
                <label className="text-xs font-mono text-white/50 px-1 mb-1 block">PAYMENT SCREENSHOT</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_DIM = 800;
                        if (width > height && width > MAX_DIM) {
                          height *= MAX_DIM / width;
                          width = MAX_DIM;
                        } else if (height > MAX_DIM) {
                          width *= MAX_DIM / height;
                          height = MAX_DIM;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        setPaymentScreenshot(canvas.toDataURL('image/jpeg', 0.6));
                      };
                      img.src = reader.result;
                    };
                    reader.readAsDataURL(file);
                  }
                }} required className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-transparent focus:ring-2 ${theme.inputFocus} transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer`} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowPaymentModal(false); setPaymentScreenshot(null); setPaymentName(''); }} className="flex-1 py-3.5 rounded-xl border border-white/20 hover:bg-white/5 transition-colors font-semibold text-white">Cancel</button>
              <button onClick={() => {
                if (paymentName && paymentScreenshot) {
                  handleUnlockRequest(unlockingCourse.id, paymentName, paymentScreenshot, requestedDuration)
                  setShowPaymentModal(false)
                  setPaymentName('')
                  setPaymentScreenshot(null)
                  setRequestedDuration(1)
                }
              }} disabled={!paymentName || !paymentScreenshot} className={`flex-1 py-3.5 rounded-xl font-bold shadow-lg transition-transform ${(!paymentName || !paymentScreenshot) ? 'bg-white/10 text-white/30 cursor-not-allowed' : `${theme.accentBg} text-[#091426] hover:scale-[1.02] active:scale-[0.98]`}`}>Submit Proof</button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal (Global) */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out" onClick={() => setFullScreenImage(null)}>
          <img src={fullScreenImage} alt="Payment Proof Full" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in" />
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
            <Icon name="close" size={36} />
          </button>
        </div>
      )}

      {/* In-App Picture-in-Picture Floating Player */}
      {pipVideo && (
        <DraggablePiP
          onClose={() => setPipVideo(null)}
          onExpand={() => {
            setPlayingVideo(pipVideo);
            setPipVideo(null);
          }}
          onPopOut={() => {
            const ytMatch = pipVideo.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
            const ytId = ytMatch ? ytMatch[1] : null;
            const embedUrl = ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0` : pipVideo;

            if ('documentPictureInPicture' in window) {
              window.documentPictureInPicture.requestWindow({
                width: 480, height: 270
              }).then(pipWindow => {
                // Use our local proxy route to bypass YouTube's about:blank Error 153 constraint
                const proxyUrl = `${window.location.origin}/?pipUrl=${encodeURIComponent(embedUrl)}`;
                const iframe = document.createElement('iframe');
                iframe.src = proxyUrl;
                iframe.style.width = '100vw';
                iframe.style.height = '100vh';
                iframe.style.border = 'none';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                iframe.allowFullscreen = true;
                pipWindow.document.body.style.margin = '0';
                pipWindow.document.body.style.overflow = 'hidden';
                pipWindow.document.body.appendChild(iframe);
              }).catch(err => {
                window.open(embedUrl, 'pip', 'width=480,height=270,menubar=no,toolbar=no,status=no,location=no');
              });
            } else {
              window.open(embedUrl, 'pip', 'width=480,height=270,menubar=no,toolbar=no,status=no,location=no');
            }
            setPipVideo(null);
          }}
        >
          {(() => {
            const ytMatch = pipVideo.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
            const ytId = ytMatch ? ytMatch[1] : null;
            const dId = extractGoogleDriveId(pipVideo);
            const isLocalVideo = pipVideo.startsWith('/') || pipVideo.endsWith('.mp4') || pipVideo.endsWith('.webm');

            if (isLocalVideo) {
              return <video src={pipVideo} controls autoPlay className="w-full h-full bg-[#091426]" />;
            } else if (ytId) {
              return (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                  className="w-full h-full pointer-events-auto"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullscreen
                />
              );
            } else if (dId) {
              return <iframe src={`https://drive.google.com/file/d/${dId}/preview`} className="w-full h-full" allow="autoplay" />;
            }
            return <div className="p-4 text-white text-sm">Video format not supported in PiP.</div>;
          })()}
        </DraggablePiP>
      )}

      {/* Video Player Modal (Global) */}
      {playingVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 sm:p-8 animate-fade-in">
          <button
            onClick={() => setPlayingVideo(null)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-red-500 hover:text-white text-white/70 flex items-center justify-center transition-all shadow-2xl z-10"
          >
            <Icon name="close" size={24} />
          </button>

          <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 relative">
            {(() => {
              const ytId = extractYouTubeId(playingVideo);
              const isLocalVideo = playingVideo.startsWith('/') || playingVideo.endsWith('.mp4') || playingVideo.endsWith('.webm') || playingVideo.endsWith('.ogg');
              const isImage = /\.(jpeg|jpg|gif|png|webp|avif|svg)(?:\?.*)?$/i.test(playingVideo) || playingVideo.includes('unsplash.com') || playingVideo.includes('images.pexels');
              const instaMatch = playingVideo.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
              const instaId = instaMatch ? instaMatch[1] : null;

              if (isLocalVideo) {
                return (
                  <video
                    src={playingVideo}
                    controls
                    autoPlay
                    className="w-full h-full pointer-events-auto bg-[#091426]"
                  />
                );
              } else if (isImage) {
                return (
                  <img
                    src={playingVideo}
                    alt="Preview"
                    className="w-full h-full object-contain bg-[#091426]"
                  />
                );
              } else if (instaId) {
                return (
                  <iframe
                    src={`https://www.instagram.com/reel/${instaId}/embed/?autoplay=1`}
                    className="w-full h-full pointer-events-auto bg-white"
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                );
              } else if (ytId) {
                return (
                  <div className="relative w-full h-full">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=0&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&playsinline=1&iv_load_policy=3&showinfo=0`}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                    />
                    <div className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto" />
                  </div>
                );
              } else {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#091426]">
                    <Icon name="error" size={48} className="text-red-500 mb-4" />
                    <p className="text-white/70">Invalid media URL. Please check the link format.</p>
                    <a href={playingVideo} target="_blank" rel="noreferrer" className="mt-4 px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">Open externally</a>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {/* Profile Settings Modal */}
      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-gradient-to-b from-[#111827] to-[#0f172a] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-sm shadow-[0_0_80px_rgba(0,0,0,0.6)] relative my-4">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-red-500 hover:text-white text-white/50 flex items-center justify-center transition-all"
            >
              <Icon name="close" size={18} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <Icon name="manage_accounts" size={20} className={theme.accent} />
              </div>
              Profile Settings
            </h3>

            {profileError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                <Icon name="error" size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-200 leading-snug">{profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-2">
                <Icon name="check_circle" size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-200 leading-snug">{profileSuccess}</p>
              </div>
            )}

            {!profileOtpStep ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <label className="relative cursor-pointer group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-amber-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-[3px] border-white/20 group-hover:border-white/50 transition-all bg-[#091426]">
                      {profileFormData.photoBase64 ? (
                        <img src={profileFormData.photoBase64} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="person" size={32} className="text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <Icon name="photo_camera" size={20} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setProfileFormData(p => ({ ...p, photoBase64: ev.target.result }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-white/50 tracking-widest uppercase pl-1">Full Name</label>
                  <div className="relative group">
                    <Icon name="badge" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
                    <input
                      type="text"
                      value={profileFormData.name}
                      onChange={e => setProfileFormData(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-3 text-[13px] text-white focus:outline-none focus:bg-white/5 focus:border-white/30 focus:ring-2 focus:ring-white/5 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-mono text-white/50 tracking-widest uppercase">Email Address</label>
                    {profileEditMode !== 'email' && (
                      <button type="button" onClick={() => setProfileEditMode('email')} className="text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors px-1 border-b border-amber-400/30 hover:border-amber-300">Edit</button>
                    )}
                  </div>
                  {profileEditMode === 'email' ? (
                    <div className="space-y-2 animate-fade-in border border-amber-500/20 p-2 rounded-xl bg-amber-500/5">
                      <div className="relative">
                        <Icon name="alternate_email" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50" />
                        <input
                          type="email"
                          value={profileFormData.email}
                          onChange={e => setProfileFormData(p => ({ ...p, email: e.target.value }))}
                          className="w-full bg-black/30 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[13px] text-white focus:outline-none focus:border-amber-500/50 transition-all"
                          placeholder="New Email"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setProfileEditMode(null); setProfileFormData(p => ({ ...p, email: auth.currentUser?.email || '' })); setProfileError(''); }} className="flex-1 text-[11px] py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                        <button type="button" onClick={() => handleSendOtp('email')} disabled={profileIsLoading} className="flex-1 text-[11px] py-2 rounded-lg bg-amber-500/20 text-amber-300 font-semibold hover:bg-amber-500/30 transition-colors">Send OTP</button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <Icon name="alternate_email" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        value={profileFormData.email}
                        disabled
                        className="w-full bg-black/10 border border-white/5 rounded-xl py-3 pl-10 pr-3 text-[13px] text-white/50 cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-mono text-white/50 tracking-widest uppercase">Password</label>
                    {profileEditMode !== 'password' && (
                      <button type="button" onClick={() => setProfileEditMode('password')} className="text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors px-1 border-b border-amber-400/30 hover:border-amber-300">Edit</button>
                    )}
                  </div>
                  {profileEditMode === 'password' ? (
                    <div className="space-y-2 animate-fade-in border border-amber-500/20 p-2 rounded-xl bg-amber-500/5">
                      <div className="relative">
                        <Icon name="lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50" />
                        <input
                          type="password"
                          value={profileFormData.password}
                          onChange={e => setProfileFormData(p => ({ ...p, password: e.target.value }))}
                          className="w-full bg-black/30 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[13px] text-white focus:outline-none focus:border-amber-500/50 transition-all"
                          placeholder="New Password"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setProfileEditMode(null); setProfileFormData(p => ({ ...p, password: '' })); setProfileError(''); }} className="flex-1 text-[11px] py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                        <button type="button" onClick={() => handleSendOtp('password')} disabled={profileIsLoading} className="flex-1 text-[11px] py-2 rounded-lg bg-amber-500/20 text-amber-300 font-semibold hover:bg-amber-500/30 transition-colors">Send OTP</button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <Icon name="lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="password"
                        value="••••••••"
                        disabled
                        className="w-full bg-black/10 border border-white/5 rounded-xl py-3 pl-10 pr-3 text-[13px] text-white/50 cursor-not-allowed tracking-widest"
                      />
                    </div>
                  )}
                </div>

                {rateLimitStatus.text && (
                  <p className="text-[10px] text-center text-white/40 pt-2 font-mono">
                    {rateLimitStatus.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={profileIsLoading || profileEditMode}
                  className={`w-full mt-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white text-sm ${(profileIsLoading || profileEditMode) ? 'opacity-50 cursor-not-allowed bg-white/10' : `hover:scale-[1.02] active:scale-[0.98] ${theme.btnGrad}`}`}
                >
                  {profileIsLoading ? (
                    <><Icon name="sync" size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Icon name="save" size={18} /> Save Profile</>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleProfileOtpVerify} className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon name="mark_email_read" size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold mb-1">Verify Changes</h4>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Enter the 6-digit OTP sent to <strong className="text-white">{auth.currentUser?.email}</strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="block text-[10px] font-mono text-white/50 tracking-widest uppercase text-center mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={profileOtpCode}
                    onChange={e => setProfileOtpCode(e.target.value)}
                    placeholder="------"
                    maxLength={6}
                    className="w-full bg-black/30 border border-amber-500/30 rounded-xl py-4 px-3 text-center tracking-[0.8em] font-mono text-2xl text-white focus:outline-none focus:bg-amber-500/5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner placeholder:text-white/10"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setProfileOtpStep(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-semibold text-white/70 text-sm active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileIsLoading}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-lg text-white flex items-center justify-center gap-2 text-sm ${profileIsLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'} ${theme.btnGrad}`}
                  >
                    {profileIsLoading ? (
                      <><Icon name="sync" size={18} className="animate-spin" /> Verifying...</>
                    ) : (
                      <><Icon name="verified_user" size={18} /> Verify</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ChatBot />
    </div>
  )
}
