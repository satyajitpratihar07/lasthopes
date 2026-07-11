import React, { useState } from 'react';
import Icon from './Icon';

const SCALES = {
  '10-point-standard': {
    name: 'Standard 10-Point (CGPA × 10)',
    max: 10,
    calcPercentage: (cgpa) => Math.min(100, Math.max(0, cgpa * 10)),
    grades: { 'O': 10, 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'P': 4, 'F': 0 }
  },
  'makaut': {
    name: 'MAKAUT / WBUT ((CGPA - 0.75) × 10)',
    max: 10,
    calcPercentage: (cgpa) => cgpa > 0.75 ? Math.min(100, (cgpa - 0.75) * 10) : 0,
    grades: { 'O': 10, 'E': 9, 'A': 8, 'B': 7, 'C': 6, 'D': 5, 'F': 0 }
  },
  'mumbai': {
    name: 'Mumbai University (CGPA × 7.1 + 11)',
    max: 10,
    calcPercentage: (cgpa) => cgpa > 0 ? Math.min(100, cgpa * 7.1 + 11) : 0,
    grades: { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 }
  },
  'vtu': {
    name: 'VTU ((CGPA - 0.75) × 10)',
    max: 10,
    calcPercentage: (cgpa) => cgpa > 0.75 ? Math.min(100, (cgpa - 0.75) * 10) : 0,
    grades: { 'S': 10, 'A': 9, 'B': 8, 'C': 7, 'D': 6, 'E': 4, 'F': 0 }
  },
  'cbse-10': {
    name: 'Standard 9.5 Multiplier (CGPA × 9.5)',
    max: 10,
    calcPercentage: (cgpa) => Math.min(100, Math.max(0, cgpa * 9.5)),
    grades: { 'O': 10, 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C': 6, 'D': 5, 'P': 4, 'F': 0 }
  },
  '4-point-us': {
    name: 'US 4-Point Scale',
    max: 4,
    calcPercentage: (cgpa) => Math.min(100, Math.max(0, (cgpa / 4) * 100)),
    grades: { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0 }
  }
};

export default function StudentGradeCalculator({ theme }) {
  const [selectedScaleId, setSelectedScaleId] = useState('10-point-standard');
  const scale = SCALES[selectedScaleId];

  const [subjects, setSubjects] = useState([
    { id: 1, name: 'Core Subject 1', credits: 4, grade: Object.keys(scale.grades)[0] },
    { id: 2, name: 'Core Subject 2', credits: 4, grade: Object.keys(scale.grades)[1] || Object.keys(scale.grades)[0] },
    { id: 3, name: 'Lab 1', credits: 2, grade: Object.keys(scale.grades)[0] }
  ]);

  const [pastSemesters, setPastSemesters] = useState([
    { id: 1, name: 'Semester 1', sgpa: (scale.max * 0.85).toFixed(2), credits: '20' },
  ]);

  const handleScaleChange = (newScaleId) => {
    const newScale = SCALES[newScaleId];
    setSelectedScaleId(newScaleId);
    
    // Adjust current subjects to fallback to a valid grade in the new scale
    setSubjects(subjects.map(sub => {
      if (newScale.grades[sub.grade] === undefined) {
        return { ...sub, grade: Object.keys(newScale.grades)[0] };
      }
      return sub;
    }));
  };

  const currentTotalCredits = subjects.reduce((sum, sub) => sum + Number(sub.credits), 0);
  const currentTotalPoints = subjects.reduce((sum, sub) => sum + (Number(sub.credits) * (scale.grades[sub.grade] || 0)), 0);
  const currentSgpa = currentTotalCredits > 0 ? (currentTotalPoints / currentTotalCredits) : 0;

  const pastTotalCredits = pastSemesters.reduce((sum, sem) => sum + Number(sem.credits || 0), 0);
  const pastTotalPoints = pastSemesters.reduce((sum, sem) => sum + (Number(sem.credits || 0) * Number(sem.sgpa || 0)), 0);
  
  const overallCredits = currentTotalCredits + pastTotalCredits;
  const cgpaRaw = overallCredits > 0 ? ((currentTotalPoints + pastTotalPoints) / overallCredits) : 0;
  
  const currentSgpaDisplay = currentSgpa.toFixed(2);
  const cgpaDisplay = cgpaRaw.toFixed(2);
  const percentageDisplay = scale.calcPercentage(cgpaRaw).toFixed(2);

  // Calculate YGPA
  const lastPastSemester = pastSemesters[pastSemesters.length - 1];
  let ygpaDisplay = '0.00';
  if (lastPastSemester && lastPastSemester.sgpa && lastPastSemester.credits) {
    const yearCredits = currentTotalCredits + Number(lastPastSemester.credits);
    const yearPoints = currentTotalPoints + (Number(lastPastSemester.credits) * Number(lastPastSemester.sgpa));
    ygpaDisplay = yearCredits > 0 ? (yearPoints / yearCredits).toFixed(2) : '0.00';
  } else {
    ygpaDisplay = currentSgpaDisplay;
  }

  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now(), name: `Subject ${subjects.length + 1}`, credits: 3, grade: Object.keys(scale.grades)[0] }]);
  };

  const updateSubject = (id, field, value) => {
    setSubjects(subjects.map(sub => sub.id === id ? { ...sub, [field]: value } : sub));
  };

  const removeSubject = (id) => {
    setSubjects(subjects.filter(sub => sub.id !== id));
  };

  const addPastSemester = () => {
    setPastSemesters([...pastSemesters, { id: Date.now(), name: `Semester ${pastSemesters.length + 1}`, sgpa: '', credits: '' }]);
  };

  const updatePastSemester = (id, field, value) => {
    // Make sure we don't exceed max GPA for the scale
    let val = value;
    if (field === 'sgpa' && Number(val) > scale.max) {
      val = scale.max.toString();
    }
    setPastSemesters(pastSemesters.map(sem => sem.id === id ? { ...sem, [field]: val } : sem));
  };

  const removePastSemester = (id) => {
    setPastSemesters(pastSemesters.filter(sem => sem.id !== id));
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 px-1 gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl ${theme.accentBg}/10 flex items-center justify-center border ${theme.border}`}>
            <Icon name="calculate" size={24} className={theme.accent} />
          </div>
          <div>
            <h3 className="text-3xl font-bold">Universal Grade Calculator</h3>
            <p className="text-white/50 text-sm">Accurate CGPA & Percentage for all major Universities</p>
          </div>
        </div>
        
        {/* Scale Selector */}
        <div className="bg-[#091426]/80 p-2 rounded-2xl border border-white/10 premium-blur flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Icon name="account_balance" size={20} className="text-white/70" />
          </div>
          <div className="flex flex-col pr-4">
            <label className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Select University Standard</label>
            <select 
              value={selectedScaleId}
              onChange={(e) => handleScaleChange(e.target.value)}
              className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
            >
              {Object.entries(SCALES).map(([id, sc]) => (
                <option key={id} value={id} className="bg-[#091426] text-white">{sc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="lg:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-[#091426] border border-indigo-500/30 premium-blur relative overflow-hidden group shadow-[0_0_40px_rgba(99,102,241,0.15)] flex items-center justify-between">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest border border-indigo-500/30">Total Percentage</span>
            </div>
            <h3 className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              {percentageDisplay}<span className="text-3xl text-indigo-400/50 font-bold">%</span>
            </h3>
            <p className="text-indigo-200/50 text-sm mt-3 font-medium flex items-center gap-1">
              <Icon name="info" size={14} /> Formula: {scale.name.split('(')[1]?.replace(')', '') || scale.name}
            </p>
          </div>
          
          <div className="relative z-10 flex-shrink-0 ml-4 hidden sm:block">
            {/* Visual Circular Gauge */}
            <div className="w-32 h-32 rounded-full border-8 border-indigo-500/20 flex items-center justify-center relative shadow-inner">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="64" cy="64" r="56" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent" 
                  className="text-indigo-500 transition-all duration-1000 ease-out drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  strokeDasharray="351.8" 
                  strokeDashoffset={351.8 - (351.8 * scale.calcPercentage(cgpaRaw)) / 100} 
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <Icon name="military_tech" size={32} className="text-indigo-400 mb-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-[#091426] border border-blue-500/30 premium-blur flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity group-hover:scale-110 duration-500">
            <Icon name="school" size={64} className="text-blue-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-blue-400 mb-2 font-bold uppercase tracking-wider">Overall CGPA</p>
            <h3 className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              {cgpaDisplay} <span className="text-xl text-white/30 font-normal">/ {scale.max}</span>
            </h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-green-500/10 to-[#091426] border border-green-500/30 premium-blur flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity group-hover:scale-110 duration-500">
            <Icon name="trending_up" size={64} className="text-green-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-green-400 mb-2 font-bold uppercase tracking-wider">Current SGPA</p>
            <h3 className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">
              {currentSgpaDisplay} <span className="text-xl text-white/30 font-normal">/ {scale.max}</span>
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Current Semester SGPA Calculator */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl premium-blur overflow-hidden flex flex-col shadow-2xl">
          <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                <Icon name="edit_note" size={20} />
              </div>
              <h4 className="font-bold text-xl text-white">Current Semester</h4>
            </div>
            <span className="px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm font-bold shadow-inner">
              Credits: {currentTotalCredits}
            </span>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
            {subjects.map((sub, index) => (
              <div key={sub.id} className="flex flex-col sm:flex-row gap-3 items-center bg-black/20 p-3 rounded-2xl border border-white/5 hover:border-white/20 transition-all shadow-sm">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => updateSubject(sub.id, 'name', e.target.value)}
                  className="flex-1 bg-transparent border-b border-white/10 focus:border-blue-500/50 px-2 py-1 text-white focus:outline-none transition-colors"
                  placeholder="Subject Name"
                />
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={sub.credits}
                      onChange={(e) => updateSubject(sub.id, 'credits', e.target.value)}
                      className="appearance-none bg-[#091426] border border-white/20 rounded-xl pl-4 pr-8 py-2.5 text-white focus:outline-none focus:border-blue-500/50 cursor-pointer font-medium"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                        <option key={c} value={c}>{c} Cr</option>
                      ))}
                    </select>
                    <Icon name="expand_more" size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                  </div>
                  
                  <div className="relative">
                    <select
                      value={sub.grade}
                      onChange={(e) => updateSubject(sub.id, 'grade', e.target.value)}
                      className="appearance-none bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl pl-4 pr-8 py-2.5 focus:outline-none focus:border-blue-400 font-bold text-center w-20 cursor-pointer shadow-inner"
                    >
                      {Object.keys(scale.grades).map(g => (
                        <option key={g} value={g} className="bg-[#091426] text-white">{g}</option>
                      ))}
                    </select>
                    <Icon name="expand_more" size={16} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400/50 pointer-events-none" />
                  </div>

                  <button 
                    onClick={() => removeSubject(sub.id)}
                    className="w-11 h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors shrink-0 ml-1 border border-red-500/20"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={addSubject}
              className="w-full py-4 mt-2 border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl text-white/50 hover:text-blue-400 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
            >
              <Icon name="add_circle_outline" size={20} />
              Add Subject
            </button>
          </div>
        </div>

        {/* Past Semesters for CGPA */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl premium-blur overflow-hidden flex flex-col shadow-2xl">
          <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
                <Icon name="history" size={20} />
              </div>
              <h4 className="font-bold text-xl text-white">Past Semesters</h4>
            </div>
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold">
              YGPA: {ygpaDisplay}
            </span>
          </div>
          
          <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[500px]">
            <p className="text-xs text-white/40 mb-4 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed">
              Add previous semesters' SGPA and credits to calculate cumulative CGPA & Percentage.
            </p>
            
            {pastSemesters.map((sem, index) => (
              <div key={sem.id} className="flex flex-col gap-3 bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all shadow-sm">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <input
                    type="text"
                    value={sem.name}
                    onChange={(e) => updatePastSemester(sem.id, 'name', e.target.value)}
                    className="w-32 bg-transparent focus:border-amber-500/50 px-1 py-1 text-white focus:outline-none font-bold text-sm"
                    placeholder="Semester Name"
                  />
                  <button 
                    onClick={() => removePastSemester(sem.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Icon name="delete_outline" size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-bold">SGPA (Max {scale.max})</label>
                    <input
                      type="number"
                      min="0"
                      max={scale.max}
                      step="0.01"
                      value={sem.sgpa}
                      onChange={(e) => updatePastSemester(sem.id, 'sgpa', e.target.value)}
                      className="bg-[#091426] border border-white/20 rounded-xl px-4 py-2.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500/50 shadow-inner"
                      placeholder={`e.g. ${(scale.max * 0.85).toFixed(2)}`}
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-bold">Total Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={sem.credits}
                      onChange={(e) => updatePastSemester(sem.id, 'credits', e.target.value)}
                      className="bg-[#091426] border border-white/20 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-white/50 shadow-inner"
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={addPastSemester}
              className="w-full py-4 mt-2 border-2 border-dashed border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-2xl text-white/50 hover:text-amber-400 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm"
            >
              <Icon name="add_circle_outline" size={20} />
              Add Past Semester
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
