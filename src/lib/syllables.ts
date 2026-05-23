export function countSyllables(word: string): number {
  if (!word) return 0;
  const words = word.toLowerCase().replace(/[^a-z]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  let total = 0;
  for (const w of words) {
    if (w.length <= 3) {
      total += 1;
      continue;
    }
    let syl = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    syl = syl.replace(/^y/, '');
    const match = syl.match(/[aeiouy]{1,2}/g);
    total += match ? match.length : 1;
  }
  return total;
}
