import { useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
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
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isHtmByName = selectedFile.name.toLowerCase().endsWith('.htm');
    if (isHtmByName) {
      setFile(selectedFile);
    } else {
      alert('Bitte lade eine .htm Datei hoch');
      setFile(null);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !artist || !name || !album) {
      alert('Bitte alle Felder ausfüllen');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('artist', artist);
      if (interpretVersion.trim()) {
        formData.append('interpretVersion', interpretVersion.trim());
      }
      if (lyricist.trim()) {
        formData.append('lyricist', lyricist.trim());
      }
      if (composer.trim()) {
        formData.append('composer', composer.trim());
      }
      if (producer.trim()) {
        formData.append('producer', producer.trim());
      }
      formData.append('name', name);
      formData.append('album', album);
      if (bpm.trim()) {
        formData.append('bpm', bpm.trim());
      }
      if (songYear.trim()) {
        formData.append('songYear', songYear.trim());
      }
      if (timeSignature.trim()) {
        formData.append('timeSignature', timeSignature.trim());
      }
      if (keyRoot.trim()) {
        formData.append('keyRoot', keyRoot.trim());
      }
      if (keySuffix.trim()) {
        formData.append('keySuffix', keySuffix.trim());
      }
      if (play.trim()) {
        formData.append('play', play.trim());
      }
      if (capo.trim()) {
        formData.append('capo', capo.trim());
      }
      if (language.trim()) {
        formData.append('language', language.trim().toLowerCase());
      }
      if (cadence.trim()) {
        formData.append('cadence', cadence.trim());
      }

      await SongService.uploadSongFile(formData);
      navigate('/');
    } catch (err) {
      console.error('Fehler beim Upload:', err);
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        alert(serverMessage || 'Fehler beim Hochladen der Datei');
      } else {
        alert('Fehler beim Hochladen der Datei');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="page page-form">
        <h2>Neuen Song hinzufügen</h2>
        <p className="offline-banner">
          Offline-Modus aktiv: Neue Songs können nur online erstellt werden.
        </p>
      </div>
    );
  }

  return (
    <div className="page page-form">
      <h2>Neuen Song hinzufügen</h2>

      <form onSubmit={handleFileSubmit} className="stack-form">
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
          <label htmlFor="file-input">
            .htm-Datei hochladen: <span className="required-asterisk">*</span>
          </label>
          <input
            id="file-input"
            type="file"
            accept=".htm,text/html"
            onChange={handleFileChange}
            required
            className="text-input"
          />
          {file && <p className="file-hint">Datei ausgewählt: {file.name}</p>}
        </div>

        <button
          type="submit"
          disabled={!file || isLoading}
          className="primary-button btn-confirm"
        >
          {isLoading ? 'Wird hochgeladen...' : 'Datei + Tags speichern'}
        </button>
      </form>
    </div>
  );
};
