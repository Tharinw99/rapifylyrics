import { Section } from '../types';
import { countSyllables } from './syllables';

export interface KaraokeLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  sectionName: string;
  syllables: number;
}

export function generateKaraokeTimeline(sections: Section[], offset: number = 0, speed: number = 0.25): KaraokeLine[] {
  let currentTime = offset;
  const lines: KaraokeLine[] = [];

  for (const section of sections) {
    const textLines = section.content.split('\n').filter(l => l.trim() !== '');
    for (const text of textLines) {
      const syllables = countSyllables(text);
      if (syllables === 0) continue;
      
      const duration = syllables * speed;
      
      let pause = 0;
      if (text.includes(',')) {
        pause += (text.match(/,/g)?.length || 0) * 0.5; // 0.5s per comma
      }
      if (text.includes('.')) {
        pause += (text.match(/\./g)?.length || 0) * 1.0; // 1s per period
      }

      lines.push({
        id: crypto.randomUUID(),
        text,
        startTime: currentTime,
        endTime: currentTime + duration,
        sectionName: section.name,
        syllables
      });

      currentTime += duration + pause + 0.1; // slight gap
    }
    // gap between sections
    currentTime += 2.0;
  }
  return lines;
}
