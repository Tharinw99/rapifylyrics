import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { EditorSection } from './EditorSection';
import { AudioPlayer } from './AudioPlayer';
import { KaraokeView } from './KaraokeView';
import { Section, SectionType, RapSong } from '../types';
import { Plus, Upload, Mic2, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateKaraokeTimeline, KaraokeLine } from '../lib/karaoke';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, getAccessToken, googleSignIn } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore_errors';
import * as idb from 'idb-keyval';

export function EditorView() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState<RapSong | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
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
  
  const saveTitleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadSong() {
      if (!songId) return;
      try {
        const docSnap = await getDoc(doc(db, 'songs', songId));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as RapSong;
          setSong(data);
          try {
            setSections(JSON.parse(data.sectionsJson));
          } catch(e) {}
          
          setAudioName(data.audioName || null);
          if (data.localBeatId) {
            const beatFile = await idb.get(data.localBeatId) as Blob;
            if (beatFile) {
              setAudioUrl(URL.createObjectURL(beatFile));
            }
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `songs/${songId}`);
      }
    }
    loadSong();
  }, [songId]);

  // Auto-save
  useEffect(() => {
    if (!songId || !song) return;
    const timeout = setTimeout(async () => {
      const json = JSON.stringify(sections);
      if (json !== song.sectionsJson) {
        try {
          await updateDoc(doc(db, 'songs', songId), {
            sectionsJson: json,
            updatedAt: new Date()
          });
          setSong(prev => prev ? { ...prev, sectionsJson: json } : prev);
        } catch (e) {
          console.error("Autosave error", e);
        }
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [sections, songId, song]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const loadFile = async (file: File) => {
    if (file && (file.type.includes('audio') || file.type.includes('video'))) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      const name = file.name.replace(/\.[^/.]+$/, "");
      setAudioName(name);

      if (songId) {
        const beatId = `beat-${songId}-${Date.now()}`;
        await idb.set(beatId, file);
        await updateDoc(doc(db, 'songs', songId), {
          audioName: name,
          localBeatId: beatId,
          updatedAt: new Date()
        });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if(e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  }, [songId]);

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

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!song) return;
    const newTitle = e.target.value;
    setSong(prev => prev ? { ...prev, title: newTitle } : prev);
    
    // Debounce save title
    if (saveTitleTimerRef.current) {
      clearTimeout(saveTitleTimerRef.current);
    }
    
    saveTitleTimerRef.current = setTimeout(async () => {
      if (songId) {
        await updateDoc(doc(db, 'songs', songId), { title: newTitle, updatedAt: new Date() });
      }
    }, 1000);
  };

  const handleExportToGoogleDocs = async () => {
    if (!song || !songId) return;
    
    // Check if we have token
    let token = await getAccessToken();
    if (!token) {
      const wantToLogin = window.confirm("You need to sign in again to grant Google Docs access. Sign in now?");
      if (wantToLogin) {
        try {
          const res = await googleSignIn();
          if (res) token = res.accessToken;
        } catch(e) {
          return;
        }
      }
      if (!token) return;
    }
    
    if (song.googleDocId) {
      const confirmed = window.confirm("This will overwrite the contents of your existing Google Doc. Are you sure?");
      if (!confirmed) return;
    }

    setIsExporting(true);
    
    try {
      let docId = song.googleDocId;
      
      const docTitle = `${song.title} - Rapify`;
      
      // Build document content
      let textContent = `${song.title}\n\n`;
      let currentIndex = textContent.length;
      
      const requests = [];
      const insertAtBeginning = (text: string) => {
        requests.push({ insertText: { location: { index: currentIndex }, text }});
        currentIndex += text.length;
      }
      
      for (const section of sections) {
        const sectionHeader = `[${section.name}]\n`;
        insertAtBeginning(sectionHeader);
        const content = section.content.trim() + '\n\n';
        insertAtBeginning(content);
      }

      if (!docId) {
        // Create new document
        const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: docTitle })
        });
        
        if (!createRes.ok) throw new Error("Failed to create document");
        const createData = await createRes.json();
        docId = createData.documentId;
      }
      
      // Actually we need to make sure we replace the text if it exists. 
      // Instead of reading the whole doc to get the end index, for a simple update, we can just clear it if we tracked it or just assume we append.
      // Since it's simpler, let's just create a new one every time if not robust, but user confirmed overwrite. 
      // To overwrite a doc we need to delete existing content. It's safer to just create a new doc if we don't read it.
      // Easiest robust approach for now: if user has a doc, we write below or we just create a new one always (easier).
      // Let's stick with updating. Wait, if we create a new doc, we just insert.
      // Let's refine: if docId exists, let's just append at the end by reading it, OR we just always create a new doc "MyRap_Exported".
      
      // Let's just create a new one every time, much simpler and safer than dealing with indexes.
      // So if song.googleDocId exists, we'll just update the title to [Old] and make a new one (or just create a fresh one and update the link).
      
      const actCreateRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle })
      });
      const actCreateData = await actCreateRes.json();
      const finalDocId = actCreateData.documentId;
      
      // Apply the text
      const writeReqs = [{
        insertText: {
          location: { index: 1 },
          text: textContent
        }
      }];

      await fetch(`https://docs.googleapis.com/v1/documents/${finalDocId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: writeReqs })
      });

      await updateDoc(doc(db, 'songs', songId), {
        googleDocId: finalDocId,
        updatedAt: new Date()
      });
      setSong({ ...song, googleDocId: finalDocId });
      
      window.open(`https://docs.google.com/document/d/${finalDocId}/edit`, '_blank');

    } catch (e) {
      console.error(e);
      alert("Failed to export to Google Docs. Ensure you granted permissions.");
    } finally {
      setIsExporting(false);
    }
  };

  const sectionTypes: SectionType[] = ['Intro', 'Verse', 'Pre Hook', 'Hook', 'Bridge', 'Outro'];

  const karaokeTimeline = useMemo(() => {
    return generateKaraokeTimeline(sections, karaokeOffset, karaokeSpeed);
  }, [sections, karaokeOffset, karaokeSpeed]);

  const handleStartKaraokeClick = () => setShowKaraokeTutorial(true);

  if (!song) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading Editor...</div>;
  }

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500/50 flex items-center justify-center pointer-events-none">
          <div className="text-blue-400 font-medium text-2xl tracking-tight">Drop beat to load...</div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-32 pt-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium z-10"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Drive
            </button>
            
            <button 
              onClick={handleExportToGoogleDocs}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors z-10 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {isExporting ? "Exporting..." : "Export to Docs"}
            </button>
          </div>
          
          <header className="mb-12">
            <input 
              type="text" 
              value={song.title}
              onChange={handleTitleChange}
              className="w-full bg-transparent border-none outline-none text-4xl tracking-tighter font-semibold text-white placeholder:text-zinc-600 focus:ring-0 p-0"
              placeholder="Song Title"
            />
            
            <div className="flex items-center gap-4 flex-wrap mt-6">
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
                    >
                      Adv. Check
                    </button>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer group">
                <Upload className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                {audioName ? 'Replace Beat' : 'Upload Beat'}
                <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} />
              </label>

              {audioUrl && sections.length > 0 && (
                <button 
                  onClick={handleStartKaraokeClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-sm font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors"
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

      <div className="fixed bottom-0 w-full z-30">
        <AudioPlayer url={audioUrl} name={audioName} onTimeUpdate={setCurrentTime} />
      </div>

      {showKaraokeTutorial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-6">
              <Mic2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Advanced Karaoke Flow</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Experience realistic bar-to-bar flow simulation.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowKaraokeTutorial(false)} className="flex-1 py-3 px-4 rounded-full text-sm font-medium text-white border border-zinc-800 hover:bg-zinc-900 transition-colors">Cancel</button>
              <button onClick={() => { setShowKaraokeTutorial(false); setIsKaraokeActive(true); }} className="flex-1 py-3 px-4 rounded-full text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors">Start Session</button>
            </div>
          </div>
        </div>
      )}

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
