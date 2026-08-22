import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import SongListService from '../services/songList.service';
import type { Song, SongCreate, SongLine } from '../types/song';
import type { SongList } from '../types/songList';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LyricsChordEditor } from '../components/LyricsChordEditor';
import { GENRE_GROUPS, GENRE_OPTIONS } from '../constants/genres';
import { MODE_OPTIONS } from '../constants/modes';
import {
  getAssignedSongListIds,
  getManualSongLists,
  syncSongListAssignments,
  toggleSongListSelection,
} from '../utils/songListAssignments';
import {
  addGenre,
  isGenreSelected,
  normalizeGenreList,
  removeGenre,
  toggleGenreSelection,
} from '../utils/genreSelection';
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
  mode: string;
  cadence: string;
  genres: string[];
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

const toOptionalPositiveNumber = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) || parsed < 1 || parsed > 9999 ? undefined : parsed;
};

const parseCapoInput = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed === '-') return -1;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeModeOption = (value: string | null | undefined): string => {
  const trimmed = (value ?? '').trim();
  const match = MODE_OPTIONS.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  return match ?? '';
};

const songToPayload = (
  lines: SongLine[],
  values: SongFormValues,
  capoValue: number | null,
  runningNumberValue: number | null
): SongCreate => ({
  runningNumber: runningNumberValue,
  artist: values.artist,
  interpretVersion: values.interpretVersion.trim() || null,
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
  capo: capoValue,
  language: values.language.trim() || null,
  mode: values.mode.trim() || null,
  cadence: values.cadence.trim() || null,
  genres: values.genres,
  lines,
});

