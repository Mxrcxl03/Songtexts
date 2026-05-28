import '../styles/global.css';
import { useNavigate, useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import axios from 'axios';
import type { Song, SongLine } from '../types/song';
import type { User } from '../types/user';
import UserService from '../services/user.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { buildChordLine } from '../utils/buildChordLine';
import { getRefrainUnderlineFlags, isSongPartLine } from '../utils/songPart';

const toDisplayString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};
const toBracketValue = (value: string | number | null | undefined): string => {
  const display = toDisplayString(value);
  return `[${display || ' '}]`;
};

function SongLineViewRow({
  line,
  lyricLineNumber,
  underlineText,
}: Readonly<{ line: SongLine; lyricLineNumber: number | null; underlineText: boolean }>) {
  const text = line?.text ?? '';
  const chordLine = buildChordLine(text, line?.chordAnnotations ?? []);
  const songPartLine = isSongPartLine(text);

  return (
    <div className="lyrics-editor-textline lyrics-editor-textline-readonly">
      <span
        className={
          songPartLine
            ? 'lyrics-line-number-static is-song-part-line'
            : 'lyrics-line-number-static'
        }
      >
        {songPartLine ? '' : lyricLineNumber}
      </span>
      <div className="lyrics-line-stack">
        <div className="lyrics-chord-layer" aria-hidden="true">
          <pre className="lyrics-line-readonly lyrics-line-readonly-chords">
            {chordLine.trim().length > 0 ? chordLine : '\u00A0'}
          </pre>
        </div>
        <div
          className={
            underlineText
              ? 'lyrics-text-layer is-refrain-underlined'
              : 'lyrics-text-layer'
          }
        >
          <pre className="lyrics-line-readonly lyrics-line-readonly-text">{text || '\u00A0'}</pre>
        </div>
      </div>
    </div>
  );
}

