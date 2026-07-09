import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  ClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  CSSProperties,
} from 'react';
import type { SongLine } from '../types/song';
import type { ChordAnnotation } from '../types/chordAnnotation';
import { getRefrainUnderlineFlags, getSongPartLabel, isSongPartLine } from '../utils/songPart';

type LyricsChordEditorProps = {
  lines: SongLine[];
  onChange: (lines: SongLine[]) => void;
  disabled?: boolean;
  lockSongPartLines?: boolean;
};

const SONG_PART_OPTIONS = [
  'Intro',
  'Strophe',
  'Strophe End',
  'Pre-Refrain',
  'Refrain',
  'Refrain End',
  'Backgroundgesang',
  'Backgroundgesang End',
  'Bridge',
  'Instrumental',
  'Outro',
  'Benutzerdefiniert',
] as const;

const MAX_CHORD_NAME_LENGTH = 14;
const normalizeChord = (name: string): string =>
  name.trim().slice(0, MAX_CHORD_NAME_LENGTH);
const isLyricLine = (text: string): boolean => !isSongPartLine(text);
const CHORD_MARKER_GAP_CH = 0.45;
const CHORD_MARKER_WIDTH_PADDING_CH = 1.3;

type PositionedChord = {
  position: number;
  name: string;
  row: number;
};

type ChordMarkerLayout = {
  markers: PositionedChord[];
  rowCount: number;
};
const toSongPartLineText = (rawLabel: string): string => {
  const label = rawLabel.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  return label ? `[${label}]` : '';
};

const normalizeLine = (line: SongLine, orderIndex: number): SongLine => {
  const byPosition = new Map<number, string>();
  for (const chord of line.chordAnnotations ?? []) {
    const cleaned = normalizeChord(chord.name ?? '');
    if (!cleaned) continue;
    const position = Math.max(0, Number(chord.position ?? 0));
    byPosition.set(position, cleaned);
  }

  const chordAnnotations: ChordAnnotation[] = Array.from(byPosition.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([position, name]) => ({ position, name }));

  return {
    ...line,
    orderIndex,
    text: line.text ?? '',
    chordAnnotations,
  };
};

const normalizeLines = (lines: SongLine[]): SongLine[] =>
  lines.map((line, index) => normalizeLine(line, index));

