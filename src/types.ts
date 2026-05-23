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
