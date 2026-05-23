import React, { useEffect, useRef, useState } from 'react';
import { KaraokeLine } from '../lib/karaoke';
import { X, Play, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface KaraokeViewProps {
  timeline: KaraokeLine[];
  currentTime: number;
  onClose: () => void;
  offset: number;
  onOffsetChange: (offset: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function KaraokeView({ timeline, currentTime, onClose, offset, onOffsetChange, speed, onSpeedChange }: KaraokeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Find active line based on current time
  let activeIndex = -1;
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (currentTime >= timeline[i].startTime) {
      activeIndex = i;
      break;
    }
  }

  // Auto-scroll logic
  useEffect(() => {
    if (activeIndex >= 0 && containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex]);

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur-3xl flex flex-col pt-16 animate-in fade-in duration-300">
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={cn("p-2 rounded-full transition-colors", showSettings ? "bg-zinc-800 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white")}
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button 
          onClick={onClose}
          className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute top-20 right-6 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl z-50 w-64 animate-in slide-in-from-top-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">Karaoke Tuning</h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 flex justify-between mb-2">
                <span>Start Offset</span>
                <span className="text-zinc-500 font-mono">{offset.toFixed(1)}s</span>
              </label>
              <input 
                type="range" 
                min="0" max="30" step="0.5"
                value={offset}
                onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
             <label className="text-xs font-medium text-zinc-300 flex justify-between mb-2">
                <span>Flow Speed</span>
                <span className="text-zinc-500 font-mono">{speed.toFixed(2)}s / syl</span>
              </label>
              <input 
                type="range" 
                min="0.1" max="0.5" step="0.05"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {timeline.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
           <p>No lyrics found.</p>
           <button onClick={onClose} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full">Go back and write</button>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-6 pb-40 relative no-scrollbar"
        >
          <div className="h-[40vh]" /> {/* Top padding for centered scroll */}
          <div className="flex flex-col gap-6 text-center">
            {timeline.map((line, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              const progress = isActive ? Math.max(0, Math.min(1, (currentTime - line.startTime) / (line.endTime - line.startTime))) : 0;
              
              return (
                <div 
                  key={line.id} 
                  data-active={isActive}
                  className={cn(
                    "transition-all duration-300 flex flex-col items-center",
                    isActive ? "scale-110 opacity-100" : isPast ? "opacity-30 blur-[1px] scale-95" : "opacity-40"
                  )}
                >
                  <span 
                    className={cn(
                       "text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight px-4 py-2 rounded-xl text-balance",
                       isActive ? "drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-zinc-100"
                    )}
                    style={isActive ? {
                      backgroundImage: `linear-gradient(to right, white ${progress * 100}%, rgba(255,255,255,0.3) ${progress * 100}%)`,
                      WebkitBackgroundClip: 'text',
                      color: 'transparent'
                    } : {}}
                  >
                    {line.text}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-[40vh]" /> {/* Bottom padding */}
        </div>
      )}
    </div>
  );
}
