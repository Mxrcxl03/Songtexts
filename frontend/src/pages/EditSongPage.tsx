import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import type { Song, SongCreate, SongLine } from '../types/song';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LyricsChordEditor } from '../components/LyricsChordEditor';
import '../styles/global.css';

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

type SongFormValues = {
  artist: string;
  interpretVersion: string;
  lyricist: string;
  composer: string;
  producer: string;
  name: string;
  album: string;
  bpm: string;
  songYear: string;
  timeSignature: string;
  keyRoot: string;
  keySuffix: string;
  play: string;
  capo: string;
  language: string;
  cadence: string;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const serverMessage =
    typeof err.response?.data === 'string' ? err.response.data : err.response?.data?.message;
  return serverMessage || fallback;
};

const toNullableNumber = (value: string): number | null => {
  const parsed = value.trim() ? Number.parseInt(value, 10) : null;
  return Number.isNaN(parsed) ? null : parsed;
};

const songToPayload = (lines: SongLine[], values: SongFormValues): SongCreate => ({
  artist: values.artist,
  interpretVersion: values.interpretVersion.trim() || null,
  lyricist: values.lyricist.trim() || null,
  composer: values.composer.trim() || null,
  producer: values.producer.trim() || null,
  name: values.name,
  album: values.album,
  bpm: toNullableNumber(values.bpm),
  songYear: toNullableNumber(values.songYear),
  timeSignature: values.timeSignature.trim() || null,
  keyRoot: values.keyRoot.trim() || null,
  keySuffix: values.keySuffix.trim() || null,
  play: values.play.trim() || null,
  capo: toNullableNumber(values.capo),
  language: values.language.trim() || null,
  cadence: values.cadence.trim() || null,
  lines,
});

export const EditSongPage = () => {
  const isOnline = useOnlineStatus();
  const { id } = useParams();
  const songId = Number.parseInt(id ?? '', 10);
  const navigate = useNavigate();

  const [artist, setArtist] = useState('');
  const [interpretVersion, setInterpretVersion] = useState('');
  const [lyricist, setLyricist] = useState('');
  const [composer, setComposer] = useState('');
  const [producer, setProducer] = useState('');
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [bpm, setBpm] = useState('');
  const [songYear, setSongYear] = useState('');
  const [timeSignature, setTimeSignature] = useState('');
  const [keyRoot, setKeyRoot] = useState('');
  const [keySuffix, setKeySuffix] = useState('');
  const [play, setPlay] = useState('');
  const [capo, setCapo] = useState('');
  const [language, setLanguage] = useState('');
  const [cadence, setCadence] = useState('');
  const [lines, setLines] = useState<SongLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidSongId = useMemo(() => !Number.isNaN(songId), [songId]);
  const values: SongFormValues = {
    artist,
    interpretVersion,
    lyricist,
    composer,
    producer,
    name,
    album,
    bpm,
    songYear,
    timeSignature,
    keyRoot,
    keySuffix,
    play,
    capo,
    language,
    cadence,
  };

  useEffect(() => {
    if (!isValidSongId) {
      setError('Ungueltige Song-ID');
      setIsLoading(false);
      return;
    }

    SongService.getSongById(songId)
      .then((response) => {
        const song = response.data as Song;
        setArtist(song.artist ?? '');
        setInterpretVersion(song.interpretVersion ?? '');
        setLyricist(song.lyricist ?? '');
        setComposer(song.composer ?? '');
        setProducer(song.producer ?? '');
        setName(song.name ?? '');
        setAlbum(song.album ?? '');
        setBpm(song.bpm == null ? '' : String(song.bpm));
        setSongYear(song.songYear == null ? '' : String(song.songYear));
        setTimeSignature(song.timeSignature ?? '');
        setKeyRoot(song.keyRoot ?? '');
        setKeySuffix(song.keySuffix ?? '');
        setPlay(song.play ?? '');
        setCapo(song.capo == null ? '' : String(song.capo));
        setLanguage(song.language ?? '');
        setCadence(song.cadence ?? '');
        setLines(
          (song.lines ?? []).length > 0
            ? song.lines
            : [{ orderIndex: 0, text: '', chordAnnotations: [] }]
        );
        setError(null);
      })
      .catch((err) => setError(getErrorMessage(err, 'Song konnte nicht geladen werden')))
      .finally(() => setIsLoading(false));
  }, [songId, isValidSongId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSongId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await SongService.updateSong(songId, songToPayload(lines, values));
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Song-Update fehlgeschlagen'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="page page-form">
        <h2>Song bearbeiten</h2>
        <p className="offline-banner">
          Offline-Modus aktiv: Songs koennen nur online bearbeitet werden.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="page page-form">Lade Song...</div>;
  if (error && !isSubmitting && !artist && !name && !album) {
    return (
      <div className="page page-form">
        <h2>Song bearbeiten</h2>
        <p>Fehler: {error}</p>
      </div>
    );
  }

  return (
    <div className="page page-form">
      <h2>Song bearbeiten</h2>
      {error && <p className="status-error">Fehler: {error}</p>}
      <form onSubmit={handleSubmit} className="stack-form">
        <div>
          <label>
            Interpret (Original): <span className="required-asterisk">*</span>
          </label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} className="text-input" required />
        </div>
        <div>
          <label>Interpret (Version):</label>
          <input
            value={interpretVersion}
            onChange={(e) => setInterpretVersion(e.target.value)}
            className="text-input"
          />
        </div>
        <div>
          <label>Text:</label>
          <input value={lyricist} onChange={(e) => setLyricist(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Komponist:</label>
          <input value={composer} onChange={(e) => setComposer(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Produzent:</label>
          <input value={producer} onChange={(e) => setProducer(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>
            Titel: <span className="required-asterisk">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="text-input" required />
        </div>
        <div>
          <label>
            Album: <span className="required-asterisk">*</span>
          </label>
          <input value={album} onChange={(e) => setAlbum(e.target.value)} className="text-input" required />
        </div>
        <div>
          <label>BPM:</label>
          <input type="number" min={1} value={bpm} onChange={(e) => setBpm(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Jahr:</label>
          <input
            type="number"
            min={0}
            value={songYear}
            onChange={(e) => setSongYear(e.target.value)}
            className="text-input"
          />
        </div>
        <div>
          <label>Taktart:</label>
          <input value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Key:</label>
          <select value={keyRoot} onChange={(e) => setKeyRoot(e.target.value)} className="text-input">
            <option value="">Keine Angabe</option>
            {KEY_ROOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Key Zusatz:</label>
          <input value={keySuffix} onChange={(e) => setKeySuffix(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Play:</label>
          <select value={play} onChange={(e) => setPlay(e.target.value)} className="text-input">
            <option value="">Keine Angabe</option>
            {KEY_ROOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Capo:</label>
          <input type="number" min={0} value={capo} onChange={(e) => setCapo(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Sprache:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-input">
            <option value="">Keine Angabe</option>
            <option value="deutsch">Deutsch</option>
            <option value="englisch">Englisch</option>
          </select>
        </div>
        <div>
          <label>Kadenz:</label>
          <input value={cadence} onChange={(e) => setCadence(e.target.value)} className="text-input" />
        </div>
        <div className="form-field">
          <label>Lyrics & Akkorde</label>
          <LyricsChordEditor lines={lines} onChange={setLines} disabled={isSubmitting} />
        </div>
        <div className="button-row">
          <button type="submit" disabled={isSubmitting} className="primary-button btn-confirm">
            {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="primary-button btn-neutral">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
};
