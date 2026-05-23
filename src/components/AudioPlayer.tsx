import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Repeat, Repeat1, Disc3, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Visualizer } from './Visualizer';
import { LoopState } from '../types';

interface AudioPlayerProps {
  url: string | null;
  name: string | null;
  onTimeUpdate?: (time: number) => void;
}

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ url, name, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [loopState, setLoopState] = useState<LoopState>({ a: null, b: null });

  useEffect(() => {
    setIsPlaying(false);
    setIsLoading(true);
    setCurrentTime(0);
    setLoopState({ a: null, b: null });
    if (url && audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(() => {
          // autoplay policy block, totally fine
        });
    }
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) onTimeUpdate(audio.currentTime);
      
      // Loop enforcement
      if (loopState.a !== null && loopState.b !== null) {
        if (audio.currentTime >= loopState.b) {
          audio.currentTime = loopState.a;
        }
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const onEnded = () => setIsPlaying(false);
    
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', () => setIsPlaying(true));
      audio.removeEventListener('pause', () => setIsPlaying(false));
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
    };
  }, [loopState, onTimeUpdate]);

  const togglePlay = async () => {
    if (!audioRef.current || !url) return;
    
    // Resume context if suspended
    const w = window as any;
    if (w.audioCtx && w.audioCtx.state === 'suspended') {
      try { await w.audioCtx.resume(); } catch(e) {}
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current || !url) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleLoopClick = () => {
    if (!url) return;
    
    if (loopState.a === null) {
      // Set Loop A
      setLoopState({ a: currentTime, b: null });
    } else if (loopState.b === null) {
      // Set Loop B (ensure B > A, if not, swap them)
      if (currentTime > loopState.a) {
        setLoopState({ a: loopState.a, b: currentTime });
      } else {
        setLoopState({ a: currentTime, b: loopState.a });
      }
    } else {
      // Clear Loop
      setLoopState({ a: null, b: null });
    }
  };

  if (!url) {
    return (
      <div className="h-20 bg-zinc-950/80 border-t border-zinc-900 backdrop-blur-3xl flex items-center justify-center text-zinc-600 text-sm font-medium uppercase tracking-wider relative bottom-0 w-full z-50">
        Load a beat to start spitting
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopAPercent = loopState.a !== null ? (loopState.a / duration) * 100 : null;
  const loopBPercent = loopState.b !== null ? (loopState.b / duration) * 100 : null;

  return (
    <div className="h-20 bg-zinc-950/90 border-t border-zinc-900 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex items-center px-4 md:px-6 relative bottom-0 w-full z-50 gap-4">
      <audio ref={audioRef} src={url} crossOrigin="anonymous" />
      
      {/* Explicit Play/Pause Button */}
      <button 
        onClick={togglePlay}
        disabled={isLoading}
        className={cn("w-12 h-12 shrink-0 bg-white text-black hover:bg-zinc-200 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md flex-none disabled:opacity-50 disabled:cursor-not-allowed")}
      >
        {isLoading ? (
           <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-1" />
        )}
      </button>

      <div className="flex flex-col flex-grow min-w-0 h-full justify-center space-y-1">
        <div className="flex items-center justify-between text-xs font-medium tracking-wide">
          <span className="text-zinc-200 truncate pr-4">{name || "Unknown Beat"}</span>
          <span className="text-zinc-500 tabular-nums shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        
        {/* Progress Bar / Visualizer Track */}
        <div 
           ref={progressRef}
           onClick={handleSeek}
           className="relative h-8 w-full bg-zinc-900/50 rounded-md overflow-hidden cursor-pointer group"
        >
          {/* Visualizer Background */}
          <div className="absolute inset-0 opacity-40">
            <Visualizer audioRef={audioRef} isPlaying={isPlaying} />
          </div>

          {/* Played Progress overlay */}
          <div 
            className="absolute top-0 left-0 h-full bg-white/5 pointer-events-none transition-transform duration-75 origin-left"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Playhead Line */}
          <div 
             className="absolute top-0 w-px h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 transition-all duration-75"
             style={{ left: `${progressPercent}%` }}
          />

          {/* Loop Region Visualization */}
          {loopAPercent !== null && (
            <div 
              className="absolute top-0 h-full w-[2px] bg-blue-500 z-10" 
              style={{ left: `${loopAPercent}%` }} 
            />
          )}
          {loopBPercent !== null && (
            <div 
              className="absolute top-0 h-full w-[2px] bg-blue-500 z-10" 
              style={{ left: `${loopBPercent}%` }} 
            />
          )}
          {loopAPercent !== null && loopBPercent !== null && (
            <div 
              className="absolute top-0 h-full bg-blue-500/20 z-0" 
              style={{ left: `${loopAPercent}%`, width: `${loopBPercent - loopAPercent}%` }} 
            />
          )}
        </div>
      </div>

      {/* Loop Button */}
      <button
        onClick={handleLoopClick}
        className={cn(
          "w-12 h-12 flex flex-col gap-0.5 items-center justify-center shrink-0 rounded-[10px] transition-all",
          loopState.a === null 
            ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900" 
            : loopState.b === null 
              ? "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.2)]" 
              : "text-blue-500 bg-blue-500/20 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
        )}
      >
        {loopState.b !== null ? (
          <Repeat1 className="w-5 h-5" />
        ) : (
          <Repeat className="w-5 h-5" />
        )}
        <span className="text-[9px] font-bold tracking-widest uppercase">
          {loopState.a === null ? 'Loop' : loopState.b === null ? 'End' : 'On'}
        </span>
      </button>

    </div>
  );
}
