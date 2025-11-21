export type ChordAnnotation = {
    position: number,
    name: string
}

export type LooseChord = {
  position?: number | null
  name?: string | null
} | null | undefined

export function buildChordRow(text: string, chords: ChordAnnotation[]): string {
  const cells = Array.from({ length: Array.from(text).length }, () => " ");

  for (const c of chords) {
    const pos = Math.max(0, Math.min(cells.length - 1, c.position));
    const glyphs = Array.from(c.name);
    for (let i = 0; i < glyphs.length && pos + i < cells.length; i++) {
      cells[pos + i] = glyphs[i];
    }
  }
  return cells.join("");
}