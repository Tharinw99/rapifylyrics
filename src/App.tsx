import React, { useState, useCallback, useMemo } from 'react';
import { EditorSection } from './components/EditorSection';
import { AudioPlayer } from './components/AudioPlayer';
import { KaraokeView } from './components/KaraokeView';
import { Section, SectionType } from './types';
import { Plus, Upload, Mic2, Info } from 'lucide-react';
import { cn } from './lib/utils';
import { generateKaraokeTimeline, KaraokeLine } from './lib/karaoke';

export default function App() {
  const [sections, setSections] = useState<Section[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  
  // Rhyme State
  const [isRhymeCheckOn, setIsRhymeCheckOn] = useState(false);
  const [isAdvancedRhymeOn, setIsAdvancedRhymeOn] = useState(false);
  
  // Karaoke State
  const [currentTime, setCurrentTime] = useState(0);
  const [showKaraokeTutorial, setShowKaraokeTutorial] = useState(false);
  const [isKaraokeActive, setIsKaraokeActive] = useState(false);
  const [karaokeOffset, setKaraokeOffset] = useState(0);
  const [karaokeSpeed, setKaraokeSpeed] = useState(0.25);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const loadFile = (file: File) => {
    if (file && (file.type.includes('audio') || file.type.includes('video'))) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    loadFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  };

  const addSection = (type: SectionType) => {
    const verseCount = sections.filter(s => s.type === 'Verse').length;
    const name = type === 'Verse' ? `Verse ${verseCount + 1}` : type;
    
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      name,
      content: '',
      collapsed: false,
    };
    
    setSections([...sections, newSection]);
    setIsSectionMenuOpen(false);
  };

  const updateSectionContent = (id: string, content: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, content } : s));
  };

  const toggleSectionCollapse = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const sectionTypes: SectionType[] = ['Intro', 'Verse', 'Pre Hook', 'Hook', 'Bridge', 'Outro'];

  const karaokeTimeline = useMemo(() => {
    return generateKaraokeTimeline(sections, karaokeOffset, karaokeSpeed);
  }, [sections, karaokeOffset, karaokeSpeed]);

  const handleStartKaraokeClick = () => {
    setShowKaraokeTutorial(true);
  };

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500/50 flex items-center justify-center pointer-events-none">
          <div className="text-blue-400 font-medium text-2xl tracking-tight">Drop beat to load...</div>
        </div>
      )}

      {/* Main Editor Area */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">
          <header className="mb-12 flex items-end justify-between">
            <div>
              <h1 className="text-3xl tracking-tighter font-semibold text-white">Rapify</h1>
              <p className="text-zinc-500 mt-2 tracking-wide text-sm font-medium">Flow structure & bar architect.</p>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {/* Rhyme Controls */}
              {sections.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-900/50 rounded-full p-1 border border-zinc-800 overflow-hidden">
                  <button 
                    onClick={() => setIsRhymeCheckOn(!isRhymeCheckOn)}
                    className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors", isRhymeCheckOn ? "bg-white text-black" : "text-zinc-400 hover:text-white")}
                  >
                    Rhyme Check
                  </button>
                  {isRhymeCheckOn && (
                    <button 
                      onClick={() => setIsAdvancedRhymeOn(!isAdvancedRhymeOn)}
                      className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors", isAdvancedRhymeOn ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
                      title="Advanced Form: Checks substrings and exact vowel chains"
                    >
                      Adv. Check
                    </button>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer group">
                <Upload className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                Upload Beat
                <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} />
              </label>

              {audioUrl && sections.length > 0 && (
                <button 
                  onClick={handleStartKaraokeClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  Karaoke
                </button>
              )}
            </div>
          </header>

          <div className="space-y-2">
            {sections.length === 0 ? (
              <div className="text-center py-24 px-6 border border-zinc-800/50 rounded-xl bg-zinc-900/20 border-dashed">
                <p className="text-zinc-500 text-sm mb-6">Begin your session by adding a section.</p>
              </div>
            ) : (
              sections.map((section) => (
                <EditorSection 
                  key={section.id} 
                  section={section} 
                  onChange={updateSectionContent}
                  onToggleCollapse={toggleSectionCollapse}
                  onRemove={removeSection}
                  isRhymeCheckOn={isRhymeCheckOn}
                  isAdvancedRhymeOn={isAdvancedRhymeOn}
                />
              ))
            )}
          </div>

          <div className="mt-8 relative">
            {isSectionMenuOpen ? (
              <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-800 shadow-2xl flex flex-wrap gap-2 max-w-sm mb-4">
                {sectionTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => addSection(type)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-zinc-950 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
            ) : (
              <button 
                onClick={() => setIsSectionMenuOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors py-2 group"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-900 group-hover:bg-zinc-800 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                Add Section
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Audio Player Dock */}
      <div className="fixed bottom-0 w-full z-30">
        <AudioPlayer 
          url={audioUrl} 
          name={audioName} 
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Karaoke Tutorial Modal */}
      {showKaraokeTutorial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
              <Mic2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Advanced Karaoke Flow</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Experience realistic bar-to-bar flow simulation. The engine predicts pacing based on syllable density and punctuation.
            </p>
            
            <div className="space-y-4 mb-8 bg-zinc-900/50 p-4 rounded-xl">
              <div className="flex gap-4 items-start">
                <div className="text-white font-mono bg-zinc-800 px-2 py-1 rounded text-xs">,</div>
                <div className="text-sm text-zinc-300"><strong>Comma:</strong> Adds a short 0.5s pause to the flow. Use for breath marks.</div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="text-white font-mono bg-zinc-800 px-2 py-1 rounded text-xs">.</div>
                <div className="text-sm text-zinc-300"><strong>Period:</strong> Adds a full 1s pause. Stack them (<span className="font-mono opacity-80">..</span>) for longer breaks between flows.</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowKaraokeTutorial(false)}
                className="flex-1 py-3 px-4 rounded-full text-sm font-medium text-white border border-zinc-800 hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowKaraokeTutorial(false);
                  setIsKaraokeActive(true);
                }}
                className="flex-1 py-3 px-4 rounded-full text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Karaoke Full View */}
      {isKaraokeActive && (
        <KaraokeView 
          timeline={karaokeTimeline}
          currentTime={currentTime}
          onClose={() => setIsKaraokeActive(false)}
          offset={karaokeOffset}
          onOffsetChange={setKaraokeOffset}
          speed={karaokeSpeed}
          onSpeedChange={setKaraokeSpeed}
        />
      )}
    </div>
  );
}

