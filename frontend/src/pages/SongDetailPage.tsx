import '../styles/global.css';
import { useNavigate, useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import axios from 'axios';
import SongService from '../services/song.service';
import type { Song, SongLine } from '../types/song';
import type { User } from '../types/user';
import UserService from '../services/user.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { buildChordLine } from '../utils/buildChordLine';
import { getRefrainUnderlineFlags, getVisibleSongLineEntries } from '../utils/songPart';
import { toDisplayString, toLanguageDisplayValue, toMetaValue } from '../utils/songDisplay';

const toFileNamePart = (value: string | number | null | undefined): string => {
  const base = toDisplayString(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return base || 'song';
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

const getFullscreenElement = (): Element | null => {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement ?? null;
};

const canUseFullscreen = (): boolean => {
  const root = document.documentElement as FullscreenElement;
  const doc = document as FullscreenDocument;
  return Boolean(
    root.requestFullscreen
    || root.webkitRequestFullscreen
    || root.msRequestFullscreen
    || document.exitFullscreen
    || doc.webkitExitFullscreen
    || doc.msExitFullscreen
  );
};

const requestFullscreen = async () => {
  const root = document.documentElement as FullscreenElement;
  const request =
    root.requestFullscreen ?? root.webkitRequestFullscreen ?? root.msRequestFullscreen;
  await request?.call(root);
};

const exitFullscreen = async () => {
  const doc = document as FullscreenDocument;
  const exit = document.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.msExitFullscreen;
  await exit?.call(document);
};

function SongLineViewRow({
  line,
  underlineText,
  stropheNumber,
  startsAfterStropheEnd,
  displayText,
  underlineDisplayText,
  isDisplayedSongPart,
  isBackgroundContent,
  isInstrumentalSongPart,
}: Readonly<{
  line: SongLine;
  underlineText: boolean;
  stropheNumber: number | null;
  startsAfterStropheEnd: boolean;
  displayText: string | null;
  underlineDisplayText: boolean;
  isDisplayedSongPart: boolean;
  isBackgroundContent: boolean;
  isInstrumentalSongPart: boolean;
}>) {
  const text = displayText ?? line?.text ?? '';
  const chordLine = buildChordLine(text, line?.chordAnnotations ?? []);

  return (
    <div
      className={
        startsAfterStropheEnd
          ? 'lyrics-editor-textline lyrics-editor-textline-readonly is-after-strophe-end'
          : 'lyrics-editor-textline lyrics-editor-textline-readonly'
      }
    >
      <span className="lyrics-line-number-static is-strophe-number">
        {stropheNumber === null ? '' : `${stropheNumber}.`}
      </span>
      <div className="lyrics-line-stack">
        <div className="lyrics-chord-layer" aria-hidden="true">
          <pre className="lyrics-line-readonly lyrics-line-readonly-chords">
            {chordLine.trim().length > 0 ? chordLine : '\u00A0'}
          </pre>
        </div>
        <div
          className={
            [
              'lyrics-text-layer',
              underlineDisplayText ? 'is-refrain-underlined' : '',
              underlineText ? 'is-refrain-emphasized' : '',
              isDisplayedSongPart ? 'is-songpart-display' : '',
              isBackgroundContent ? 'is-background-content' : '',
              isInstrumentalSongPart ? 'is-instrumental-songpart' : '',
            ].filter(Boolean).join(' ')
          }
        >
          <pre className="lyrics-line-readonly lyrics-line-readonly-text">{text || '\u00A0'}</pre>
        </div>
      </div>
    </div>
  );
}

export function SongDetailPage() {
  const AUTO_SCROLL_PX_PER_SECOND = 18;
  const MIN_AUTO_SCROLL_SPEED = 0.2;
  const MAX_AUTO_SCROLL_SPEED = 2;
  const AUTO_SCROLL_SPEED_STEP = 0.1;
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollLastTsRef = useRef<number | null>(null);
  const autoScrollRemainderRef = useRef(0);
  const downloadSongAsDocx = async () => {
    if (!song) return;
    try {
      const response = await SongService.exportToWord(song.id);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const downloadUrl = globalThis.URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      const runningNumberPrefix =
        song.runningNumber === null || song.runningNumber === undefined
          ? ''
          : `${String(song.runningNumber).padStart(4, '0')}_`;

      anchor.href = downloadUrl;
      anchor.download = `${runningNumberPrefix}${toFileNamePart(song.name)}.docx`;
      globalThis.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      globalThis.URL.revokeObjectURL(downloadUrl);
    } catch {
      setError('Export fehlgeschlagen.');
    }
  };

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
      autoScrollRemainderRef.current = 0;
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

      const rawPixelsToScroll =
        autoScrollRemainderRef.current
        + (AUTO_SCROLL_PX_PER_SECOND * autoScrollSpeed * deltaMs) / 1000;
      const pixelsToScroll = Math.floor(rawPixelsToScroll);
      autoScrollRemainderRef.current = rawPixelsToScroll - pixelsToScroll;

      if (pixelsToScroll > 0) {
        globalThis.scrollTo(0, Math.min(maxScrollTop, currentScrollTop + pixelsToScroll));
      }
      autoScrollFrameRef.current = requestAnimationFrame(step);
    };

    autoScrollFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      autoScrollLastTsRef.current = null;
      autoScrollRemainderRef.current = 0;
    };
  }, [autoScrollActive, autoScrollSpeed]);

  useEffect(() => {
    setFullscreenSupported(canUseFullscreen());
    const updateFullscreenState = () => {
      const isActive = getFullscreenElement() !== null;
      setFullscreenActive(isActive);
      document.body.classList.toggle('song-fullscreen-active', isActive);
    };

    updateFullscreenState();
    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
    document.addEventListener('MSFullscreenChange', updateFullscreenState);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
      document.removeEventListener('MSFullscreenChange', updateFullscreenState);
      document.body.classList.remove('song-fullscreen-active');
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!fullscreenSupported) return;
    try {
      if (getFullscreenElement()) {
        await exitFullscreen();
      } else {
        await requestFullscreen();
      }
    } catch {
      setError('Vollbildmodus konnte nicht geaendert werden.');
    }
  };

  const changeAutoScrollSpeed = (delta: number) => {
    setAutoScrollSpeed((current) => {
      const next = Math.round((current + delta) * 10) / 10;
      return Math.min(MAX_AUTO_SCROLL_SPEED, Math.max(MIN_AUTO_SCROLL_SPEED, next));
    });
  };

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
  const languageDisplay = toLanguageDisplayValue(song.language);
  const modeDisplay = toDisplayString(song.mode);
  const genresDisplay = (song.genres ?? []).join(', ');
  const allLines = song.lines ?? [];
  const refrainUnderlineFlags = getRefrainUnderlineFlags(allLines);
  const visibleLines = getVisibleSongLineEntries(allLines);
  return (
    <div className="page song-detail-page">
      {isOffline && <div className="offline-banner">Offline-Modus aktiv: Song ist nur lesbar.</div>}

      <div className="header-row">
        <h2 className="no-margin">{song.name}</h2>
        <div className="header-actions">
          {canAdminEdit && (
            <button
              type="button"
              onClick={downloadSongAsDocx}
              className="primary-button btn-export"
              title="Song als DOCX herunterladen"
            >
              Export
            </button>
          )}
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
            <span className="song-meta-item-value">{toMetaValue(songNumberDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Song-Titel:</strong>
            <span className="song-meta-item-value">{toMetaValue(song.name)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Interpret (Original):</strong>
            <span className="song-meta-item-value">{toMetaValue(song.artist)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Interpret (Version):</strong>
            <span className="song-meta-item-value">{toMetaValue(song.interpretVersion)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Album:</strong>
            <span className="song-meta-item-value">{toMetaValue(song.album)}</span>
          </p>
        </div>
        <div className="song-meta-column">
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Jahr:</strong>
            <span className="song-meta-item-value">{toMetaValue(song.songYear)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Komponist:</strong>
            <span className="song-meta-item-value">{toMetaValue(song.composer)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Produzent(en):</strong>
            <span className="song-meta-item-value">{toMetaValue(song.producer)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Sprache:</strong>
            <span className="song-meta-item-value">{toMetaValue(languageDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Genre:</strong>
            <span className="song-meta-item-value">{toMetaValue(genresDisplay)}</span>
          </p>
        </div>
        <div className="song-meta-column">
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Key:</strong>
            <span className="song-meta-item-value">{toMetaValue(keyDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Modus:</strong>
            <span className="song-meta-item-value">{toMetaValue(modeDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Capo:</strong>
            <span className="song-meta-item-value">{toMetaValue(capoWithPlay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Taktart:</strong>
            <span className="song-meta-item-value">{toMetaValue(taktartDisplay)}</span>
          </p>
          <p className="song-meta-item">
            <strong className="song-meta-item-label">Kadenz:</strong>
            <span className="song-meta-item-value">{toMetaValue(song.cadence)}</span>
          </p>
        </div>
      </div>

      <div className="lyrics-editor-readonly">
        <div className="textarea-chords lyrics-chord-surface lyrics-chord-surface-readonly">
          <div className="lyrics-readonly-title">{song.name}</div>
          {visibleLines.map(({
            line,
            originalIndex,
            stropheNumber,
            startsAfterStropheEnd,
            displayText,
            underlineDisplayText,
            isDisplayedSongPart,
            isBackgroundContent,
            isInstrumentalSongPart,
          }, index) => (
            <SongLineViewRow
              key={line.id ?? index}
              line={line}
              underlineText={refrainUnderlineFlags[originalIndex] ?? false}
              stropheNumber={stropheNumber}
              startsAfterStropheEnd={startsAfterStropheEnd}
              displayText={displayText}
              underlineDisplayText={underlineDisplayText}
              isDisplayedSongPart={isDisplayedSongPart}
              isBackgroundContent={isBackgroundContent}
              isInstrumentalSongPart={isInstrumentalSongPart}
            />
          ))}
        </div>
      </div>
      <div className="song-lyrics-footer" aria-label="Lyrics Steuerung">
        <button
          type="button"
          className="song-footer-btn song-footer-icon-btn"
          onClick={() => navigate(-1)}
          aria-label="Zurueck"
          title="Zurueck"
        >
          <svg viewBox="0 0 24 24" className="song-action-icon" aria-hidden="true">
            <path
              fill="currentColor"
              d="M20 11H7.83l5.59-5.59L12 4 4 12l8 8 1.42-1.41L7.83 13H20v-2z"
            />
          </svg>
        </button>
        <button
          type="button"
          className={
            fullscreenActive
              ? 'song-footer-btn song-footer-fullscreen-btn is-active'
              : 'song-footer-btn song-footer-fullscreen-btn'
          }
          onClick={toggleFullscreen}
          disabled={!fullscreenSupported}
          title={
            fullscreenSupported
              ? fullscreenActive ? 'Vollbild verlassen' : 'Vollbild'
              : 'Vollbild wird von diesem Browser nicht unterstuetzt'
          }
          aria-label={fullscreenActive ? 'Vollbild verlassen' : 'Vollbild aktivieren'}
        >
          {fullscreenActive ? 'Normal' : 'Vollbild'}
        </button>
        <div className="song-footer-tempo-controls">
          <span className="song-footer-control-label">Tempo</span>
          <div className="song-footer-control-row">
            <button
              type="button"
              className="song-footer-step-btn"
              onClick={() => changeAutoScrollSpeed(-AUTO_SCROLL_SPEED_STEP)}
              disabled={autoScrollSpeed <= MIN_AUTO_SCROLL_SPEED}
              aria-label="AutoScroll langsamer"
            >
              -
            </button>
            <span className="song-footer-control-value">{autoScrollSpeed.toFixed(1).replace('.', ',')}x</span>
            <button
              type="button"
              className="song-footer-step-btn"
              onClick={() => changeAutoScrollSpeed(AUTO_SCROLL_SPEED_STEP)}
              disabled={autoScrollSpeed >= MAX_AUTO_SCROLL_SPEED}
              aria-label="AutoScroll schneller"
            >
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          className={
            autoScrollActive
              ? 'song-footer-btn song-footer-scroll-btn is-active'
              : 'song-footer-btn song-footer-scroll-btn'
          }
          onClick={() => setAutoScrollActive((current) => !current)}
        >
          {autoScrollActive ? 'Stop' : 'Scroll'}
        </button>
      </div>
    </div>
  );
}
