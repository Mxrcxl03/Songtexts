import type { SongLine } from '../types/song';

const SONG_PART_LINE_PATTERN = /^\s*\[([^\]]+)\]\s*$/;

export const isSongPartLine = (text: string): boolean => SONG_PART_LINE_PATTERN.test(text);

const getSongPartLabel = (text: string): string | null => {
  const match = text.match(SONG_PART_LINE_PATTERN);
  if (!match) return null;
  return match[1]?.trim().toLowerCase() ?? null;
};

export const getRefrainUnderlineFlags = (lines: SongLine[]): boolean[] => {
  let inRefrainBlock = false;

  return lines.map((line) => {
    const text = line.text ?? '';
    const label = getSongPartLabel(text);

    if (label === 'refrain') {
      inRefrainBlock = true;
      return false;
    }

    if (label === 'refrain end') {
      inRefrainBlock = false;
      return false;
    }

    if (isSongPartLine(text)) return false;
    return inRefrainBlock;
  });
};
