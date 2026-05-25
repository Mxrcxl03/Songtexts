import '../styles/global.css';
import { useParams } from 'react-router';
import { useEffect, useState } from 'react';
import api from '../services/api';
import axios from 'axios';
import type { Song, SongLine } from '../types/song';
import type { User } from '../types/user';
import UserService from '../services/user.service';
import SongService from '../services/song.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LyricsChordEditor } from '../components/LyricsChordEditor';
import { buildChordLine } from '../utils/buildChordLine';

const KEY_ROOT_OPTIONS = [
  'C',
  'Cm',
  'C#',
  'C#m',
  'Db',
  'Dbm',
  'D',
  'Dm',
  'D#',
  'D#m',
  'Eb',
  'Ebm',
  'E',
  'Em',
  'F',
  'Fm',
  'F#',
  'F#m',
  'Gb',
  'Gbm',
  'G',
  'Gm',
  'G#',
  'G#m',
  'Ab',
  'Abm',
  'A',
  'Am',
  'A#',
  'A#m',
  'Bb',
  'Bbm',
  'B',
  'Bm',
];

function SongLineViewRow({ line }: Readonly<{ line: SongLine }>) {
  const text = line?.text ?? '';
  const chordLine = buildChordLine(text, line?.chordAnnotations ?? []);

  return (
    <div className="line-wrapper-word">
      {chordLine.trim().length > 0 && <pre className="line-chords-word">{chordLine}</pre>}
      <pre className="line-text-word">{text || '\u00A0'}</pre>
    </div>
  );
}

