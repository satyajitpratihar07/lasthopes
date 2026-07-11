import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';

export default function PublicReelsPage() {
  const [reelsVideos, setReelsVideos] = useState([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('lastHopeReels');
    if (saved) {
      setReelsVideos(JSON.parse(saved));
    }
    
    // Sync if updated in another tab
    const handleStorage = () => {
      const updated = localStorage.getItem('lastHopeReels');
      if (updated) setReelsVideos(JSON.parse(updated));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getEmbedUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url;
    if (url.includes('instagram.com/reel/') || url.includes('instagram.com/p/')) {
      try {
        const urlObj = new URL(url);
        urlObj.search = ''; 
        cleanUrl = urlObj.toString();
        if (!cleanUrl.endsWith('/')) cleanUrl += '/';
        if (!cleanUrl.includes('/embed')) cleanUrl += 'embed/';
      } catch (e) {
        cleanUrl = url;
      }
    }
    // Append autoplay parameters
    if (cleanUrl.includes('?')) {
      return cleanUrl + '&autoplay=1&mute=0';
    } else {
      return cleanUrl + '?autoplay=1&mute=0';
    }
  };

  const handleNext = () => {
    if (currentReelIndex < reelsVideos.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    }
  };

  const handleDownload = () => {
    const url = reelsVideos[currentReelIndex];
    if (url) {
      window.open(url, '_blank');
    }
  };

  const currentUrl = reelsVideos[currentReelIndex] || '';
  const embedUrl = getEmbedUrl(currentUrl);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-6 text-center text-amber-400">Public Reels Feed</h2>
        
        <div className="w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 group mb-6">
          {embedUrl ? (
            <iframe 
              src={embedUrl} 
              title={`Reel ${currentReelIndex}`} 
              className="w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="play_circle" size={64} className="text-white/50" />
              </div>
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <h4 className="font-bold">No reels available</h4>
                <p className="text-sm text-white/70">Check back later!</p>
              </div>
            </>
          )}

          {embedUrl && (
            <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
              <button 
                onClick={handleDownload}
                className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/80 hover:text-amber-400 transition-all border border-white/10 shadow-lg"
                title="Download Reel"
              >
                <Icon name="download" size={24} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between w-full px-4">
          <button 
            onClick={handlePrev}
            disabled={currentReelIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${currentReelIndex === 0 ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Icon name="arrow_back" size={20} /> Prev
          </button>
          
          <span className="text-white/50 text-sm font-bold">
            {reelsVideos.length > 0 ? currentReelIndex + 1 : 0} / {reelsVideos.length}
          </span>
          
          <button 
            onClick={handleNext}
            disabled={currentReelIndex === reelsVideos.length - 1 || reelsVideos.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${currentReelIndex >= reelsVideos.length - 1 ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            Next <Icon name="arrow_forward" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
