import type { ChordAnnotation } from '../types/chordAnnotation';

export const buildChordLine = (
  textInput: string | null | undefined,
  chordsInput: ChordAnnotation[] | null | undefined
): string => {
  const text = textInput ?? '';
  const textLength = Array.from(text).length;
  const cells = Array.from({ length: textLength }, () => ' ');

  for (const chord of chordsInput ?? []) {
    const position = Math.max(0, Number(chord.position ?? 0));
    const nameChars = Array.from(chord.name ?? '');
    const need = position + nameChars.length;
    while (cells.length < need) cells.push(' ');
    for (let i = 0; i < nameChars.length; i++) {
      cells[position + i] = nameChars[i];
    }
  }

  return cells.join('');
};