export function SongDetailPage() {
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
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

  const handleNumberMetaChange = (field: 'bpm' | 'capo' | 'songYear', value: string) => {
    if (!song) return;
    const parsed = value.trim() === '' ? null : Number.parseInt(value, 10);
    setSong({ ...song, [field]: Number.isNaN(parsed) ? null : parsed });
  };

  const handleTextMetaChange = (
    field:
      | 'cadence'
      | 'interpretVersion'
      | 'timeSignature'
      | 'lyricist'
      | 'composer'
      | 'producer'
      | 'keyRoot'
      | 'keySuffix'
      | 'play',
    value: string
  ) => {
    if (!song) return;
    setSong({ ...song, [field]: value });
  };

  const handleToggleEditOrSave = async () => {
    if (!song) return;
    if (isOffline) {
      setError('Offline-Modus: Bearbeiten ist nicht moeglich.');
      return;
    }
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.put(`/public/song/${encodeURIComponent(String(song.id))}`, song);
      setIsEditing(false);
    } catch (err) {
      setError(axios.isAxiosError(err) ? 'Speichern fehlgeschlagen' : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  const handleExportHtml = async () => {
    if (!song) return;
    try {
      const response = await SongService.exportToHtml(song.id);
      const url = globalThis.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${song.name}.htm`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch {
      setError('Fehler beim Download der HTML-Datei');
    }
  };

  const handleViewHtml = () => {
    if (!song) return;
    const viewUrl = `/song/${encodeURIComponent(String(song.id))}`;
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <p>Laedt...</p>;
  if (error) return <p style={{ color: 'crimson' }}>Fehler: {error}</p>;
  if (!song) return <p>Kein Song gefunden.</p>;

  const isAdmin = currentUser?.role === 'ADMIN';
  const canAdminEdit = isAdmin && isOnline;
  const buttonLabel = saving ? 'Speichert...' : isEditing ? 'Speichern' : 'Edit';

  return (
    <div className="page">
      {isOffline && <div className="offline-banner">Offline-Modus aktiv: Song ist nur lesbar.</div>}

      <div className="header-row">
        <h2 className="no-margin">
          #{song.runningNumber ?? 0} {song.name}
        </h2>
        <div className="header-actions">
          <button onClick={handleViewHtml} className="primary-button btn-export" title="Als HTML-Seite anzeigen">
            HTML
          </button>
          <button onClick={handleExportHtml} className="primary-button btn-export" title="Song als HTML downloaden">
            Download HTML
          </button>
          {canAdminEdit && (
            <button
              onClick={handleToggleEditOrSave}
              disabled={saving}
              className={'primary-button ' + (isEditing ? 'btn-save' : 'btn-edit')}
            >
              {buttonLabel}
            </button>
          )}
        </div>
      </div>

      <p className="song-meta-field">
        <strong>Interpret (Original):</strong>
        <span className="song-meta-value">{song.artist}</span>
      </p>
      <p className="song-meta-field">
        <strong>Interpret (Version):</strong>
        {isEditing ? (
          <input
            type="text"
            value={song.interpretVersion ?? ''}
            onChange={(e) => handleTextMetaChange('interpretVersion', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.interpretVersion ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Text:</strong>
        {isEditing ? (
          <input
            type="text"
            value={song.lyricist ?? ''}
            onChange={(e) => handleTextMetaChange('lyricist', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.lyricist ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Komponist:</strong>
        {isEditing ? (
          <input
            type="text"
            value={song.composer ?? ''}
            onChange={(e) => handleTextMetaChange('composer', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.composer ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Produzent:</strong>
        {isEditing ? (
          <input
            type="text"
            value={song.producer ?? ''}
            onChange={(e) => handleTextMetaChange('producer', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.producer ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Key:</strong>
        {isEditing ? (
          <span className="song-meta-value" style={{ display: 'inline-flex', gap: '0.5rem' }}>
            <select
              value={song.keyRoot ?? ''}
              onChange={(e) => handleTextMetaChange('keyRoot', e.target.value)}
              className="text-input meta-number-input"
            >
              <option value="">Keine Angabe</option>
              {KEY_ROOT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={song.keySuffix ?? ''}
              onChange={(e) => handleTextMetaChange('keySuffix', e.target.value)}
              className="text-input meta-number-input"
            />
          </span>
        ) : (
          <span className="song-meta-value">
            {song.keyRoot ?? '-'}
            {song.keyRoot && song.keySuffix ? ` (${song.keySuffix})` : ''}
          </span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Play:</strong>
        {isEditing ? (
          <select
            value={song.play ?? ''}
            onChange={(e) => handleTextMetaChange('play', e.target.value)}
            className="text-input meta-number-input"
          >
            <option value="">Keine Angabe</option>
            {KEY_ROOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span className="song-meta-value">{song.play ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Album:</strong>
        <span className="song-meta-value">{song.album || '-'}</span>
      </p>
      <p className="song-meta-field">
        <strong>BPM:</strong>
        {isEditing ? (
          <input
            type="number"
            min={1}
            value={song.bpm ?? ''}
            onChange={(e) => handleNumberMetaChange('bpm', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.bpm ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Jahr des Songs:</strong>
        {isEditing ? (
          <input
            type="number"
            min={0}
            value={song.songYear ?? ''}
            onChange={(e) => handleNumberMetaChange('songYear', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.songYear ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Taktart:</strong>
        {isEditing ? (
          <input
            type="text"
            value={song.timeSignature ?? ''}
            onChange={(e) => handleTextMetaChange('timeSignature', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.timeSignature ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Capo:</strong>
        {isEditing ? (
          <input
            type="number"
            min={0}
            value={song.capo ?? ''}
            onChange={(e) => handleNumberMetaChange('capo', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.capo ?? '-'}</span>
        )}
      </p>
      <p className="song-meta-field">
        <strong>Kadenz:</strong>
        {isEditing ? (
          <input
            type="text"
            value={song.cadence ?? ''}
            onChange={(e) => handleTextMetaChange('cadence', e.target.value)}
            className="text-input meta-number-input"
          />
        ) : (
          <span className="song-meta-value">{song.cadence ?? '-'}</span>
        )}
      </p>

      <h3>Text:</h3>
      <div className="text-box">
        {isEditing ? (
          <LyricsChordEditor
            lines={song.lines ?? []}
            onChange={(lines) => setSong({ ...song, lines })}
            disabled={saving}
          />
        ) : (
          <div>
            {(song.lines ?? []).map((line, index) => (
              <SongLineViewRow key={line.id ?? index} line={line} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
