import React, { useEffect, useState, useRef } from 'react';
import { db, auth, googleSignIn } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { RapSong, DocType } from '../types';
import { useNavigate } from 'react-router-dom';
import { Music, Plus, Trash2, Mic, Clock, FileText, Lightbulb, Disc3, ChevronDown } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore_errors';
import { cn } from '../lib/utils';

export function DriveView() {
  const [songs, setSongs] = useState<RapSong[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'songs'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RapSong[];
      docs.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : Date.now();
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : Date.now();
        return timeB - timeA;
      });
      setSongs(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'songs');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await googleSignIn();
    } catch (e) {
      console.error(e);
    }
  };

  const createDocument = async (type: DocType) => {
    setIsDropdownOpen(false);
    if (!user) return;
    try {
      const newDoc = {
        ownerId: user.uid,
        title: type === 'song' ? 'Untitled Rap' : type === 'plan' ? 'New Plan' : 'New Album',
        docType: type,
        sectionsJson: '[]',
        contentJson: '{}',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'songs'), newDoc);
      navigate(`/${type === 'song' ? 'editor' : type}/${docRef.id}`, { state: { initialData: { id: docRef.id, ...newDoc } } });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'songs');
    }
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'songs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `songs/${id}`);
    }
  };

  const handleNavigation = (song: RapSong) => {
    const type = song.docType || 'song';
    navigate(`/${type === 'song' ? 'editor' : type}/${song.id}`, { state: { initialData: song } });
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Authorizing...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        <Mic className="w-16 h-16 text-blue-500 mb-6" />
        <h1 className="text-4xl font-bold tracking-tight mb-2">Rapify Drive</h1>
        <p className="text-zinc-400 mb-8 max-w-md text-center">Sign in to save your rap lyrics to the cloud, upload beats, and sync seamlessly across devices.</p>
        <button 
          onClick={handleLogin}
          className="flex items-center gap-3 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Mic className="text-blue-500 w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Rapify Drive</h1>
              <p className="text-zinc-500 text-sm">Your rhyme book in the cloud.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {user.email}
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="text-sm px-4 py-1.5 rounded-full hover:bg-zinc-900 text-zinc-400 transition-colors"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn("w-full group flex flex-col items-center justify-center p-8 h-48 rounded-2xl bg-zinc-900/50 border-2 border-dashed border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-zinc-400 hover:text-white", isDropdownOpen && "border-blue-500/50 bg-blue-500/5 text-white")}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-blue-500 flex items-center justify-center transition-colors mb-4 text-white">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold tracking-wide flex items-center gap-1">New Project <ChevronDown className="w-4 h-4" /></span>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-20">
                <button onClick={() => createDocument('song')} className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800 text-zinc-200">
                  <Mic className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Rap Song</div>
                    <div className="text-xs text-zinc-500">Write bars and flow over a beat</div>
                  </div>
                </button>
                <button onClick={() => createDocument('plan')} className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800 text-zinc-200">
                  <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Plan</div>
                    <div className="text-xs text-zinc-500">Brainstorm concepts and mood</div>
                  </div>
                </button>
                <button onClick={() => createDocument('album')} className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800 transition-colors text-left text-zinc-200">
                  <Disc3 className="w-5 h-5 text-purple-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Album</div>
                    <div className="text-xs text-zinc-500">Organize tracks and covers</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          
          {songs.map(song => {
            const isPlan = song.docType === 'plan';
            const isAlbum = song.docType === 'album';
            const isSong = !isPlan && !isAlbum;

            return (
              <div 
                key={song.id}
                onClick={() => handleNavigation(song)}
                className={cn("group flex flex-col p-6 h-48 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer relative overflow-hidden", isPlan ? 'hover:border-yellow-500/50' : isAlbum ? 'hover:border-purple-500/50' : '')}
              >
                {isAlbum && song.coverUrl && (
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                    <img src={song.coverUrl} className="w-full h-full object-cover blur-[2px]" />
                  </div>
                )}
                
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => deleteDocument(song.id, e)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    {isPlan ? <Lightbulb className="w-4 h-4 text-yellow-500" /> : isAlbum ? <Disc3 className="w-4 h-4 text-purple-500" /> : <Mic className="w-4 h-4 text-blue-500" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {isPlan ? 'Plan' : isAlbum ? 'Album' : 'Song'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg max-w-[85%] truncate mb-1 text-white">{song.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                    {isSong && (
                      song.audioName ? (
                        <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {song.audioName}</span>
                      ) : <span>No beat attached</span>
                    )}
                    {isAlbum && <span>Edit tracklist</span>}
                    {isPlan && <span>View brainstorm</span>}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-zinc-600 font-medium mt-auto relative z-10">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {song.updatedAt?.toMillis ? new Date(song.updatedAt.toMillis()).toLocaleDateString() : 'Just now'}
                  </span>
                  
                  {isSong && song.googleDocId && (
                    <span className="flex items-center gap-1 text-blue-500" title="Linked to Google Docs">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                
                <div className={cn("absolute bottom-0 left-0 w-full h-1 translate-y-full group-hover:translate-y-0 transition-transform", isPlan ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : isAlbum ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-purple-500')}></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

