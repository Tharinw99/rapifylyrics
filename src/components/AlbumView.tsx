import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { RapSong, AlbumContent, AlbumTrack } from '../types';
import { ArrowLeft, Disc3, Music, Plus, GripVertical, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore_errors';

const DEFAULT_ALBUM: AlbumContent = {
  description: '',
  tracks: []
};

export function AlbumView() {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState<RapSong | null>(null);
  const [album, setAlbum] = useState<AlbumContent>(DEFAULT_ALBUM);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadAlbum() {
      if (!albumId) return;
      try {
        const docSnap = await getDoc(doc(db, 'songs', albumId));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as RapSong;
          setSong(data);
          try {
            if (data.contentJson) {
              setAlbum(JSON.parse(data.contentJson));
            }
          } catch(e) {}
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `songs/${albumId}`);
      }
    }
    loadAlbum();
  }, [albumId]);

  useEffect(() => {
    if (!song || !albumId) return;
    const saveChanges = async () => {
      try {
        await updateDoc(doc(db, 'songs', albumId), {
          contentJson: JSON.stringify(album),
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
  }, [album, albumId, song]);

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!song) return;
    const newTitle = e.target.value;
    setSong(prev => prev ? { ...prev, title: newTitle } : prev);
    
    setTimeout(async () => {
      if (albumId) {
        await updateDoc(doc(db, 'songs', albumId), { title: newTitle, updatedAt: new Date() });
      }
    }, 1000);
  };
  
  const handleCoverUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!song) return;
    const newUrl = e.target.value;
    setSong(prev => prev ? { ...prev, coverUrl: newUrl } : prev);
    
    setTimeout(async () => {
      if (albumId) {
        await updateDoc(doc(db, 'songs', albumId), { coverUrl: newUrl, updatedAt: new Date() });
      }
    }, 1000);
  };

  const addTrack = () => {
    setAlbum(prev => ({
      ...prev,
      tracks: [
        ...prev.tracks,
        { id: crypto.randomUUID(), songId: null, placeholderTitle: `Track ${prev.tracks.length + 1}` }
      ]
    }));
  };

  const updateTrackPlaceholder = (id: string, newTitle: string) => {
    setAlbum(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === id ? { ...t, placeholderTitle: newTitle } : t)
    }));
  };

  const removeTrack = (id: string) => {
    setAlbum(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== id)
    }));
  };
  
  if (!song) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading Album...</div>;
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

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Cover Art Box */}
          <div className="w-48 h-48 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 group relative">
            {song.coverUrl ? (
              <img src={song.coverUrl} alt="Album Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <Disc3 className="w-12 h-12 mb-2" />
                <span className="text-xs font-medium uppercase tracking-widest">No Cover</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Image URL</label>
              <input 
                type="text"
                value={song.coverUrl || ''}
                onChange={handleCoverUrlChange}
                placeholder="https://..."
                className="w-full bg-zinc-800 border-none outline-none text-xs p-2 text-center rounded focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            <h3 className="text-purple-500 text-sm font-bold tracking-widest uppercase mb-2">Album</h3>
            <input 
              type="text" 
              value={song.title}
              onChange={handleTitleChange}
              className="w-full bg-transparent border-none outline-none text-5xl tracking-tighter font-bold text-white placeholder:text-zinc-600 focus:ring-0 p-0 mb-4"
              placeholder="Album Title"
            />
            <textarea
              value={album.description}
              onChange={(e) => setAlbum({ ...album, description: e.target.value })}
              placeholder="Tracklist concept, narrative, release timeline..."
              className="w-full h-20 bg-transparent resize-none outline-none text-zinc-400 placeholder:text-zinc-700"
            />
          </div>
        </div>

        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 overflow-hidden">
          <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Music className="w-5 h-5 text-zinc-500" /> Tracklist
            </h4>
            <span className="text-sm font-medium text-zinc-500">{album.tracks.length} tracks</span>
          </div>
          
          <div className="p-4 space-y-2">
            {album.tracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group">
                <span className="text-zinc-600 font-mono text-sm w-6 text-right select-none">{index + 1}</span>
                <input
                  type="text"
                  value={track.placeholderTitle}
                  onChange={(e) => updateTrackPlaceholder(track.id, e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-700 font-medium"
                  placeholder="Track Name"
                />
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <button onClick={() => removeTrack(track.id)} className="p-2 text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-2 text-zinc-600 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}

            <button 
              onClick={addTrack}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-zinc-900/30 text-zinc-500 hover:bg-zinc-900 transition-colors border border-dashed border-zinc-800 hover:border-zinc-700 hover:text-white"
            >
              <Plus className="w-4 h-4" /> Add Track
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
