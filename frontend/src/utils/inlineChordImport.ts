import type { SongLine } from '../types/song';

const MAX_CHORD_NAME_LENGTH = 14;
const LIKELY_CHORD_PATTERN =
  /^[A-H](#|b)?(m|maj|min|sus|dim|aug|add|\d|\/|\(|\)|-|\+)*$/i;
const SONG_PART_LINE_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const KNOWN_SONG_PARTS = new Set([
  'intro',
  'strophe',
  'pre-refrain',
  'refrain',
  'refrain end',
  'bridge',
  'instrumental',
  'outro',
]);
const REFRAIN_WITH_REPEAT_PATTERN = /^refrain\s*:\s*\d+\s*x$/i;

const isSongPartLine = (lineText: string): boolean => {
  const match = lineText.match(SONG_PART_LINE_PATTERN);
  if (!match) return false;

  const label = (match[1] ?? '').trim().toLowerCase();
  if (!label) return false;

  if (KNOWN_SONG_PARTS.has(label)) return true;
  if (REFRAIN_WITH_REPEAT_PATTERN.test(label)) return true;

  // In the editor, any pure [Label] line is treated as a song part line.
  return true;
};

const extractLyricsBlock = (rawInput: string): string[] => {
  const normalized = rawInput.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  const lines = normalized.split('\n');

  const textHeaderIndex = lines.findIndex((line) => line.trim().toLowerCase() === 'text:');
  const sourceLines = textHeaderIndex >= 0 ? lines.slice(textHeaderIndex + 1) : lines;

  while (sourceLines.length > 0 && sourceLines[0].trim() === '') {
    sourceLines.shift();
  }
  while (sourceLines.length > 0 && sourceLines[sourceLines.length - 1].trim() === '') {
    sourceLines.pop();
  }

  return sourceLines;
};

const parseInlineLine = (
  rawLine: string
): { text: string; chordAnnotations: SongLine['chordAnnotations'] } => {
  if (isSongPartLine(rawLine)) {
    return { text: rawLine, chordAnnotations: [] };
  }

  let cursor = 0;
  let plainText = '';
  let plainTextCodePoints = 0;
  const chordAnnotations: SongLine['chordAnnotations'] = [];

  const appendPlain = (segment: string) => {
    plainText += segment;
    plainTextCodePoints += Array.from(segment).length;
  };

  const firstPositive = (first: number, second: number): number => {
    if (first === -1) return second;
    if (second === -1) return first;
    return Math.min(first, second);
  };

  const isLikelyChordToken = (token: string): boolean => {
    const cleaned = token.trim();
    if (!cleaned) return false;
    if (cleaned.length > MAX_CHORD_NAME_LENGTH) return false;
    if (cleaned.includes(' ')) return false;
    return LIKELY_CHORD_PATTERN.test(cleaned);
  };

  while (cursor < rawLine.length) {
    const angleStart = rawLine.indexOf('<', cursor);
    const squareStart = rawLine.indexOf('[', cursor);
    const markerStart = firstPositive(angleStart, squareStart);
    if (markerStart === -1) {
      appendPlain(rawLine.slice(cursor));
      break;
    }

    const markerChar = rawLine[markerStart];
    const markerCloseChar = markerChar === '<' ? '>' : ']';

    appendPlain(rawLine.slice(cursor, markerStart));
    const markerEnd = rawLine.indexOf(markerCloseChar, markerStart + 1);
    if (markerEnd === -1) {
      appendPlain(rawLine.slice(markerStart));
      break;
    }

    const chordName = rawLine
      .slice(markerStart + 1, markerEnd)
      .trim()
      .slice(0, MAX_CHORD_NAME_LENGTH);

    const isChordToken =
      markerChar === '<' ? Boolean(chordName) : isLikelyChordToken(chordName);

    if (isChordToken) {
      chordAnnotations.push({
        position: plainTextCodePoints,
        name: chordName,
      });
    } else {
      appendPlain(rawLine.slice(markerStart, markerEnd + 1));
    }

    cursor = markerEnd + 1;
  }

  return { text: plainText, chordAnnotations };
};

export const parseInlineChordImport = (rawInput: string): SongLine[] => {
  const sourceLines = extractLyricsBlock(rawInput);
  if (sourceLines.length === 0) {
    return [{ orderIndex: 0, text: '', chordAnnotations: [] }];
  }

  return sourceLines.map((line, index) => {
    const parsed = parseInlineLine(line);
    return {
      orderIndex: index,
      text: parsed.text,
      chordAnnotations: parsed.chordAnnotations,
    };
  });
};
