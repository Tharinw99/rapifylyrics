import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { RapSong, PlanContent } from '../types';
import { ArrowLeft, Lightbulb, BookOpen, Music2, PenLine } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore_errors';

const DEFAULT_PLAN: PlanContent = {
  mood: '',
  bpm: '',
  themes: '',
  notes: '',
  linkedSongId: null
};

export function PlanView() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.initialData as RapSong | undefined;

  const [song, setSong] = useState<RapSong | null>(initialData || null);
  const [plan, setPlan] = useState<PlanContent>(() => {
    if (initialData?.contentJson) {
      try { return JSON.parse(initialData.contentJson); } catch(e) {}
    }
    return DEFAULT_PLAN;
  });
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!planId) return;
    const unsub = onSnapshot(doc(db, 'songs', planId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as RapSong;
        setSong(prev => ({ ...prev, ...data }));
      }
    }, (e) => {
      handleFirestoreError(e, OperationType.GET, `songs/${planId}`);
    });
    return unsub;
  }, [planId]);

  useEffect(() => {
    if (!song || !planId) return;
    const saveChanges = async () => {
      try {
        await updateDoc(doc(db, 'songs', planId), {
          contentJson: JSON.stringify(plan),
          updatedAt: new Date()
        });
      } catch (e) {
        console.error("Autosave error", e);
      }
    };

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveChanges, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [plan, planId, song]);

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!song) return;
    const newTitle = e.target.value;
    setSong(prev => prev ? { ...prev, title: newTitle } : prev);
    
    // Independent timeout for title to avoid conflicts
    setTimeout(async () => {
      if (planId) {
        await updateDoc(doc(db, 'songs', planId), { title: newTitle, updatedAt: new Date() });
      }
    }, 1000);
  };
  
  if (!song) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading Plan...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Drive
        </button>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="text-yellow-500 w-8 h-8" />
            <input 
              type="text" 
              value={song.title}
              onChange={handleTitleChange}
              className="w-full bg-transparent border-none outline-none text-4xl tracking-tighter font-semibold text-white placeholder:text-zinc-600 focus:ring-0 p-0"
              placeholder="Plan Title"
            />
          </div>
          <p className="text-zinc-500 text-sm">Organize your thoughts, concepts, and mood.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 focus-within:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2 text-zinc-400 font-medium mb-4">
                <Music2 className="w-4 h-4" /> Vibe & BPM
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Mood / Inspiration</label>
                  <input 
                    type="text"
                    value={plan.mood}
                    onChange={(e) => setPlan({ ...plan, mood: e.target.value })}
                    placeholder="e.g. Dark, Aggressive, Nostalgic..."
                    className="w-full bg-transparent border-b border-zinc-800 text-zinc-200 outline-none p-2 focus:border-yellow-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">BPM / Tempo</label>
                  <input 
                    type="text"
                    value={plan.bpm}
                    onChange={(e) => setPlan({ ...plan, bpm: e.target.value })}
                    placeholder="e.g. 140 BPM, up-beat..."
                    className="w-full bg-transparent border-b border-zinc-800 text-zinc-200 outline-none p-2 focus:border-yellow-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 focus-within:border-zinc-700 transition-colors h-64 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 font-medium mb-4">
                <BookOpen className="w-4 h-4" /> Core Themes
              </div>
              <textarea 
                value={plan.themes}
                onChange={(e) => setPlan({ ...plan, themes: e.target.value })}
                placeholder="What is this track fundamentally about? Main storylines, emotions..."
                className="w-full h-full bg-transparent resize-none outline-none text-zinc-200 placeholder:text-zinc-700"
              />
            </div>
          </div>
          
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 focus-within:border-zinc-700 transition-colors flex flex-col h-full">
            <div className="flex items-center gap-2 text-zinc-400 font-medium mb-4">
              <PenLine className="w-4 h-4" /> Brainstorm Notes
            </div>
            <textarea 
              value={plan.notes}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
              placeholder="Jot down loose bars, rhyme schemes, flow ideas, or anything else..."
              className="w-full h-full bg-transparent resize-none outline-none text-zinc-200 placeholder:text-zinc-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
