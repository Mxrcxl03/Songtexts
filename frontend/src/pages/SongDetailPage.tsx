import '../styles/global.css';
import { useParams } from 'react-router';
import {
  useEffect,
  useState,
  type JSX,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import api from '../services/api';
import axios from 'axios';
import type {
  Song,
  SongLine,
  SongLineEditRowProps,
  SongLineViewRowProps,
} from '../types/song';
import type { ChordAnnotation, LooseChord } from '../types/chordAnnotation';
import type { User } from '../types/user';
import UserService from '../services/user.service';

export function buildChordAndTextCentered(
  textInput: string | null | undefined,
  ann: LooseChord[] | null | undefined
): { chordRow: string; textRow: JSX.Element } {
  const raw = (textInput ?? '').replaceAll('\r', '');
  const textChars = Array.from(raw);

  const FIXED_LEFT_PAD = 5;

  let chordCells: string[] = Array.from(
    { length: FIXED_LEFT_PAD + textChars.length },
    () => ' '
  );

  const ensureChordCapacity = (need: number) => {
    while (chordCells.length < need) chordCells.push(' ');
  };

  for (const a of ann ?? []) {
    if (a?.position == null || a.name == null) continue;

    const anchor = Math.max(0, Number(a.position));
    const name = String(a.name);
    const len = name.length;

    const theoreticalStart = anchor - Math.floor(len / 2);
    const clampedStart = Math.max(theoreticalStart, -FIXED_LEFT_PAD);
    const realStart = clampedStart + FIXED_LEFT_PAD;

    ensureChordCapacity(realStart + len);

    for (let i = 0; i < len; i++) {
      chordCells[realStart + i] = name[i];
    }
  }

  const hitPositions = new Set<number>();
  for (const a of ann ?? []) {
    if (a?.position != null) {
      hitPositions.add(Math.max(0, Number(a.position)));
    }
  }

  const textRow = (
    <span>
      {Array.from({ length: FIXED_LEFT_PAD }, (_, i) => (
        <span key={'pad-' + i}>&nbsp;</span>
      ))}
      {textChars.map((ch, i) =>
        hitPositions.has(i) ? (
          <span key={i} className="chord-hit">
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </span>
  );

  return {
    chordRow: chordCells.join(''),
    textRow,
  };
}

function serializeLineWithChords(
  textInput: string | null | undefined,
  ann: ChordAnnotation[] | null | undefined
): string {
  const text = (textInput ?? '').replaceAll('\r', '');
  const chars = Array.from(text);

  const chords = (ann ?? [])
    .filter((c) => c.name && c.name.trim().length > 0)
    .map((c) => ({
      name: String(c.name),
      position: Number(c.position ?? 0),
    }))
    .sort((a, b) => a.position - b.position);

  if (chars.length === 0 && chords.length === 0) {
    return '';
  }

  let result = '';
  let pos = 0;
  let chordIndex = 0;

  while (pos <= chars.length) {
    while (chordIndex < chords.length && chords[chordIndex].position === pos) {
      const c = chords[chordIndex];
      result += `[${c.name}]`;
      chordIndex++;
    }

    if (pos < chars.length) {
      result += chars[pos];
    }

    pos++;
  }

  return result;
}

function parseLineMarkup(markupInput: string): {
  text: string;
  chords: ChordAnnotation[];
} {
  const input = markupInput.replaceAll('\r', '');
  let text = '';
  const chords: ChordAnnotation[] = [];

  let i = 0;
  let textPos = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === '[') {
      const end = input.indexOf(']', i + 1);
      if (end === -1) {
        text += ch;
        i++;
        textPos++;
        continue;
      }

      const name = input.slice(i + 1, end).trim();
      if (name.length > 0) {
        chords.push({
          position: textPos,
          name,
        });
      }

      i = end + 1;
      continue;
    }

    text += ch;
    i++;
    textPos++;
  }

  return { text, chords };
}

function SongLineViewRow({ index, line }: Readonly<SongLineViewRowProps>) {
  const { chordRow, textRow } = buildChordAndTextCentered(
    line?.text,
    line?.chordAnnotations
  );
  const chordOut = chordRow || '\u00A0';

  return (
    <div className="line-wrapper">
      <div className="line-number">{index + 1}</div>
      <div style={{ flex: 1 }}>
        <pre className="pre">{chordOut}</pre>
        <pre className="pre">{textRow}</pre>
      </div>
    </div>
  );
}

function SongLineEditRow({
  index,
  line,
  onChangeFromMarkup,
  onSplitLine,
}: Readonly<SongLineEditRowProps>) {
  const markup = serializeLineWithChords(
    line?.text ?? '',
    line?.chordAnnotations ?? []
  );

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const { text, chords } = parseLineMarkup(value);
    onChangeFromMarkup(index, text, chords);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const value = e.currentTarget.value;
      const cursor = e.currentTarget.selectionStart ?? value.length;

      const before = value.slice(0, cursor);
      const after = value.slice(cursor);

      onSplitLine(index, before, after);
    }
  };

  return (
    <div className="line-wrapper">
      <div className="line-number">{index + 1}</div>
      <div style={{ flex: 1 }}>
        <textarea
          className="textarea-chords"
          value={markup}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Mit [C], [Am], [F#] Akkorde direkt im Text setzen und Enter für neue Zeile nutzen."
        />
      </div>
    </div>
  );
}

export function SongDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Fehlender URL-Parameter :id');
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    UserService.getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get<Song>(
          `/public/song/${encodeURIComponent(id)}`,
          { signal: controller.signal }
        );

        setSong({
          ...data,
          album: (data as any).album ?? null,
          lines: Array.isArray((data as any).lines) ? (data as any).lines : [],
        });
      } catch (err) {
        if (axios.isCancel(err)) return;

        if (axios.isAxiosError(err)) {
          const status = err.response?.status;

          if (status === 404) {
            setError('Song nicht gefunden (404).');
          } else if (status === 401) {
            setError('Nicht eingeloggt oder Session abgelaufen (401).');
          } else if (status) {
            setError(
              `HTTP ${status}: ${
                err.response?.statusText || 'Unbekannter Fehler'
              }`
            );
          } else {
            setError(err.message || 'Netzwerkfehler');
          }
        } else {
          setError((err as Error)?.message ?? 'Unbekannter Fehler');
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  const safeRenumber = (lines: SongLine[]): SongLine[] =>
    lines.map((line, i) => ({
      ...line,
      orderIndex: i,
    }));

  const handleLineMarkupChange = (
    index: number,
    text: string,
    chords: ChordAnnotation[]
  ) => {
    if (!song) return;

    const updatedLines = song.lines.map((line, i) =>
      i === index
        ? {
            ...line,
            text,
            chordAnnotations: chords,
          }
        : line
    );

    setSong({ ...song, lines: updatedLines });
  };

  const handleSplitLine = (
    index: number,
    beforeMarkup: string,
    afterMarkup: string
  ) => {
    if (!song) return;

    const { text: beforeText, chords: beforeChords } =
      parseLineMarkup(beforeMarkup);
    const { text: afterText, chords: afterChords } =
      parseLineMarkup(afterMarkup);

    const current = song.lines[index];
    const updatedLines = [...song.lines];

    updatedLines[index] = {
      ...current,
      text: beforeText,
      chordAnnotations: beforeChords,
    };

    const newLine: SongLine = {
      text: afterText,
      chordAnnotations: afterChords,
    } as SongLine;

    updatedLines.splice(index + 1, 0, newLine);

    setSong({
      ...song,
      lines: safeRenumber(updatedLines),
    });
  };

  const handleToggleEditOrSave = async () => {
    if (!song) return;

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.put(
        `/public/song/${encodeURIComponent(String(song.id))}`,
        song
      );

      setIsEditing(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status) {
          setError(
            `Speichern fehlgeschlagen (HTTP ${status} ${
              err.response?.statusText || ''
            })`
          );
        } else {
          setError('Netzwerkfehler beim Speichern');
        }
      } else {
        setError(
          (err as Error)?.message ?? 'Unbekannter Fehler beim Speichern'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  let buttonLabel = 'Edit';
  if (isEditing) buttonLabel = 'Speichern';
  if (saving) buttonLabel = 'Speichert…';

  const renderLineRow = (line: SongLine, index: number) => {
    if (isEditing) {
      return (
        <SongLineEditRow
          key={line.id ?? index}
          index={index}
          line={line}
          onChangeFromMarkup={handleLineMarkupChange}
          onSplitLine={handleSplitLine}
        />
      );
    }
    return <SongLineViewRow key={line.id ?? index} index={index} line={line} />;
  };

  if (loading) return <p>Lädt…</p>;
  if (error) return <p style={{ color: 'crimson' }}>Fehler: {error}</p>;
  if (!song) return <p>Kein Song gefunden.</p>;
  const isAdmin = currentUser?.role === 'ADMIN';
  const hasNoLines = !song?.lines || song?.lines.length === 0;

  return (
    <div className="page">
      <div className="header-row">
        <h2 className="no-margin">{song.name}</h2>
        {isAdmin && (
          <button
            onClick={handleToggleEditOrSave}
            disabled={saving}
            className={
              'primary-button ' +
              (isEditing ? 'btn-save' : 'btn-edit') +
              (saving ? ' is-saving' : '')
            }
          >
            {buttonLabel}
          </button>
        )}
      </div>

      <p>
        <strong>Artist:</strong> {song.artist}
      </p>
      <p>
        <strong>Album:</strong> {song.album || '—'}
      </p>

      <h3>Text:</h3>

      <div className="text-box">
        {hasNoLines ? (
          <p className="no-margin">Keine Zeilen vorhanden.</p>
        ) : (
          <div>{song.lines.map(renderLineRow)}</div>
        )}
      </div>
    </div>
  );
}