export function SongDetailPage() {
  const AUTO_SCROLL_PX_PER_SECOND = 42;
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollLastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Fehlender URL-Parameter :id');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    UserService.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<Song>(`/public/song/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        setSong({
          ...data,
          lines:
            Array.isArray((data as any).lines) && (data as any).lines.length > 0
              ? (data as any).lines
              : [{ orderIndex: 0, text: '', chordAnnotations: [] }],
        });
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (axios.isAxiosError(err)) {
          setError(err.response?.status ? `HTTP ${err.response.status}` : 'Netzwerkfehler');
        } else {
          setError((err as Error)?.message ?? 'Unbekannter Fehler');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!autoScrollActive) {
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      autoScrollLastTsRef.current = null;
      return;
    }

    const step = (timestamp: number) => {
      const previousTs = autoScrollLastTsRef.current ?? timestamp;
      const deltaMs = Math.max(0, timestamp - previousTs);
      autoScrollLastTsRef.current = timestamp;

      const maxScrollTop = Math.max(
        0,
        globalThis.document.documentElement.scrollHeight - globalThis.innerHeight
      );
      const currentScrollTop = globalThis.scrollY;

      if (currentScrollTop >= maxScrollTop - 1) {
        setAutoScrollActive(false);
        return;
      }

      const pixelsToScroll = (AUTO_SCROLL_PX_PER_SECOND * deltaMs) / 1000;
      globalThis.scrollTo(0, Math.min(maxScrollTop, currentScrollTop + pixelsToScroll));
      autoScrollFrameRef.current = requestAnimationFrame(step);
    };

    autoScrollFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      autoScrollLastTsRef.current = null;
    };
  }, [autoScrollActive]);

  if (loading) return <p>Laedt...</p>;
  if (error) return <p style={{ color: 'crimson' }}>Fehler: {error}</p>;
  if (!song) return <p>Kein Song gefunden.</p>;

  const isAdmin = currentUser?.role === 'ADMIN';
  const canAdminEdit = isAdmin && isOnline;
  const keyRootDisplay = toDisplayString(song.keyRoot);
  const keySuffixDisplay = toDisplayString(song.keySuffix);
  const keyDisplay = [keyRootDisplay, keySuffixDisplay ? `(${keySuffixDisplay})` : '']
    .filter(Boolean)
    .join(' ');
  const playDisplay = toDisplayString(song.play);
  const capoDisplay = song.capo === -1 ? '-' : toDisplayString(song.capo);
  const capoWithPlay = [
    capoDisplay,
    playDisplay ? `(Play: ${playDisplay})` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const taktartDisplay = [
    toDisplayString(song.timeSignature),
    song.bpm !== null && song.bpm !== undefined ? `(${song.bpm} BPM)` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const songNumberDisplay =
    song.runningNumber === null || song.runningNumber === undefined
      ? ''
      : String(song.runningNumber).padStart(4, '0');
  const genresDisplay = (song.genres ?? []).join(', ');
  let lyricLineCounter = 0;
  const lyricLineNumbers = (song.lines ?? []).map((line) => {
    if (isSongPartLine(line.text ?? '')) return null;
    lyricLineCounter += 1;
    return lyricLineCounter;
  });
  const refrainUnderlineFlags = getRefrainUnderlineFlags(song.lines ?? []);

  return (
    <div className="page">
      {isOffline && <div className="offline-banner">Offline-Modus aktiv: Song ist nur lesbar.</div>}

      <div className="header-row">
        <h2 className="no-margin">
          #{songNumberDisplay || '-'} {song.name}
        </h2>
        <div className="header-actions">
          {canAdminEdit && (
            <button
              onClick={() => navigate(`/song/${song.id}/edit`)}
              className="primary-button btn-edit icon-only-btn"
              title="Song bearbeiten"
              aria-label="Song bearbeiten"
            >
              <svg viewBox="0 0 24 24" className="song-action-icon" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="song-meta-columns" aria-label="Song Metadaten">
        <div className="song-meta-column">
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Song-Nr.:</strong>
            <span className="song-meta-item-value">{toBracketValue(songNumberDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Song-Titel:</strong>
            <span className="song-meta-item-value">{toBracketValue(song.name)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Interpret (Original):</strong>
            <span className="song-meta-item-value">{toBracketValue(song.artist)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Interpret (Version):</strong>
            <span className="song-meta-item-value">{toBracketValue(song.interpretVersion)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Album:</strong>
            <span className="song-meta-item-value">{toBracketValue(song.album)}</span>
          </p>
        </div>
        <div className="song-meta-column">
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Jahr:</strong>
            <span className="song-meta-item-value">{toBracketValue(song.songYear)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Komponist:</strong>
            <span className="song-meta-item-value">{toBracketValue(song.composer)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Produzent(en):</strong>
            <span className="song-meta-item-value">{toBracketValue(song.producer)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Genre:</strong>
            <span className="song-meta-item-value">{toBracketValue(genresDisplay)}</span>
          </p>
        </div>
        <div className="song-meta-column">
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Key:</strong>
            <span className="song-meta-item-value">{toBracketValue(keyDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Skala:</strong>
            <span className="song-meta-item-value">{toBracketValue(song.language)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Capo:</strong>
            <span className="song-meta-item-value">{toBracketValue(capoWithPlay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Taktart:</strong>
            <span className="song-meta-item-value">{toBracketValue(taktartDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Kadenz:</strong>
            <span className="song-meta-item-value">{toBracketValue(song.cadence)}</span>
          </p>
        </div>
      </div>

      <h3>Text:</h3>
      <div className="lyrics-editor-readonly">
        <div className="textarea-chords lyrics-chord-surface lyrics-chord-surface-readonly">
          {(song.lines ?? []).map((line, index) => (
            <SongLineViewRow
              key={line.id ?? index}
              line={line}
              lyricLineNumber={lyricLineNumbers[index]}
              underlineText={refrainUnderlineFlags[index] ?? false}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        className={
          autoScrollActive
            ? 'song-autoscroll-btn is-active'
            : 'song-autoscroll-btn'
        }
        onClick={() => setAutoScrollActive((current) => !current)}
      >
        {autoScrollActive ? 'AutoScroll stoppen' : 'AutoScroll'}
      </button>
    </div>
  );
}
