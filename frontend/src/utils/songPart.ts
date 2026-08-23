import type { SongLine } from '../types/song';

const SONG_PART_LINE_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const REFRAIN_WITH_REPEAT_PATTERN = /^refrain\s*:\s*\d+\s*x$/;
const NUMBERED_STROPHE_PATTERN = /^strophe\s+([1-9]\d*)$/;
const NUMBERED_PRE_REFRAIN_PATTERN = /^pre[-\s]?refrain\s+([1-9]\d*)$/;
const NUMBERED_REFRAIN_PATTERN = /^refrain\s+([1-9]\d*)$/;

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
  isDuetBlueContent: boolean;
  isDuetRedContent: boolean;
};

export const isSongPartLine = (text: string): boolean => SONG_PART_LINE_PATTERN.test(text);

export const getSongPartLabel = (text: string): string | null => {
  const match = text.match(SONG_PART_LINE_PATTERN);
  if (!match) return null;
  return match[1]?.trim().toLowerCase() ?? null;
};

export const getSongPartRawLabel = (text: string): string | null => {
  const match = text.match(SONG_PART_LINE_PATTERN);
  if (!match) return null;
  return match[1]?.trim() || null;
};

export const isRefrainLine = (text: string): boolean => {
  const label = getSongPartLabel(text);
  if (!label) return false;
  return label === 'refrain' || REFRAIN_WITH_REPEAT_PATTERN.test(label) || NUMBERED_REFRAIN_PATTERN.test(label);
};
export const isRefrainEndLine = (text: string): boolean => getSongPartLabel(text) === 'refrain end';
export const isPreRefrainLine = (text: string): boolean => {
  const label = getSongPartLabel(text);
  if (!label) return false;
  return label === 'pre-refrain' || label === 'pre refrain' || NUMBERED_PRE_REFRAIN_PATTERN.test(label);
};
export const getStropheNumber = (label: string | null): number | null => {
  if (label === 'strophe') return 0;
  const match = label?.match(NUMBERED_STROPHE_PATTERN);
  return match ? Number(match[1]) : null;
};
export const isStropheLine = (text: string): boolean => getStropheNumber(getSongPartLabel(text)) !== null;
export const isStropheEndLine = (text: string): boolean => getSongPartLabel(text) === 'strophe end';
export const isBackgroundgesangLine = (text: string): boolean => /^backgroundgesang(?:\s+[1-9]\d*)?$/.test(getSongPartLabel(text) ?? '');
export const isBackgroundgesangEndLine = (text: string): boolean => getSongPartLabel(text) === 'backgroundgesang end';
export const isInstrumentalLine = (text: string): boolean => /^instrumental(?:\s+[1-9]\d*)?$/.test(getSongPartLabel(text) ?? '');
export const isDuetBlueLine = (text: string): boolean => {
  const label = getSongPartLabel(text);
  return label === 'duett blau' || label === 'duett (blau)' || label === 'duet blue' || label === 'duet (blue)';
};
export const isDuetRedLine = (text: string): boolean => {
  const label = getSongPartLabel(text);
  return label === 'duett rot' || label === 'duett (rot)' || label === 'duet red' || label === 'duet (red)';
};
export const isDuetEndLine = (text: string): boolean => getSongPartLabel(text) === 'duett end';
export const isSongPartEndLine = (text: string): boolean => getSongPartLabel(text)?.endsWith(' end') ?? false;
export const getDisplayedSongPartText = (text: string): string | null => {
  const label = getSongPartLabel(text);
  const rawLabel = getSongPartRawLabel(text);
  if (!label || !rawLabel) return null;
  if (
    isStropheLine(text) ||
    isStropheEndLine(text) ||
    isRefrainEndLine(text) ||
    isBackgroundgesangEndLine(text) ||
    isDuetBlueLine(text) ||
    isDuetRedLine(text) ||
    isSongPartEndLine(text)
  ) {
    return null;
  }
  return `[${rawLabel}]`;
};

export const getRefrainUnderlineFlags = (lines: SongLine[]): boolean[] => {
  let inEmphasizedBlock = false;

  return lines.map((line) => {
    const text = line.text ?? '';

    if (isRefrainLine(text) || isPreRefrainLine(text)) {
      inEmphasizedBlock = true;
      return false;
    }

    if (isRefrainEndLine(text)) {
      inEmphasizedBlock = false;
      return false;
    }

    if (isSongPartLine(text)) {
      inEmphasizedBlock = false;
      return false;
    }
    return inEmphasizedBlock;
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
  let inDuetBlueBlock = false;
  let inDuetRedBlock = false;

  return lines.flatMap((line, originalIndex) => {
    const text = line.text ?? '';
    const label = getSongPartLabel(text);
    const stropheLabelNumber = getStropheNumber(label);

    if (stropheLabelNumber !== null) {
      inStropheBlock = true;
      currentStropheNumber = stropheLabelNumber === 0 ? nextStropheNumber : stropheLabelNumber;
      nextStropheNumber = Math.max(nextStropheNumber + 1, currentStropheNumber + 1);
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

    if (isDuetEndLine(text)) {
      inDuetBlueBlock = false;
      inDuetRedBlock = false;
      return [];
    }

    if (isSongPartEndLine(text)) {
      return [];
    }

    const isBackgroundStart = isBackgroundgesangLine(text);
    const isDuetBlueStart = isDuetBlueLine(text);
    const isDuetRedStart = isDuetRedLine(text);
    if (isSongPartLine(text)) {
      if (!isBackgroundStart) inBackgroundBlock = false;
    }

    const stropheNumber =
      inStropheBlock && !stropheNumberConsumed ? currentStropheNumber : null;
    if (stropheNumber !== null && !isSongPartLine(text)) {
      stropheNumberConsumed = true;
    }

    const displayText = getDisplayedSongPartText(text);
    const entry = {
      line,
      originalIndex,
      stropheNumber,
      startsAfterStropheEnd,
      displayText,
      underlineDisplayText: displayText !== null,
      isDisplayedSongPart: isSongPartLine(text),
      isBackgroundContent: inBackgroundBlock && !isSongPartLine(text),
      isInstrumentalSongPart: isInstrumentalLine(text),
      isDuetBlueContent: inDuetBlueBlock && !isSongPartLine(text),
      isDuetRedContent: inDuetRedBlock && !isSongPartLine(text),
    };
    if (isBackgroundStart) {
      inBackgroundBlock = true;
    }
    if (isDuetBlueStart) {
      inDuetBlueBlock = true;
      inDuetRedBlock = false;
    }
    if (isDuetRedStart) {
      inDuetBlueBlock = false;
      inDuetRedBlock = true;
    }
    startsAfterStropheEnd = false;
    return [entry];
  });
};
