import { useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LyricsChordEditor } from '../components/LyricsChordEditor';
import type { SongLine } from '../types/song';
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

const toNullableNumber = (value: string): number | null => {
  const parsed = value.trim() ? Number.parseInt(value, 10) : null;
  return Number.isNaN(parsed) ? null : parsed;
};

export const AddSongPage = () => {
  const isOnline = useOnlineStatus();
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
  const [lines, setLines] = useState<SongLine[]>([
    { orderIndex: 0, text: '', chordAnnotations: [] },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!artist || !name || !album) {
      alert('Bitte alle Pflichtfelder ausfuellen');
      return;
    }

    try {
      setIsLoading(true);

      await SongService.createSong({
        artist,
        interpretVersion: interpretVersion.trim() || null,
        lyricist: lyricist.trim() || null,
        composer: composer.trim() || null,
        producer: producer.trim() || null,
        name,
        album,
        bpm: toNullableNumber(bpm),
        songYear: toNullableNumber(songYear),
        timeSignature: timeSignature.trim() || null,
        keyRoot: keyRoot.trim() || null,
        keySuffix: keySuffix.trim() || null,
        play: play.trim() || null,
        capo: toNullableNumber(capo),
        language: language.trim() || null,
        cadence: cadence.trim() || null,
        lines,
      });

      navigate('/');
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        alert(serverMessage || 'Fehler beim Speichern');
      } else {
        alert('Fehler beim Speichern');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="page page-form">
        <h2>Neuen Song hinzufuegen</h2>
        <p className="offline-banner">
          Offline-Modus aktiv: Neue Songs koennen nur online erstellt werden.
        </p>
      </div>
    );
  }

  return (
    <div className="page page-form">
      <h2>Neuen Song hinzufuegen</h2>

      <form onSubmit={handleSubmit} className="stack-form">
        <div className="form-field">
          <label htmlFor="artist-file">
            Interpret (Original): <span className="required-asterisk">*</span>
          </label>
          <input
            value={artist}
            id="artist-file"
            onChange={(e) => setArtist(e.target.value)}
            className="text-input"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="interpret-version-file">Interpret (Version):</label>
          <input
            value={interpretVersion}
            id="interpret-version-file"
            onChange={(e) => setInterpretVersion(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="lyricist-file">Text:</label>
          <input
            value={lyricist}
            id="lyricist-file"
            onChange={(e) => setLyricist(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="composer-file">Komponist:</label>
          <input
            value={composer}
            id="composer-file"
            onChange={(e) => setComposer(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="producer-file">Produzent:</label>
          <input
            value={producer}
            id="producer-file"
            onChange={(e) => setProducer(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="title-file">
            Titel: <span className="required-asterisk">*</span>
          </label>
          <input
            id="title-file"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-input"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="album-file">
            Album: <span className="required-asterisk">*</span>
          </label>
          <input
            id="album-file"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="text-input"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="bpm-file">BPM:</label>
          <input
            id="bpm-file"
            type="number"
            min={1}
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            placeholder="z. B. 120"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="song-year-file">Jahr:</label>
          <input
            id="song-year-file"
            type="number"
            min={0}
            value={songYear}
            onChange={(e) => setSongYear(e.target.value)}
            placeholder="z. B. 1998"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="time-signature-file">Taktart:</label>
          <input
            id="time-signature-file"
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.target.value)}
            placeholder="z. B. 3/4 oder 4/4"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="key-root-file">Key:</label>
          <select
            id="key-root-file"
            value={keyRoot}
            onChange={(e) => setKeyRoot(e.target.value)}
            className="text-input"
          >
            <option value="">Keine Angabe</option>
            {KEY_ROOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="key-suffix-file">Key Zusatz:</label>
          <input
            id="key-suffix-file"
            value={keySuffix}
            onChange={(e) => setKeySuffix(e.target.value)}
            placeholder="z. B. -, ####, bbb"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="play-file">Play:</label>
          <select
            id="play-file"
            value={play}
            onChange={(e) => setPlay(e.target.value)}
            className="text-input"
          >
            <option value="">Keine Angabe</option>
            {KEY_ROOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="capo-file">Capo:</label>
          <input
            id="capo-file"
            type="number"
            min={0}
            value={capo}
            onChange={(e) => setCapo(e.target.value)}
            placeholder="z. B. 2"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="language-file">Sprache:</label>
          <select
            id="language-file"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-input"
          >
            <option value="">Keine Angabe</option>
            <option value="deutsch">Deutsch</option>
            <option value="englisch">Englisch</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="cadence-file">Kadenz:</label>
          <input
            id="cadence-file"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            placeholder="z. B. I-IV-V-I"
            className="text-input"
          />
        </div>

        <div className="form-field">
          <label>Lyrics & Akkorde</label>
          <LyricsChordEditor lines={lines} onChange={setLines} disabled={isLoading} />
        </div>

        <button type="submit" disabled={isLoading} className="primary-button btn-confirm">
          {isLoading ? 'Wird gespeichert...' : 'Song speichern'}
        </button>
      </form>
    </div>
  );
};
