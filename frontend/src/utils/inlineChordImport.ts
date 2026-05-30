import type { SongLine } from '../types/song';

const MAX_CHORD_NAME_LENGTH = 14;
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

  while (cursor < rawLine.length) {
    const bracketStart = rawLine.indexOf('[', cursor);
    if (bracketStart === -1) {
      appendPlain(rawLine.slice(cursor));
      break;
    }

    appendPlain(rawLine.slice(cursor, bracketStart));
    const bracketEnd = rawLine.indexOf(']', bracketStart + 1);
    if (bracketEnd === -1) {
      appendPlain(rawLine.slice(bracketStart));
      break;
    }

    const chordName = rawLine
      .slice(bracketStart + 1, bracketEnd)
      .trim()
      .slice(0, MAX_CHORD_NAME_LENGTH);

    if (chordName) {
      chordAnnotations.push({
        position: plainTextCodePoints,
        name: chordName,
      });
    } else {
      appendPlain(rawLine.slice(bracketStart, bracketEnd + 1));
    }

    cursor = bracketEnd + 1;
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