const adjustChordsForTextChange = (
  previousTextInput: string | null | undefined,
  nextTextInput: string,
  chordsInput: ChordAnnotation[] | null | undefined
): ChordAnnotation[] => {
  const previousChars = Array.from(previousTextInput ?? '');
  const nextChars = Array.from(nextTextInput ?? '');
  let prefix = 0;

  while (
    prefix < previousChars.length &&
    prefix < nextChars.length &&
    previousChars[prefix] === nextChars[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < previousChars.length - prefix &&
    suffix < nextChars.length - prefix &&
    previousChars[previousChars.length - 1 - suffix] === nextChars[nextChars.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const deletedStart = prefix;
  const deletedEnd = previousChars.length - suffix;
  const insertedCount = nextChars.length - prefix - suffix;
  const deletedCount = deletedEnd - deletedStart;
  const delta = insertedCount - deletedCount;

  return (chordsInput ?? [])
    .flatMap((chord) => {
      const position = Number(chord.position ?? 0);
      if (position >= deletedStart && position < deletedEnd) return [];

      const shiftedPosition = position >= deletedEnd ? position + delta : position;
      if (shiftedPosition < 0 || shiftedPosition >= nextChars.length) return [];

      return [{ ...chord, position: shiftedPosition }];
    });
};

const getCaretOffset = (element: HTMLElement): number => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return element.textContent?.length ?? 0;

  const range = selection.getRangeAt(0);
  if (!element.contains(range.endContainer)) return element.textContent?.length ?? 0;

  const beforeCaret = range.cloneRange();
  beforeCaret.selectNodeContents(element);
  beforeCaret.setEnd(range.endContainer, range.endOffset);
  return Array.from(beforeCaret.toString()).length;
};

const setCaretOffset = (element: HTMLElement, offset: number) => {
  element.focus();

  const textNode = element.firstChild ?? element.appendChild(document.createTextNode(''));
  const range = document.createRange();
  const safeOffset = Math.max(0, Math.min(offset, textNode.textContent?.length ?? 0));
  range.setStart(textNode, safeOffset);
  range.collapse(true);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

const lineKey = (line: SongLine, index: number) => line.id ?? `line-${index}`;

const codePointToCodeUnitIndex = (text: string, codePointOffset: number): number => {
  const safeOffset = Math.max(0, codePointOffset);
  let codePointIndex = 0;
  let codeUnitIndex = 0;
  for (const symbol of text) {
    if (codePointIndex >= safeOffset) break;
    codeUnitIndex += symbol.length;
    codePointIndex += 1;
  }
  return codeUnitIndex;
};

const buildChordMarkerLayout = (line: SongLine): ChordMarkerLayout => {
  const normalized = (line.chordAnnotations ?? [])
    .map((chord) => ({
      position: Math.max(0, Number(chord.position ?? 0)),
      name: chord.name ?? '',
    }))
    .sort((a, b) => a.position - b.position);

  if (normalized.length === 0) return { markers: [], rowCount: 1 };

  const rowEnds: number[] = [];
  const markers: PositionedChord[] = [];

  for (const chord of normalized) {
    const labelWidth = Math.max(1, Array.from(chord.name).length) + CHORD_MARKER_WIDTH_PADDING_CH;
    const start = chord.position;
    const end = chord.position + labelWidth;

    let row = rowEnds.findIndex((rowEnd) => start >= rowEnd + CHORD_MARKER_GAP_CH);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(end);
    } else {
      rowEnds[row] = end;
    }

    markers.push({
      position: chord.position,
      name: chord.name,
      row,
    });
  }

  return {
    markers,
    rowCount: Math.max(1, rowEnds.length),
  };
};

const areAnchorMetricsEqual = (
  previous: Record<string, { left: number; width: number }>,
  next: Record<string, { left: number; width: number }>
): boolean => {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return false;

  for (const key of nextKeys) {
    const prevValue = previous[key];
    const nextValue = next[key];
    if (!prevValue || !nextValue) return false;
    if (prevValue.left !== nextValue.left || prevValue.width !== nextValue.width) {
      return false;
    }
  }

  return true;
};

export function LyricsChordEditor({
  lines,
  onChange,
  disabled = false,
  lockSongPartLines = false,
}: Readonly<LyricsChordEditorProps>) {
  const [selectedLine, setSelectedLine] = useState<number>(0);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [chordMode, setChordMode] = useState<boolean>(false);
  const [bubble, setBubble] = useState<{ lineIndex: number; position: number } | null>(null);
  const [chordDraft, setChordDraft] = useState<string>('');
  const [songPartMenuOpen, setSongPartMenuOpen] = useState<boolean>(false);
  const [songPartPreset, setSongPartPreset] = useState<string>(SONG_PART_OPTIONS[0]);
  const [songPartCustom, setSongPartCustom] = useState<string>('');
  const [refrainRepeatCount, setRefrainRepeatCount] = useState<string>('1');
  const lineRefs = useRef(new Map<number, HTMLDivElement>());
  const lineStackRefs = useRef(new Map<number, HTMLDivElement>());
  const charButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [chordAnchorMetricsPx, setChordAnchorMetricsPx] = useState<
    Record<string, { left: number; width: number }>
  >({});
  const pendingFocus = useRef<{ lineIndex: number; offset: number } | null>(null);
  const toAnchorKey = (lineIndex: number, position: number) => `${lineIndex}:${position}`;
  const clearChordSelection = () => {
    setBubble(null);
    setChordDraft('');
    setSelectedLine(-1);
    setSelectedPosition(-1);
  };

  const safeLines = useMemo(
    () =>
      normalizeLines(
        lines?.length ? lines : [{ orderIndex: 0, text: '', chordAnnotations: [] }]
      ),
    [lines]
  );

  const emit = (next: SongLine[]) => onChange(normalizeLines(next));
  const isLockedSongPartLineAt = (lineIndex: number): boolean =>
    lockSongPartLines && isSongPartLine(safeLines[lineIndex]?.text ?? '');

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && songPartMenuOpen) {
        event.preventDefault();
        setSongPartMenuOpen(false);
        return;
      }

      if (!event.ctrlKey) return;

      const key = event.key.toLowerCase();
      if (key !== 'x' && key !== 'p') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (disabled) return;

      if (key === 'x') {
        setChordMode((current) => {
          const next = !current;
          if (!next) setBubble(null);
          return next;
        });
        setSongPartMenuOpen(false);
        return;
      }

      setChordMode(false);
      setBubble(null);
      setSongPartMenuOpen(true);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [disabled, songPartMenuOpen]);

  useEffect(() => {
    if (!pendingFocus.current || chordMode) return;
    const { lineIndex, offset } = pendingFocus.current;
    pendingFocus.current = null;
    const node = lineRefs.current.get(lineIndex);
    if (node) setCaretOffset(node, offset);
  }, [safeLines, chordMode]);

  useLayoutEffect(() => {
    const measureAnchors = () => {
      const next: Record<string, { left: number; width: number }> = {};

      for (let lineIndex = 0; lineIndex < safeLines.length; lineIndex += 1) {
        const stack = lineStackRefs.current.get(lineIndex);
        if (!stack) continue;

        const stackRect = stack.getBoundingClientRect();
        const line = safeLines[lineIndex];
        const lineText = line.text ?? '';
        const textLength = Array.from(lineText).length;

        for (const chord of line.chordAnnotations ?? []) {
          const position = Math.max(0, Number(chord.position ?? 0));
          const anchorKey = toAnchorKey(lineIndex, position);

          // In chord mode we can measure exact character buttons.
          if (chordMode) {
            const button = charButtonRefs.current.get(anchorKey);
            if (!button) continue;
            const buttonRect = button.getBoundingClientRect();
            next[anchorKey] = {
              left: buttonRect.left - stackRect.left,
              width: buttonRect.width,
            };
            continue;
          }

          // In text mode we measure against the editable text node so imported chords are
          // already aligned before the user toggles chord mode.
          const editable = lineRefs.current.get(lineIndex);
          const textNode = editable?.firstChild;
          if (!editable || !textNode || textNode.nodeType !== Node.TEXT_NODE) continue;

          const clampedPosition = Math.min(textLength, position);
          const startOffset = codePointToCodeUnitIndex(lineText, clampedPosition);
          const endOffset =
            clampedPosition < textLength
              ? codePointToCodeUnitIndex(lineText, clampedPosition + 1)
              : startOffset;

          const range = document.createRange();
          range.setStart(textNode, startOffset);
          range.setEnd(textNode, endOffset);
          const rect = range.getBoundingClientRect();

          if (rect.left === 0 && rect.width === 0 && clampedPosition === 0 && lineText.length === 0) {
            continue;
          }

          const fallbackWidth = Math.max(1, parseFloat(getComputedStyle(editable).fontSize || '16') * 0.6);
          next[anchorKey] = {
            left: rect.left - stackRect.left,
            width: rect.width > 0 ? rect.width : fallbackWidth,
          };
        }
      }

      setChordAnchorMetricsPx((previous) =>
        areAnchorMetricsEqual(previous, next) ? previous : next
      );
    };

    measureAnchors();
    const rafId = globalThis.requestAnimationFrame(measureAnchors);
    const onResize = () => measureAnchors();
    globalThis.addEventListener('resize', onResize);

    return () => {
      globalThis.cancelAnimationFrame(rafId);
      globalThis.removeEventListener('resize', onResize);
    };
  }, [chordMode, safeLines]);

  const keepFocus = (lineIndex: number, offset: number) => {
    pendingFocus.current = { lineIndex, offset };
    setSelectedLine(lineIndex);
    setSelectedPosition(offset);
  };

  const updateLineText = (lineIndex: number, nextText: string) => {
    const next = safeLines.map((line, index) => {
      if (index !== lineIndex) return line;
      return {
        ...line,
        text: nextText,
        chordAnnotations: adjustChordsForTextChange(
          line.text,
          nextText,
          line.chordAnnotations
        ),
      };
    });

    emit(next);
  };

  const splitLine = (lineIndex: number, offset: number) => {
    const line = safeLines[lineIndex];
    if (!line) return;

    const chars = Array.from(line.text ?? '');
    const beforeText = chars.slice(0, offset).join('');
    const afterText = chars.slice(offset).join('');
    const beforeChords: ChordAnnotation[] = [];
    const afterChords: ChordAnnotation[] = [];

    for (const chord of line.chordAnnotations ?? []) {
      const position = Number(chord.position ?? 0);
      if (position < offset) beforeChords.push(chord);
      else afterChords.push({ ...chord, position: position - offset });
    }

    const nextLine: SongLine = {
      orderIndex: lineIndex + 1,
      text: afterText,
      chordAnnotations: afterChords,
    };

    emit([
      ...safeLines.slice(0, lineIndex),
      { ...line, text: beforeText, chordAnnotations: beforeChords },
      nextLine,
      ...safeLines.slice(lineIndex + 1),
    ]);
    keepFocus(lineIndex + 1, 0);
  };

  const mergeWithPrevious = (lineIndex: number) => {
    if (lineIndex <= 0) return;

    const previous = safeLines[lineIndex - 1];
    const current = safeLines[lineIndex];
    const previousLength = Array.from(previous.text ?? '').length;
    const mergedText = `${previous.text ?? ''}${current.text ?? ''}`;
    const mergedChords = [
      ...(previous.chordAnnotations ?? []),
      ...(current.chordAnnotations ?? []).map((chord) => ({
        ...chord,
        position: Number(chord.position ?? 0) + previousLength,
      })),
    ];

    emit([
      ...safeLines.slice(0, lineIndex - 1),
      { ...previous, text: mergedText, chordAnnotations: mergedChords },
      ...safeLines.slice(lineIndex + 1),
    ]);
    keepFocus(lineIndex - 1, previousLength);
  };

  const insertTextAtCaret = (lineIndex: number, text: string, offset: number) => {
    const line = safeLines[lineIndex];
    if (!line) return;

    const chars = Array.from(line.text ?? '');
    const normalized = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    const pasteLines = normalized.split('\n');

    if (pasteLines.length === 1) {
      const nextText = `${chars.slice(0, offset).join('')}${normalized}${chars
        .slice(offset)
        .join('')}`;
      updateLineText(lineIndex, nextText);
      keepFocus(lineIndex, offset + Array.from(normalized).length);
      return;
    }

    const beforeText = chars.slice(0, offset).join('');
    const afterText = chars.slice(offset).join('');
    const firstText = `${beforeText}${pasteLines[0]}`;
    const lastText = `${pasteLines[pasteLines.length - 1]}${afterText}`;
    const afterShift = Array.from(pasteLines[pasteLines.length - 1]).length;
    const firstChords: ChordAnnotation[] = [];
    const lastChords: ChordAnnotation[] = [];

    for (const chord of line.chordAnnotations ?? []) {
      const position = Number(chord.position ?? 0);
      if (position < offset) firstChords.push(chord);
      else lastChords.push({ ...chord, position: position - offset + afterShift });
    }

    const insertedLines: SongLine[] = [
      { ...line, text: firstText, chordAnnotations: firstChords },
      ...pasteLines.slice(1, -1).map((row) => ({
        orderIndex: 0,
        text: row,
        chordAnnotations: [],
      })),
      { orderIndex: 0, text: lastText, chordAnnotations: lastChords },
    ];

    emit([
      ...safeLines.slice(0, lineIndex),
      ...insertedLines,
      ...safeLines.slice(lineIndex + 1),
    ]);
    keepFocus(lineIndex + insertedLines.length - 1, Array.from(pasteLines.at(-1) ?? '').length);
  };

  const onEditableKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, lineIndex: number) => {
    if (disabled || chordMode || isLockedSongPartLineAt(lineIndex)) return;
    const offset = getCaretOffset(event.currentTarget);

    if (event.key === 'Enter') {
      event.preventDefault();
      splitLine(lineIndex, offset);
      return;
    }

    if (event.key === 'Backspace' && offset === 0) {
      if (isLockedSongPartLineAt(lineIndex - 1)) {
        return;
      }
      event.preventDefault();
      mergeWithPrevious(lineIndex);
    }
  };

  const onEditablePaste = (event: ClipboardEvent<HTMLDivElement>, lineIndex: number) => {
    if (disabled || chordMode || isLockedSongPartLineAt(lineIndex)) return;
    event.preventDefault();
    insertTextAtCaret(lineIndex, event.clipboardData.getData('text/plain'), getCaretOffset(event.currentTarget));
  };

  const selectChar = (lineIndex: number, position: number) => {
    if (!chordMode || disabled) return;
    const line = safeLines[lineIndex];
    if (!line || !isLyricLine(line.text ?? '')) return;

    setSelectedLine(lineIndex);
    setSelectedPosition(position);
    setBubble({ lineIndex, position });

    const existingChord = safeLines[lineIndex]?.chordAnnotations?.find(
      (chord) => Number(chord.position ?? 0) === position
    );
    setChordDraft(existingChord?.name ?? '');
  };

  const setChordAtSelection = () => {
    const chordName = normalizeChord(chordDraft);
    if (!chordName) return;
    const lineIndex = bubble?.lineIndex ?? selectedLine;
    const position = bubble?.position ?? selectedPosition;
    if (lineIndex < 0 || lineIndex >= safeLines.length) return;
    if (!isLyricLine(safeLines[lineIndex]?.text ?? '')) return;

    const next = safeLines.map((line, i) => {
      if (i !== lineIndex) return line;
      const filtered = (line.chordAnnotations ?? []).filter(
        (chord) => Number(chord.position ?? 0) !== position
      );
      return {
        ...line,
        chordAnnotations: [...filtered, { position, name: chordName }],
      };
    });

    emit(next);
    clearChordSelection();
  };

  const insertSongPartLine = () => {
    let selectedLabel =
      songPartPreset === 'Benutzerdefiniert' ? songPartCustom : songPartPreset;
    if (selectedSongPartLabel === 'refrain') {
      const parsedCount = Number.parseInt(refrainRepeatCount, 10);
      const repeatCount = Number.isNaN(parsedCount) ? 1 : Math.max(1, parsedCount);
      selectedLabel = repeatCount > 1 ? `Refrain: ${repeatCount}x` : 'Refrain';
    }
    const lineText = toSongPartLineText(selectedLabel);
    if (!lineText) return;

    const targetIndex = Math.min(Math.max(selectedLine, 0), safeLines.length);
    const nextLine: SongLine = {
      orderIndex: 0,
      text: lineText,
      chordAnnotations: [],
    };

    emit([
      ...safeLines.slice(0, targetIndex),
      nextLine,
      ...safeLines.slice(targetIndex),
    ]);

    if (targetIndex < safeLines.length) keepFocus(targetIndex + 1, 0);
    else keepFocus(targetIndex, Array.from(nextLine.text).length);

    setSongPartMenuOpen(false);
    setSongPartCustom('');
  };

  let lyricLineCounter = 0;
  const lyricLineNumbers = safeLines.map((line) => {
    if (isSongPartLine(line.text ?? '')) return null;
    lyricLineCounter += 1;
    return lyricLineCounter;
  });
  const refrainUnderlineFlags = getRefrainUnderlineFlags(safeLines);
  const selectedSongPartLabel = getSongPartLabel(
    toSongPartLineText(
      songPartPreset === 'Benutzerdefiniert' ? songPartCustom : songPartPreset
    )
  );

  const removeChordAtSelection = () => {
    const lineIndex = bubble?.lineIndex ?? selectedLine;
    const position = bubble?.position ?? selectedPosition;
    if (lineIndex < 0 || lineIndex >= safeLines.length) return;
    if (!isLyricLine(safeLines[lineIndex]?.text ?? '')) return;
    const next = safeLines.map((line, i) =>
      i !== lineIndex
        ? line
        : {
            ...line,
            chordAnnotations: (line.chordAnnotations ?? []).filter(
              (chord) => Number(chord.position ?? 0) !== position
            ),
          }
    );
    emit(next);
    clearChordSelection();
  };

  const renderChordMarkers = (layout: ChordMarkerLayout, lineIndex: number) =>
    layout.markers.map((marker) => {
      const measuredAnchor = chordAnchorMetricsPx[toAnchorKey(lineIndex, marker.position)];
      const pointerOffsetPx = measuredAnchor
        ? Math.max(1, measuredAnchor.width / 2)
        : null;
      const markerLeft =
        measuredAnchor !== undefined
          ? `${measuredAnchor.left - pointerOffsetPx!}px`
          : `calc(${marker.position} * var(--lyrics-char-width))`;
      const pointerOffset =
        pointerOffsetPx !== null ? `${pointerOffsetPx}px` : undefined;
      const visualRow = Math.max(0, layout.rowCount - 1 - marker.row);

      return (
        <span
          className="lyrics-chord-marker"
          key={`chord-${marker.position}-${marker.name}-r${marker.row}`}
          style={{
            left: markerLeft,
            top: `calc(${visualRow} * var(--lyrics-chord-row-height) + 0.05rem)`,
            ...(pointerOffset
              ? ({ '--lyrics-chord-pointer-offset': pointerOffset } as CSSProperties)
              : {}),
          }}
        >
          {marker.name}
        </span>
      );
    });

  const renderChordUnderlines = (line: SongLine) =>
    (line.chordAnnotations ?? []).map((chord) => {
      const position = Number(chord.position ?? 0);
      return (
        <span
          className="lyrics-chord-underline"
          key={`underline-${position}-${chord.name}`}
          style={{ left: `calc(${position} * var(--lyrics-char-width))` }}
        />
      );
    });

  const renderInteractiveLine = (line: SongLine, lineIndex: number) => {
    if (isSongPartLine(line.text ?? '')) {
      return <span>{line.text}</span>;
    }

    const textChars = Array.from(line.text ?? '');
    const chordMap = new Map<number, string>(
      (line.chordAnnotations ?? []).map((c) => [Number(c.position ?? 0), c.name])
    );

    if (textChars.length === 0) return <span className="lyrics-empty-line">&nbsp;</span>;

    return textChars.map((ch, pos) => {
      const isSelected = selectedLine === lineIndex && selectedPosition === pos;
      const hasChord = chordMap.has(pos);
      const isBubbleOpen = bubble?.lineIndex === lineIndex && bubble.position === pos;
      const charClassName =
        'lyrics-char-btn' +
        (isSelected ? ' is-selected' : '') +
        (hasChord ? ' has-chord' : '');

      return (
        <span className="lyrics-char-wrap" key={`c-${lineIndex}-${pos}`}>
          <button
            type="button"
            onClick={() => selectChar(lineIndex, pos)}
            className={charClassName}
            ref={(node) => {
              const anchorKey = toAnchorKey(lineIndex, pos);
              if (node) charButtonRefs.current.set(anchorKey, node);
              else charButtonRefs.current.delete(anchorKey);
            }}
            disabled={disabled}
            title={`Position ${pos + 1}${hasChord ? ` (${chordMap.get(pos)})` : ''}`}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </button>
          {isBubbleOpen && (
            <div
              className={
                'lyrics-chord-popover' +
                (lineIndex === 0 ? ' is-below' : '') +
                (pos < 6 ? ' is-near-left' : '')
              }
            >
              <input
                type="text"
                value={chordDraft}
                onChange={(e) => setChordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setChordAtSelection();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setBubble(null);
                  }
                }}
                placeholder="Akkord"
                className="text-input"
                maxLength={MAX_CHORD_NAME_LENGTH}
                autoFocus
              />
              <div className="lyrics-chord-popover-actions">
                <button
                  type="button"
                  onClick={setChordAtSelection}
                  className="primary-button btn-confirm"
                >
                  Setzen
                </button>
                <button
                  type="button"
                  onClick={removeChordAtSelection}
                  className="primary-button btn-export"
                >
                  Entfernen
                </button>
              </div>
            </div>
          )}
        </span>
      );
    });
  };

  const renderEditorRows = () =>
    safeLines.map((line, lineIndex) => {
      const lyricLineNumber = lyricLineNumbers[lineIndex];
      const currentIsSongPartLine = isSongPartLine(line.text ?? '');
      const shouldUnderlineLine = refrainUnderlineFlags[lineIndex] ?? false;
      const chordLayout = buildChordMarkerLayout(line);

      return (
        <div className="lyrics-editor-textline" key={lineKey(line, lineIndex)}>
          <span
            className={
              currentIsSongPartLine
                ? 'lyrics-line-number-static is-song-part-line'
                : 'lyrics-line-number-static'
            }
          >
            {currentIsSongPartLine ? '' : lyricLineNumber}
          </span>
          <div
            className="lyrics-line-stack"
            ref={(node) => {
              if (node) lineStackRefs.current.set(lineIndex, node);
              else lineStackRefs.current.delete(lineIndex);
            }}
            style={
              {
                '--lyrics-chord-rows': chordLayout.rowCount,
              } as CSSProperties
            }
          >
            <div className="lyrics-chord-layer" aria-hidden="true">
              {renderChordMarkers(chordLayout, lineIndex)}
            </div>
            <div
              className={
                shouldUnderlineLine
                  ? 'lyrics-text-layer is-refrain-underlined'
                  : 'lyrics-text-layer'
              }
            >
              {renderChordUnderlines(line)}
              {chordMode ? (
                <div className="lyrics-editor-chars">{renderInteractiveLine(line, lineIndex)}</div>
              ) : (
                <div
                  ref={(node) => {
                    if (node) lineRefs.current.set(lineIndex, node);
                    else lineRefs.current.delete(lineIndex);
                  }}
                  className={
                    isLockedSongPartLineAt(lineIndex)
                      ? 'lyrics-line-editable is-readonly-songpart'
                      : 'lyrics-line-editable'
                  }
                  contentEditable={!disabled && !isLockedSongPartLineAt(lineIndex)}
                  suppressContentEditableWarning
                  spellCheck={false}
                  onInput={(event) => {
                    if (isLockedSongPartLineAt(lineIndex)) return;
                    const caretOffset = getCaretOffset(event.currentTarget);
                    updateLineText(lineIndex, event.currentTarget.textContent ?? '');
                    keepFocus(lineIndex, caretOffset);
                  }}
                  onKeyDown={(event) => onEditableKeyDown(event, lineIndex)}
                  onPaste={(event) => onEditablePaste(event, lineIndex)}
                  onFocus={(event) => {
                    setSelectedLine(lineIndex);
                    setSelectedPosition(getCaretOffset(event.currentTarget));
                  }}
                  onKeyUp={(event) => setSelectedPosition(getCaretOffset(event.currentTarget))}
                  role="textbox"
                  aria-label={
                    currentIsSongPartLine
                      ? `Songpart ${line.text ?? ''}`
                      : `Songtext Zeile ${lyricLineNumber ?? 1}`
                  }
                >
                  {line.text}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });

  return (
    <div className="lyrics-editor">
      <div className="lyrics-editor-toolbar">
        <div
          className={
            chordMode
              ? 'lyrics-editor-mode-indicator is-active'
              : 'lyrics-editor-mode-indicator'
          }
        >
          {chordMode ? 'Akkord-Modus aktiv' : 'Text-Modus'}
        </div>
        <div className="lyrics-toolbar-actions">
          <div className="lyrics-songpart-menu-wrap">
            <button
              type="button"
              onClick={() => {
                setSongPartMenuOpen((current) => !current);
                setBubble(null);
                setChordMode(false);
              }}
              disabled={disabled}
              className="primary-button btn-export lyrics-mode-button"
            >
              Songpart einfuegen (Strg+P)
            </button>
            {songPartMenuOpen && (
              <div className="lyrics-songpart-menu">
                <select
                  className="text-input"
                  value={songPartPreset}
                  onChange={(event) => setSongPartPreset(event.target.value)}
                >
                  {SONG_PART_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {songPartPreset === 'Benutzerdefiniert' && (
                  <input
                    type="text"
                    value={songPartCustom}
                    onChange={(event) => setSongPartCustom(event.target.value)}
                    placeholder="z. B. Solo"
                    className="text-input"
                  />
                )}
                {selectedSongPartLabel === 'refrain' && (
                  <>
                    <label htmlFor="refrain-repeat-count">Anzahl Wiederholungen:</label>
                    <input
                      id="refrain-repeat-count"
                      type="number"
                      min={1}
                      step={1}
                      value={refrainRepeatCount}
                      onChange={(event) => setRefrainRepeatCount(event.target.value)}
                      className="text-input"
                    />
                    <p>
                      Hinweis: 1x wird als <code>[Refrain]</code> eingefuegt, ab 2x als{' '}
                      <code>[Refrain: Nx]</code>.
                    </p>
                  </>
                )}
                {selectedSongPartLabel === 'refrain end' && (
                  <p>
                    Hinweis: <code>[Refrain End]</code> beendet den Refrain-Block, wird in der Song-Detail-Seite
                    aber nicht angezeigt.
                  </p>
                )}
                <div className="lyrics-songpart-menu-actions">
                  <button
                    type="button"
                    onClick={insertSongPartLine}
                    className="primary-button btn-confirm"
                  >
                    Einfuegen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSongPartMenuOpen(false)}
                    className="primary-button btn-neutral"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setChordMode((current) => !current);
              setBubble(null);
              setSongPartMenuOpen(false);
            }}
            disabled={disabled}
            className={
              chordMode
                ? 'primary-button btn-confirm lyrics-mode-button'
                : 'primary-button btn-neutral lyrics-mode-button'
            }
          >
            {chordMode ? 'Text bearbeiten' : 'Akkorde setzen'}
          </button>
        </div>
      </div>

      <div className="lyrics-editor-import lyrics-editor-fulltext">
        <label htmlFor="bulk-lyrics-input">Songtext</label>
        <div
          id="bulk-lyrics-input"
          className={
            chordMode
              ? 'textarea-chords lyrics-chord-surface is-chord-mode'
              : 'textarea-chords lyrics-chord-surface'
          }
          aria-label="Songtext"
        >
          {renderEditorRows()}
        </div>
      </div>
    </div>
  );
}
