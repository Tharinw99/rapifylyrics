export interface RhymeToken {
  text: string;
  isWord: boolean;
  colorIndex?: number;
}

const getVowels = (word: string) => word.toLowerCase().replace(/[^aeiouy]/g, '');

const getEndSound = (word: string) => {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  const match = clean.match(/[aeiouy]+[^aeiouy]*$/);
  return match ? match[0] : clean;
};

const getAdvancedSounds = (word: string) => {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  // Extract all vowel-consonant blobs
  return clean.match(/[aeiouy]+[^aeiouy]*/g) || [clean];
};

export function computeRhymes(text: string, isAdvanced: boolean): RhymeToken[] {
  const regex = /([a-zA-Z']+)|([^a-zA-Z']+)/g;
  const tokens: RhymeToken[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) tokens.push({ text: match[1], isWord: true });
    else tokens.push({ text: match[2], isWord: false });
  }

  const soundCount = new Map<string, number>();

  tokens.forEach(t => {
    if (t.isWord && t.text.length > 2) {
      if (isAdvanced) {
        const sounds = getAdvancedSounds(t.text);
        sounds.forEach(s => {
          if (s.length > 1) {
             soundCount.set(s, (soundCount.get(s) || 0) + 1);
          }
        });
      } else {
        const end = getEndSound(t.text);
        if (end.length > 1) {
          soundCount.set(end, (soundCount.get(end) || 0) + 1);
        }
      }
    }
  });

  const soundToColor = new Map<string, number>();
  let colorIndex = 0;

  for (const [sound, count] of soundCount.entries()) {
    if (count > 1) {
      soundToColor.set(sound, colorIndex % 8);
      colorIndex++;
    }
  }

  tokens.forEach(t => {
    if (t.isWord && t.text.length > 2) {
      if (isAdvanced) {
        const sounds = getAdvancedSounds(t.text);
        const bestSound = sounds.find(s => soundToColor.has(s));
        if (bestSound) {
          t.colorIndex = soundToColor.get(bestSound);
        }
      } else {
        const end = getEndSound(t.text);
        if (soundToColor.has(end)) {
          t.colorIndex = soundToColor.get(end);
        }
      }
    }
  });

  return tokens;
}

export const rhymeColors = [
  'bg-red-300 text-black',
  'bg-blue-300 text-black',
  'bg-green-300 text-black',
  'bg-yellow-300 text-black',
  'bg-purple-300 text-black',
  'bg-pink-300 text-black',
  'bg-orange-300 text-black',
  'bg-teal-300 text-black',
];
