import type { SongLine } from '../types/song';

const SONG_PART_LINE_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const REFRAIN_WITH_REPEAT_PATTERN = /^refrain\s*:\s*\d+\s*x$/;

export const isSongPartLine = (text: string): boolean => SONG_PART_LINE_PATTERN.test(text);

export const getSongPartLabel = (text: string): string | null => {
  const match = text.match(SONG_PART_LINE_PATTERN);
  if (!match) return null;
  return match[1]?.trim().toLowerCase() ?? null;
};

export const isRefrainLine = (text: string): boolean => {
  const label = getSongPartLabel(text);
  if (!label) return false;
  return label === 'refrain' || REFRAIN_WITH_REPEAT_PATTERN.test(label);
};
export const isRefrainEndLine = (text: string): boolean => getSongPartLabel(text) === 'refrain end';

export const getRefrainUnderlineFlags = (lines: SongLine[]): boolean[] => {
  let inRefrainBlock = false;

  return lines.map((line) => {
    const text = line.text ?? '';

    if (isRefrainLine(text)) {
      inRefrainBlock = true;
      return false;
    }

    if (isRefrainEndLine(text)) {
      inRefrainBlock = false;
      return false;
    }

    if (isSongPartLine(text)) return false;
    return inRefrainBlock;
  });
};
