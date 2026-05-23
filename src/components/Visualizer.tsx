import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

export function Visualizer({ audioRef, isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    // Only init AudioContext upon interaction. We'll wait until audio actually plays.
    if (!isPlaying || !audioRef.current) return;

    try {
      const w = window as any;
      if (!w.audioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        w.audioCtx = new AudioContext();
      }
      const audioCtx = w.audioCtx;
      
      // Ensure we resume if suspended
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      if (!analyserRef.current && !(audioRef.current as any).sourceAttached) {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        
        const source = audioCtx.createMediaElementSource(audioRef.current);
        (audioRef.current as any).sourceAttached = true;
        
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
      }
    } catch (e) {
      console.warn("Audio context already created or failed to initialize", e);
    }
  }, [isPlaying, audioRef]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      // Clear canvas
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!analyserRef.current || !dataArrayRef.current) {
        // Fallback drawing if analyser isn't ready
        canvasCtx.fillStyle = '#27272a'; // zinc-800
        canvasCtx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
        return;
      }

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / analyser.frequencyBinCount) * 1.5;
      let x = 0;

      for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Gradient fill for each bar
        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#52525b'); // zinc-600
        gradient.addColorStop(1, '#a1a1aa'); // zinc-400
        
        canvasCtx.fillStyle = gradient;
        
        // Center the waveform vertically
        const y = (canvas.height - barHeight) / 2;
        
        canvasCtx.fillRect(x, y, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  );
}
