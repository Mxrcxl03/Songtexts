import type { SongLine } from '../types/song';

const SONG_PART_LINE_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const REFRAIN_WITH_REPEAT_PATTERN = /^refrain\s*:\s*\d+\s*x$/;

export type VisibleSongLineEntry<T> = {
  line: T;
  originalIndex: number;
  stropheNumber: number | null;
  startsAfterStropheEnd: boolean;
  displayText: string | null;
  underlineDisplayText: boolean;
  isDisplayedSongPart: boolean;
  isBackgroundContent: boolean;
  isInstrumentalSongPart: boolean;
};

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
export const isStropheLine = (text: string): boolean => getSongPartLabel(text) === 'strophe';
export const isStropheEndLine = (text: string): boolean => getSongPartLabel(text) === 'strophe end';
export const isBackgroundgesangLine = (text: string): boolean => getSongPartLabel(text) === 'backgroundgesang';
export const isBackgroundgesangEndLine = (text: string): boolean => getSongPartLabel(text) === 'backgroundgesang end';
export const getDisplayedSongPartText = (text: string): string | null => {
  const label = getSongPartLabel(text);
  if (label === 'intro') return 'INTRO:';
  if (label === 'outro') return 'OUTRO:';
  if (label === 'refrain') return 'REFRAIN:';
  if (label === 'backgroundgesang') return 'BACKGROUNDGESANG:';
  if (label === 'instrumental') return 'INSTRUMENTAL:';
  if (label && REFRAIN_WITH_REPEAT_PATTERN.test(label)) {
    return `REFRAIN: ${label.split(':')[1]?.trim() ?? ''}`.trim();
  }
  return null;
};

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

export const getVisibleSongLineEntries = <T extends { text?: string | null }>(
  lines: T[]
): VisibleSongLineEntry<T>[] => {
  let inStropheBlock = false;
  let currentStropheNumber: number | null = null;
  let nextStropheNumber = 1;
  let stropheNumberConsumed = false;
  let startsAfterStropheEnd = false;
  let inBackgroundBlock = false;

  return lines.flatMap((line, originalIndex) => {
    const text = line.text ?? '';

    if (isStropheLine(text)) {
      inStropheBlock = true;
      currentStropheNumber = nextStropheNumber;
      nextStropheNumber += 1;
      stropheNumberConsumed = false;
      return [];
    }

    if (isStropheEndLine(text)) {
      inStropheBlock = false;
      currentStropheNumber = null;
      stropheNumberConsumed = false;
      startsAfterStropheEnd = true;
      return [];
    }

    if (isRefrainEndLine(text)) return [];

    if (isBackgroundgesangEndLine(text)) {
      inBackgroundBlock = false;
      return [];
    }

    const stropheNumber =
      inStropheBlock && !stropheNumberConsumed ? currentStropheNumber : null;
    if (stropheNumber !== null && !isSongPartLine(text)) {
      stropheNumberConsumed = true;
    }

    const displayText = getDisplayedSongPartText(text);
    const isBackgroundStart = isBackgroundgesangLine(text);
    const entry = {
      line,
      originalIndex,
      stropheNumber,
      startsAfterStropheEnd,
      displayText,
      underlineDisplayText: displayText !== null,
      isDisplayedSongPart: isSongPartLine(text),
      isBackgroundContent: inBackgroundBlock && !isSongPartLine(text),
      isInstrumentalSongPart: getSongPartLabel(text) === 'instrumental',
    };
    if (isBackgroundStart) {
      inBackgroundBlock = true;
    }
    startsAfterStropheEnd = false;
    return [entry];
  });
};