export const EditSongPage = () => {
  const isOnline = useOnlineStatus();
  const { id } = useParams();
  const songId = Number.parseInt(id ?? '', 10);
  const navigate = useNavigate();

  const [artist, setArtist] = useState('');
  const [interpretVersion, setInterpretVersion] = useState('');
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
  const [mode, setMode] = useState('');
  const [cadence, setCadence] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState('');
  const [runningNumber, setRunningNumber] = useState('');
  const [existingSongs, setExistingSongs] = useState<Song[]>([]);
  const [songLists, setSongLists] = useState<SongList[]>([]);
  const [selectedSongListIds, setSelectedSongListIds] = useState<number[]>([]);
  const [lines, setLines] = useState<SongLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidSongId = useMemo(() => !Number.isNaN(songId), [songId]);
  const parsedRunningNumber = useMemo(
    () => toOptionalPositiveNumber(runningNumber),
    [runningNumber]
  );
  const runningNumberConflict = useMemo(() => {
    if (parsedRunningNumber == null) return null;
    return (
      existingSongs.find(
        (song) => song.id !== songId && song.runningNumber === parsedRunningNumber
      ) ?? null
    );
  }, [existingSongs, parsedRunningNumber, songId]);
  const manualSongLists = useMemo(() => getManualSongLists(songLists), [songLists]);
  const values: SongFormValues = {
    artist,
    interpretVersion,
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
    mode,
    cadence,
    genres,
  };

  useEffect(() => {
    if (!isValidSongId) {
      setError('Ungueltige Song-ID');
      setIsLoading(false);
      return;
    }

    Promise.all([
      SongService.getSongById(songId),
      SongService.getSongContent(),
      SongListService.getAllSongLists(),
    ])
      .then((response) => {
        const song = response[0].data as Song;
        setExistingSongs(response[1].data as Song[]);
        const loadedSongLists = response[2].data as SongList[];
        setSongLists(loadedSongLists);
        setSelectedSongListIds(getAssignedSongListIds(loadedSongLists, songId));
        setArtist(song.artist ?? '');
        setInterpretVersion(song.interpretVersion ?? '');
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
        setCapo(song.capo == null ? '' : song.capo === -1 ? '-' : String(song.capo));
        setLanguage(song.language ?? '');
        setMode(normalizeModeOption(song.mode));
        setCadence(song.cadence ?? '');
        setGenres(normalizeGenreList(song.genres));
        setRunningNumber(song.runningNumber == null ? '' : String(song.runningNumber));
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
      const parsedCapo = parseCapoInput(capo);
      if (parsedCapo === undefined) {
        setError("Capo muss eine Zahl oder '-' sein.");
        return;
      }
      if (parsedRunningNumber === undefined) {
        setError('Songnummer muss eine Zahl zwischen 1 und 9999 sein.');
        return;
      }
      if (runningNumberConflict) {
        setError(`Songnummer ${parsedRunningNumber} ist bereits vergeben.`);
        return;
      }
      await SongService.updateSong(
        songId,
        songToPayload(lines, values, parsedCapo, parsedRunningNumber)
      );
      await syncSongListAssignments(manualSongLists, selectedSongListIds, songId);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Song-Update fehlgeschlagen'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setGenres((current) => toggleGenreSelection(current, genre));
  };

  const addCustomGenre = () => {
    setGenres((current) => addGenre(current, customGenre));
    setCustomGenre('');
  };

  const handleCustomGenreKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCustomGenre();
  };

  const toggleSongList = (songListId: number) => {
    setSelectedSongListIds((current) => toggleSongListSelection(current, songListId));
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

  const runningNumberLabel =
    parsedRunningNumber === null || parsedRunningNumber === undefined
      ? null
      : `#${String(parsedRunningNumber).padStart(4, '0')}`;

  return (
    <div className="page page-form">
      <h2>{runningNumberLabel ? `Song ${runningNumberLabel} bearbeiten` : 'Song bearbeiten'}</h2>
      {error && <p className="status-error">Fehler: {error}</p>}
      <form onSubmit={handleSubmit} className="stack-form">
        <div className="form-field">
          <label htmlFor="running-number-edit">Songnummer:</label>
          <input
            id="running-number-edit"
            type="number"
            min={1}
            max={9999}
            value={runningNumber}
            onChange={(e) => setRunningNumber(e.target.value)}
            placeholder="Leer lassen fuer automatisch"
            className={`text-input ${parsedRunningNumber === undefined || runningNumberConflict ? 'input-error' : ''}`}
          />
          {parsedRunningNumber === undefined && (
            <p className="field-hint field-hint-error">Bitte eine Zahl zwischen 1 und 9999 eintragen.</p>
          )}
          {runningNumberConflict && (
            <p className="field-hint field-hint-error">
              Diese Nummer ist bereits vergeben: {runningNumberConflict.name}
            </p>
          )}
          {!runningNumber.trim() && (
            <p className="field-hint">Ohne Angabe wird automatisch die naechste freie Nummer vergeben.</p>
          )}
        </div>
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
          <label>Komponist:</label>
          <input value={composer} onChange={(e) => setComposer(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Produzent(en):</label>
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
            <option value="-">-</option>
            {KEY_ROOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Capo:</label>
          <input value={capo} onChange={(e) => setCapo(e.target.value)} className="text-input" />
        </div>
        <div>
          <label>Sprache:</label>
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="z. B. Deutsch, Englisch, Spanisch"
            className="text-input"
          />
        </div>
        <div>
          <label>Modus:</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="text-input">
            <option value="">Keine Angabe</option>
            {MODE_OPTIONS.map((modeOption) => (
              <option key={modeOption} value={modeOption}>
                {modeOption}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Kadenz:</label>
          <input value={cadence} onChange={(e) => setCadence(e.target.value)} className="text-input" />
        </div>
        <div className="form-field">
          <label>
            Genre (neu): {genres.length} ausgewählt ({GENRE_OPTIONS.length} Genres insgesamt)
          </label>
          <div className="genre-custom-row">
            <input
              type="text"
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyDown={handleCustomGenreKeyDown}
              list="genre-suggestions-edit"
              placeholder="Eigenes Genre hinzufuegen"
              className="text-input"
            />
            <datalist id="genre-suggestions-edit">
              {GENRE_OPTIONS.map((genre) => (
                <option key={genre} value={genre} />
              ))}
            </datalist>
            <button type="button" onClick={addCustomGenre} className="primary-button btn-neutral">
              Hinzufuegen
            </button>
          </div>
          {genres.length > 0 && (
            <div className="genre-selected-list" aria-label="Ausgewaehlte Genres">
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className="genre-selected-item"
                  onClick={() => setGenres((current) => removeGenre(current, genre))}
                  title={`${genre} entfernen`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
          <div className="genre-checkbox-grid">
            {GENRE_GROUPS.map((group) => (
              <section key={group.label} className="genre-checkbox-group">
                <h4>{group.label}</h4>
                <div className="genre-checkbox-group-options">
                  {group.options.map((genre) => (
                    <label key={genre} className="genre-checkbox-item">
                      <input
                        type="checkbox"
                        checked={isGenreSelected(genres, genre)}
                        onChange={() => toggleGenre(genre)}
                      />
                      <span>{genre}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label>Songlisten:</label>
          {manualSongLists.length > 0 ? (
            <div className="song-list-checkbox-grid">
              {manualSongLists.map((songList) => (
                <label key={songList.id} className="song-list-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedSongListIds.includes(songList.id)}
                    onChange={() => toggleSongList(songList.id)}
                    disabled={isSubmitting}
                  />
                  <span>{songList.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="field-hint">Keine manuellen Songlisten vorhanden.</p>
          )}
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
