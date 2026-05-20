import { useState } from 'react';
import type { SongLine } from '../types/song';
import type { ChordAnnotation } from '../types/chordAnnotation';

type LyricsChordEditorProps = {
  lines: SongLine[];
  onChange: (lines: SongLine[]) => void;
  disabled?: boolean;
};

const normalizeChord = (name: string): string => name.trim();

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

export function LyricsChordEditor({
  lines,
  onChange,
  disabled = false,
}: Readonly<LyricsChordEditorProps>) {
  const [bulkText, setBulkText] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<number>(0);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [chordInput, setChordInput] = useState<string>('');

  const safeLines = normalizeLines(lines ?? []);

  const emit = (next: SongLine[]) => onChange(normalizeLines(next));

  const applyBulkText = (raw: string) => {
    const normalized = (raw ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    const rows = normalized.split('\n');
    const next: SongLine[] = rows.map((text, idx) => ({
      orderIndex: idx,
      text,
      chordAnnotations: [],
    }));
    emit(next.length > 0 ? next : [{ orderIndex: 0, text: '', chordAnnotations: [] }]);
    setSelectedLine(0);
    setSelectedPosition(0);
  };

  const setLineText = (index: number, text: string) => {
    const next = safeLines.map((line, i) => (i === index ? { ...line, text } : line));
    emit(next);
  };

  const addLine = () => {
    const next: SongLine[] = [
      ...safeLines,
      { orderIndex: safeLines.length, text: '', chordAnnotations: [] },
    ];
    emit(next);
    setSelectedLine(next.length - 1);
    setSelectedPosition(0);
  };

  const removeLine = (index: number) => {
    const next = safeLines.filter((_, i) => i !== index);
    emit(next);
    const fallbackLine = Math.max(0, Math.min(selectedLine, next.length - 1));
    setSelectedLine(fallbackLine);
    setSelectedPosition(0);
  };

  const selectChar = (lineIndex: number, position: number) => {
    setSelectedLine(lineIndex);
    setSelectedPosition(position);
  };

  const setChordAtSelection = () => {
    const chordName = normalizeChord(chordInput);
    if (!chordName) return;
    if (selectedLine < 0 || selectedLine >= safeLines.length) return;

    const next = safeLines.map((line, i) => {
      if (i !== selectedLine) return line;
      const filtered = (line.chordAnnotations ?? []).filter(
        (c) => Number(c.position ?? 0) !== selectedPosition
      );
      return {
        ...line,
        chordAnnotations: [...filtered, { position: selectedPosition, name: chordName }],
      };
    });

    emit(next);
    setChordInput('');
  };

  const removeChordAtSelection = () => {
    if (selectedLine < 0 || selectedLine >= safeLines.length) return;
    const next = safeLines.map((line, i) =>
      i !== selectedLine
        ? line
        : {
            ...line,
            chordAnnotations: (line.chordAnnotations ?? []).filter(
              (c) => Number(c.position ?? 0) !== selectedPosition
            ),
          }
    );
    emit(next);
  };

  return (
    <div className="lyrics-editor">
      <div className="lyrics-editor-toolbar">
        <button
          type="button"
          onClick={addLine}
          disabled={disabled}
          className="primary-button btn-neutral"
        >
          Zeile hinzufügen
        </button>
        <div className="lyrics-editor-selection">
          Zeile {safeLines.length === 0 ? 0 : selectedLine + 1}, Zeichen{' '}
          {selectedPosition + 1}
        </div>
        <input
          type="text"
          value={chordInput}
          onChange={(e) => setChordInput(e.target.value)}
          placeholder="Akkord (z. B. F#m7)"
          className="text-input"
          disabled={disabled || safeLines.length === 0}
        />
        <button
          type="button"
          onClick={setChordAtSelection}
          disabled={disabled || safeLines.length === 0}
          className="primary-button btn-confirm"
        >
          Akkord setzen
        </button>
        <button
          type="button"
          onClick={removeChordAtSelection}
          disabled={disabled || safeLines.length === 0}
          className="primary-button btn-export"
        >
          Akkord entfernen
        </button>
      </div>

      <div className="lyrics-editor-import">
        <label htmlFor="bulk-lyrics-input">Gesamten Songtext einfügen (Strg+V)</label>
        <textarea
          id="bulk-lyrics-input"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (!pasted) return;
            e.preventDefault();
            setBulkText(pasted);
            applyBulkText(pasted);
          }}
          placeholder="Kompletten Songtext hier einfügen. Zeilenumbrüche werden automatisch erkannt."
          className="textarea-chords"
          disabled={disabled}
        />
        <div className="button-row">
          <button
            type="button"
            onClick={() => applyBulkText(bulkText)}
            disabled={disabled}
            className="primary-button btn-neutral"
          >
            Text in Zeilen übernehmen
          </button>
        </div>
      </div>

      <div className="lyrics-editor-body">
        {safeLines.length === 0 && <p className="no-margin">Keine Zeilen vorhanden.</p>}
        {safeLines.map((line, lineIndex) => {
          const textChars = Array.from(line.text ?? '');
          const chordMap = new Map<number, string>(
            (line.chordAnnotations ?? []).map((c) => [Number(c.position ?? 0), c.name])
          );

          return (
            <div className="lyrics-editor-line" key={line.id ?? `line-${lineIndex}`}>
              <div className="lyrics-editor-line-head">
                <span className="line-number">{lineIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => removeLine(lineIndex)}
                  disabled={disabled}
                  className="primary-button btn-export"
                >
                  Zeile löschen
                </button>
              </div>

              <textarea
                value={line.text ?? ''}
                onChange={(e) => setLineText(lineIndex, e.target.value)}
                className="textarea-chords"
                disabled={disabled}
              />

              <div className="lyrics-editor-clickzone">
                <pre className="line-chords-word">{buildChordLine(line.text, line.chordAnnotations)}</pre>
                <div className="lyrics-editor-chars">
                  {textChars.length === 0 && (
                    <button
                      type="button"
                      onClick={() => selectChar(lineIndex, 0)}
                      className={
                        'lyrics-char-btn' +
                        (selectedLine === lineIndex && selectedPosition === 0 ? ' is-selected' : '')
                      }
                      disabled={disabled}
                    >
                      ·
                    </button>
                  )}
                  {textChars.map((ch, pos) => {
                    const isSelected = selectedLine === lineIndex && selectedPosition === pos;
                    const hasChord = chordMap.has(pos);
                    return (
                      <button
                        type="button"
                        key={`c-${lineIndex}-${pos}`}
                        onClick={() => selectChar(lineIndex, pos)}
                        className={
                          'lyrics-char-btn' +
                          (isSelected ? ' is-selected' : '') +
                          (hasChord ? ' has-chord' : '')
                        }
                        disabled={disabled}
                        title={`Position ${pos + 1}${hasChord ? ` (${chordMap.get(pos)})` : ''}`}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
