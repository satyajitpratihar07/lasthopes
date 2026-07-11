import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

export default function DraggablePiP({ children, onClose, onExpand, onPopOut }) {
  const padding = 24;
  const initialWidth = 400;
  
  const [size, setSize] = useState({ width: initialWidth, height: initialWidth * (9/16) });
  const [position, setPosition] = useState({ 
    x: window.innerWidth - initialWidth - padding, 
    y: window.innerHeight - (initialWidth * (9/16)) - padding 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxX = window.innerWidth - size.width - padding;
        const maxY = window.innerHeight - size.height - padding;
        return {
          x: Math.min(Math.max(padding, prev.x), maxX),
          y: Math.min(Math.max(padding, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  // --- Dragging Logic ---
  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    if (e.target.closest('.resize-handle')) return;
    
    e.preventDefault();
    if (dragRef.current) dragRef.current.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    let newX = e.clientX - offset.current.x;
    let newY = e.clientY - offset.current.y;
    
    const maxX = window.innerWidth - size.width - padding;
    const maxY = window.innerHeight - size.height - padding;
    
    const snap = 20;
    if (newX < padding + snap) newX = padding;
    if (newX > maxX - snap) newX = maxX;
    if (newY < padding + snap) newY = padding;
    if (newY > maxY - snap) newY = maxY;
    
    newX = Math.max(padding, Math.min(newX, maxX));
    newY = Math.max(padding, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      if (dragRef.current && dragRef.current.hasPointerCapture(e.pointerId)) {
        dragRef.current.releasePointerCapture(e.pointerId);
      }
      setIsDragging(false);
    }
  };

  // --- Resizing Logic ---
  const handleResizeDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (resizeRef.current) resizeRef.current.setPointerCapture(e.pointerId);
    
    setIsResizing(true);
    resizeStart.current = {
      w: size.width,
      h: size.height,
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    let newWidth = resizeStart.current.w + (e.clientX - resizeStart.current.x);
    
    // Bounds: Min 250px, Max constraints
    const minWidth = 250;
    const maxWidth = window.innerWidth - position.x - padding;
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    
    const newHeight = newWidth * (9/16);
    
    // Ensure height doesn't overflow bottom
    if (position.y + newHeight > window.innerHeight - padding) {
       const maxAllowedHeight = window.innerHeight - position.y - padding;
       newWidth = maxAllowedHeight * (16/9);
    }
    
    setSize({ width: newWidth, height: newWidth * (9/16) });
  };

  const handleResizeUp = (e) => {
    if (isResizing) {
      if (resizeRef.current && resizeRef.current.hasPointerCapture(e.pointerId)) {
        resizeRef.current.releasePointerCapture(e.pointerId);
      }
      setIsResizing(false);
    }
  };

  return (
    <div 
      className={`fixed z-[200] rounded-2xl overflow-hidden shadow-[0_16px_60px_rgba(0,0,0,0.8)] border border-teal-500/50 bg-black group/pip ${isDragging || isResizing ? 'animate-none' : 'animate-fade-in'}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transition: (isDragging || isResizing) ? 'none' : 'box-shadow 0.3s ease'
      }}
    >
      <div 
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black/80 to-transparent z-10 touch-none flex items-start justify-end p-3 gap-3 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <button 
          onClick={onPopOut}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-lg pointer-events-auto"
          title="Pop Out to OS Window (Survives tab close)"
        >
          <Icon name="open_in_new" size={16} />
        </button>
        <button 
          onClick={onExpand}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-teal-500 text-white flex items-center justify-center transition-all shadow-lg pointer-events-auto"
          title="Expand to Full Player"
        >
          <Icon name="fullscreen" size={18} />
        </button>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg pointer-events-auto"
          title="Close"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      
      {/* Invisible overlay over iframe while dragging/resizing so mouse events aren't swallowed by iframe */}
      {(isDragging || isResizing) && <div className="absolute inset-0 z-[5] bg-transparent pointer-events-auto" />}
      
      <div className={`w-full h-full relative ${isDragging || isResizing ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        {children}
      </div>

      {/* Resize Handle (Bottom Right) */}
      <div 
        ref={resizeRef}
        onPointerDown={handleResizeDown}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
        onPointerCancel={handleResizeUp}
        className="resize-handle absolute bottom-0 right-0 w-8 h-8 z-20 cursor-se-resize flex items-end justify-end p-1.5 opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M21 15L15 21M21 8L8 21" />
        </svg>
      </div>
    </div>
  );
}
