export type SectionType = 
  | 'Intro' 
  | 'Verse' 
  | 'Pre Hook' 
  | 'Hook' 
  | 'Bridge' 
  | 'Outro';

export interface Section {
  id: string;
  type: SectionType;
  name: string; // The generated name like "Verse 2"
  content: string;
  collapsed: boolean;
}

export interface LoopState {
  a: number | null;
  b: number | null;
}

export type DocType = 'song' | 'plan' | 'album';

export interface RapSong {
  id: string;
  ownerId: string;
  title: string;
  docType?: DocType;
  sectionsJson?: string; // serialized Section[]
  contentJson?: string; // serialized for plan and album
  audioName?: string;
  localBeatId?: string; // used for IndexedDB
  googleDocId?: string;
  coverUrl?: string; // for album
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

export interface PlanContent {
  mood: string;
  bpm: string;
  themes: string;
  notes: string;
  linkedSongId: string | null;
}

export interface AlbumTrack {
  id: string; // unique ID in tracklist
  songId: string | null; // null if unwritten
  placeholderTitle: string; // if unwritten
}

export interface AlbumContent {
  tracks: AlbumTrack[];
  description: string;
}
