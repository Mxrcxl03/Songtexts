import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import SongListService from '../services/songList.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LyricsChordEditor } from '../components/LyricsChordEditor';
import { GENRE_GROUPS, GENRE_OPTIONS } from '../constants/genres';
import { MODE_OPTIONS } from '../constants/modes';
import type { Song, SongCreate, SongLine } from '../types/song';
import type { SongList } from '../types/songList';
import {
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

const DOCX_IMPORT_EXPORT_RULES_TOOLTIP =
  'Import/Export-Regeln:\n'
  + '- Meta-Tags: Tagname: Wert (z. B. Titel: Neue Importprobe)\n'
  + '- Akkorde im Text: <Am>, <F#m>, <G>\n'
  + '- Songparts als eigene Zeile: [Strophe 1], [Strophe End], [Refrain 1], [Bridge 1]';

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

export const AddSongPage = () => {
  const isOnline = useOnlineStatus();
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
  const [lines, setLines] = useState<SongLine[]>([
    { orderIndex: 0, text: '', chordAnnotations: [] },
  ]);
  const [lockSongPartLines, setLockSongPartLines] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([SongService.getSongContent(), SongListService.getAllSongLists()])
      .then(([songsResponse, songListsResponse]) => {
        setExistingSongs(songsResponse.data as Song[]);
        setSongLists(songListsResponse.data as SongList[]);
      })
      .catch((err) => console.error('Formulardaten konnten nicht geladen werden:', err));
  }, []);

  const manualSongLists = useMemo(() => getManualSongLists(songLists), [songLists]);

  const parsedRunningNumber = useMemo(
    () => toOptionalPositiveNumber(runningNumber),
    [runningNumber]
  );

  const runningNumberConflict = useMemo(() => {
    if (parsedRunningNumber == null) return null;
    return existingSongs.find((song) => song.runningNumber === parsedRunningNumber) ?? null;
  }, [existingSongs, parsedRunningNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!artist || !name || !album) {
      alert('Bitte alle Pflichtfelder ausfuellen');
      return;
    }

    try {
      setIsLoading(true);
      const parsedCapo = parseCapoInput(capo);
      if (parsedCapo === undefined) {
        alert("Capo muss eine Zahl oder '-' sein.");
        return;
      }
      if (parsedRunningNumber === undefined) {
        alert('Songnummer muss eine Zahl zwischen 1 und 9999 sein.');
        return;
      }
      if (runningNumberConflict) {
        alert(`Songnummer ${parsedRunningNumber} ist bereits vergeben.`);
        return;
      }

      const createdSongResponse = await SongService.createSong({
        runningNumber: parsedRunningNumber,
        artist,
        interpretVersion: interpretVersion.trim() || null,
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
        capo: parsedCapo,
        language: language.trim() || null,
        mode: mode.trim() || null,
        cadence: cadence.trim() || null,
        genres,
        lines,
      });
      const createdSong = createdSongResponse.data as Song;
      await syncSongListAssignments(manualSongLists, selectedSongListIds, createdSong.id);

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

  const applyImportedSongToForm = (imported: SongCreate) => {
    setArtist(imported.artist ?? '');
    setInterpretVersion(imported.interpretVersion ?? '');
    setComposer(imported.composer ?? '');
    setProducer(imported.producer ?? '');
    setName(imported.name ?? '');
    setAlbum(imported.album ?? '');
    setBpm(imported.bpm == null ? '' : String(imported.bpm));
    setSongYear(imported.songYear == null ? '' : String(imported.songYear));
    setTimeSignature(imported.timeSignature ?? '');
    setKeyRoot(imported.keyRoot ?? '');
    setKeySuffix(imported.keySuffix ?? '');
    setPlay(imported.play ?? '');
    setCapo(imported.capo == null ? '' : imported.capo === -1 ? '-' : String(imported.capo));
    setLanguage(imported.language ?? '');
    setMode(normalizeModeOption(imported.mode));
    setCadence(imported.cadence ?? '');
    setGenres(normalizeGenreList(imported.genres));
    setRunningNumber(imported.runningNumber == null ? '' : String(imported.runningNumber));
    setLines(
      imported.lines?.length
        ? imported.lines.map((line, index) => ({
            id: line.id,
            orderIndex: line.orderIndex ?? index,
            text: line.text ?? '',
            chordAnnotations: line.chordAnnotations ?? [],
          }))
        : [{ orderIndex: 0, text: '', chordAnnotations: [] }]
    );
    setLockSongPartLines(true);
  };

  const handleDocxImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Bitte eine .docx-Datei auswaehlen.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await SongService.previewSongFromWord(file);
      applyImportedSongToForm(response.data as SongCreate);
    } catch (err) {
      console.error('Fehler beim DOCX-Import:', err);
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        alert(serverMessage || 'Fehler beim DOCX-Import');
      } else {
        alert('Fehler beim DOCX-Import');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page-form">
      <h2>Neuen Song hinzufuegen</h2>
      <section className="song-input-method-card">
        <h3>Schnellimport</h3>
        <div className="form-field">
          <label>DOCX-Datei</label>
          <input
            ref={docxInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleDocxImport}
            hidden
          />
          <button
            type="button"
            onClick={() => docxInputRef.current?.click()}
            disabled={isLoading}
            className="primary-button docx-import-button"
            title={DOCX_IMPORT_EXPORT_RULES_TOOLTIP}
          >
            DOCX auswaehlen und Felder automatisch fuellen
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="stack-form song-input-method-card">
        <h3>Manuelle Eingabe</h3>
        <div className="form-field">
          <label htmlFor="running-number-file">Songnummer:</label>
          <input
            id="running-number-file"
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
          <label htmlFor="composer-file">Komponist:</label>
          <input
            value={composer}
            id="composer-file"
            onChange={(e) => setComposer(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="producer-file">Produzent(en):</label>
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
            <option value="-">-</option>
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
            value={capo}
            onChange={(e) => setCapo(e.target.value)}
            placeholder="z. B. 2 oder -"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="language-file">Sprache:</label>
          <input
            id="language-file"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="z. B. Deutsch, Englisch, Spanisch"
            className="text-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="mode-file">Modus:</label>
          <select
            id="mode-file"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="text-input"
          >
            <option value="">Keine Angabe</option>
            {MODE_OPTIONS.map((modeOption) => (
              <option key={modeOption} value={modeOption}>
                {modeOption}
              </option>
            ))}
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
          <label>
            Genre (neu): {genres.length} ausgewählt ({GENRE_OPTIONS.length} Genres insgesamt)
          </label>
          <div className="genre-custom-row">
            <input
              type="text"
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyDown={handleCustomGenreKeyDown}
              list="genre-suggestions-add"
              placeholder="Eigenes Genre hinzufuegen"
              className="text-input"
            />
            <datalist id="genre-suggestions-add">
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
          <LyricsChordEditor
            lines={lines}
            onChange={setLines}
            disabled={isLoading}
            lockSongPartLines={lockSongPartLines}
          />
        </div>

        <button type="submit" disabled={isLoading} className="primary-button btn-confirm">
          {isLoading ? 'Wird gespeichert...' : 'Song speichern'}
        </button>
      </form>
    </div>
  );
};
