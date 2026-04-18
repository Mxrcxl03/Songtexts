import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import type { Song, SongCreate } from '../types/song';
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

type SongMetaFieldsProps = {
  ids: {
    artist: string;
    interpretVersion: string;
    lyricist: string;
    composer: string;
    producer: string;
    title: string;
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
  values: SongFormValues;
  setArtist: (value: string) => void;
  setInterpretVersion: (value: string) => void;
  setLyricist: (value: string) => void;
  setComposer: (value: string) => void;
  setProducer: (value: string) => void;
  setName: (value: string) => void;
  setAlbum: (value: string) => void;
  setBpm: (value: string) => void;
  setSongYear: (value: string) => void;
  setTimeSignature: (value: string) => void;
  setKeyRoot: (value: string) => void;
  setKeySuffix: (value: string) => void;
  setPlay: (value: string) => void;
  setCapo: (value: string) => void;
  setLanguage: (value: string) => void;
  setCadence: (value: string) => void;
};

type FileEditFormProps = {
  values: SongFormValues;
  file: File | null;
  isSubmitting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  setArtist: (value: string) => void;
  setInterpretVersion: (value: string) => void;
  setLyricist: (value: string) => void;
  setComposer: (value: string) => void;
  setProducer: (value: string) => void;
  setName: (value: string) => void;
  setAlbum: (value: string) => void;
  setBpm: (value: string) => void;
  setSongYear: (value: string) => void;
  setTimeSignature: (value: string) => void;
  setKeyRoot: (value: string) => void;
  setKeySuffix: (value: string) => void;
  setPlay: (value: string) => void;
  setCapo: (value: string) => void;
  setLanguage: (value: string) => void;
  setCadence: (value: string) => void;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) {
    return fallback;
  }

  const serverMessage =
    typeof err.response?.data === 'string'
      ? err.response.data
      : err.response?.data?.message;
  return serverMessage || fallback;
};

const toNullableNumber = (value: string): number | null => {
  const parsed = value.trim() ? Number.parseInt(value, 10) : null;
  return Number.isNaN(parsed) ? null : parsed;
};

const songResponseToCreatePayload = (
  song: Song,
  overrides: SongFormValues
): SongCreate => {
  return {
    artist: overrides.artist,
    interpretVersion: overrides.interpretVersion.trim() || null,
    lyricist: overrides.lyricist.trim() || null,
    composer: overrides.composer.trim() || null,
    producer: overrides.producer.trim() || null,
    name: overrides.name,
    album: overrides.album,
    bpm: toNullableNumber(overrides.bpm),
    songYear: toNullableNumber(overrides.songYear),
    timeSignature: overrides.timeSignature.trim() || null,
    keyRoot: overrides.keyRoot.trim() || null,
    keySuffix: overrides.keySuffix.trim() || null,
    play: overrides.play.trim() || null,
    capo: toNullableNumber(overrides.capo),
    language: overrides.language.trim() || null,
    cadence: overrides.cadence.trim() || null,
    lines: (song.lines ?? []).map((line) => ({
      orderIndex: line.orderIndex,
      text: line.text,
      chordAnnotations: line.chordAnnotations,
    })),
  };
};

const SongMetaFields = ({
  ids,
  values,
  setArtist,
  setInterpretVersion,
  setLyricist,
  setComposer,
  setProducer,
  setName,
  setAlbum,
  setBpm,
  setSongYear,
  setTimeSignature,
  setKeyRoot,
  setKeySuffix,
  setPlay,
  setCapo,
  setLanguage,
  setCadence,
}: SongMetaFieldsProps) => {
  return (
    <>
      <div>
        <label htmlFor={ids.artist}>
          Interpret (Original): <span className="required-asterisk">*</span>
        </label>
        <input
          value={values.artist}
          id={ids.artist}
          onChange={(e) => setArtist(e.target.value)}
          className="text-input"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.interpretVersion}>Interpret (Version):</label>
        <input
          id={ids.interpretVersion}
          value={values.interpretVersion}
          onChange={(e) => setInterpretVersion(e.target.value)}
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.lyricist}>Text:</label>
        <input
          id={ids.lyricist}
          value={values.lyricist}
          onChange={(e) => setLyricist(e.target.value)}
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.composer}>Komponist:</label>
        <input
          id={ids.composer}
          value={values.composer}
          onChange={(e) => setComposer(e.target.value)}
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.producer}>Produzent:</label>
        <input
          id={ids.producer}
          value={values.producer}
          onChange={(e) => setProducer(e.target.value)}
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.title}>
          Titel: <span className="required-asterisk">*</span>
        </label>
        <input
          id={ids.title}
          value={values.name}
          onChange={(e) => setName(e.target.value)}
          className="text-input"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.album}>
          Album: <span className="required-asterisk">*</span>
        </label>
        <input
          id={ids.album}
          value={values.album}
          onChange={(e) => setAlbum(e.target.value)}
          className="text-input"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.bpm}>BPM:</label>
        <input
          id={ids.bpm}
          type="number"
          min={1}
          value={values.bpm}
          onChange={(e) => setBpm(e.target.value)}
          placeholder="z. B. 120"
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.songYear}>Jahr:</label>
        <input
          id={ids.songYear}
          type="number"
          min={0}
          value={values.songYear}
          onChange={(e) => setSongYear(e.target.value)}
          placeholder="z. B. 1998"
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.timeSignature}>Taktart:</label>
        <input
          id={ids.timeSignature}
          value={values.timeSignature}
          onChange={(e) => setTimeSignature(e.target.value)}
          placeholder="z. B. 3/4 oder 4/4"
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.keyRoot}>Key:</label>
        <select
          id={ids.keyRoot}
          value={values.keyRoot}
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
      <div>
        <label htmlFor={ids.keySuffix}>Key Zusatz:</label>
        <input
          id={ids.keySuffix}
          value={values.keySuffix}
          onChange={(e) => setKeySuffix(e.target.value)}
          placeholder="z. B. -, ####, bbb"
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.play}>Play:</label>
        <select
          id={ids.play}
          value={values.play}
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
      <div>
        <label htmlFor={ids.capo}>Capo:</label>
        <input
          id={ids.capo}
          type="number"
          min={0}
          value={values.capo}
          onChange={(e) => setCapo(e.target.value)}
          placeholder="z. B. 2"
          className="text-input"
        />
      </div>
      <div>
        <label htmlFor={ids.language}>Sprache:</label>
        <select
          id={ids.language}
          value={values.language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-input"
        >
          <option value="">Keine Angabe</option>
          <option value="deutsch">Deutsch</option>
          <option value="englisch">Englisch</option>
        </select>
      </div>
      <div>
        <label htmlFor={ids.cadence}>Kadenz:</label>
        <input
          id={ids.cadence}
          value={values.cadence}
          onChange={(e) => setCadence(e.target.value)}
          placeholder="z. B. I-IV-V-I"
          className="text-input"
        />
      </div>
    </>
  );
};

const FileEditForm = ({
  values,
  file,
  isSubmitting,
  onFileChange,
  onSubmit,
  onCancel,
  setArtist,
  setInterpretVersion,
  setLyricist,
  setComposer,
  setProducer,
  setName,
  setAlbum,
  setBpm,
  setSongYear,
  setTimeSignature,
  setKeyRoot,
  setKeySuffix,
  setPlay,
  setCapo,
  setLanguage,
  setCadence,
}: FileEditFormProps) => {
  let submitLabel = 'Tags speichern';
  if (file) {
    submitLabel = 'Datei + Tags speichern';
  }
  if (isSubmitting) {
    submitLabel = 'Wird gespeichert...';
  }

  return (
    <form onSubmit={onSubmit} className="stack-form">
      <SongMetaFields
        ids={{
          artist: 'artist-file-edit',
          interpretVersion: 'interpret-version-file-edit',
          lyricist: 'lyricist-file-edit',
          composer: 'composer-file-edit',
          producer: 'producer-file-edit',
          title: 'title-file-edit',
          album: 'album-file-edit',
          bpm: 'bpm-file-edit',
          songYear: 'song-year-file-edit',
          timeSignature: 'time-signature-file-edit',
          keyRoot: 'key-root-file-edit',
          keySuffix: 'key-suffix-file-edit',
          play: 'play-file-edit',
          capo: 'capo-file-edit',
          language: 'language-file-edit',
          cadence: 'cadence-file-edit',
        }}
        values={values}
        setArtist={setArtist}
        setInterpretVersion={setInterpretVersion}
        setLyricist={setLyricist}
        setComposer={setComposer}
        setProducer={setProducer}
        setName={setName}
        setAlbum={setAlbum}
        setBpm={setBpm}
        setSongYear={setSongYear}
        setTimeSignature={setTimeSignature}
        setKeyRoot={setKeyRoot}
        setKeySuffix={setKeySuffix}
        setPlay={setPlay}
        setCapo={setCapo}
        setLanguage={setLanguage}
        setCadence={setCadence}
      />

      <div className="form-field">
        <label htmlFor="file-input-edit">Neue .htm-Datei hochladen:</label>
        <input
          id="file-input-edit"
          type="file"
          accept=".htm,text/html"
          onChange={onFileChange}
          className="text-input"
        />
        {file && <p className="file-hint">Datei ausgewaehlt: {file.name}</p>}
      </div>

      <div className="button-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="primary-button btn-confirm"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="primary-button btn-neutral"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
};

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
  const [file, setFile] = useState<File | null>(null);
  const [existingSong, setExistingSong] = useState<Song | null>(null);
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
        setExistingSong(song);
        setArtist(song.artist ?? '');
        setInterpretVersion(
          song.interpretVersion === null || song.interpretVersion === undefined
            ? ''
            : song.interpretVersion
        );
        setLyricist(
          song.lyricist === null || song.lyricist === undefined
            ? ''
            : song.lyricist
        );
        setComposer(
          song.composer === null || song.composer === undefined
            ? ''
            : song.composer
        );
        setProducer(
          song.producer === null || song.producer === undefined
            ? ''
            : song.producer
        );
        setName(song.name ?? '');
        setAlbum(song.album ?? '');
        setBpm(
          song.bpm === null || song.bpm === undefined ? '' : String(song.bpm)
        );
        setSongYear(
          song.songYear === null || song.songYear === undefined
            ? ''
            : String(song.songYear)
        );
        setTimeSignature(
          song.timeSignature === null || song.timeSignature === undefined
            ? ''
            : song.timeSignature
        );
        setKeyRoot(
          song.keyRoot === null || song.keyRoot === undefined
            ? ''
            : song.keyRoot
        );
        setKeySuffix(
          song.keySuffix === null || song.keySuffix === undefined
            ? ''
            : song.keySuffix
        );
        setPlay(song.play === null || song.play === undefined ? '' : song.play);
        setCapo(
          song.capo === null || song.capo === undefined ? '' : String(song.capo)
        );
        setLanguage(
          song.language === null || song.language === undefined
            ? ''
            : song.language
        );
        setCadence(
          song.cadence === null || song.cadence === undefined
            ? ''
            : song.cadence
        );
        setError(null);
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Song konnte nicht geladen werden'));
      })
      .finally(() => setIsLoading(false));
  }, [songId, isValidSongId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.htm')) {
      setError('Bitte nur .htm Dateien auswaehlen');
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSongId || !existingSong) return;

    try {
      setIsSubmitting(true);
      setError(null);

      let linesSourceSong: Song = existingSong;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const overwriteResponse = await SongService.overwriteSongFile(
          songId,
          formData
        );
        linesSourceSong = overwriteResponse.data as Song;
      }

      const updatePayload = songResponseToCreatePayload(linesSourceSong, {
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
      });
      await SongService.updateSong(songId, updatePayload);

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

  if (isLoading) {
    return <div className="page page-form">Lade Song...</div>;
  }

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

      <FileEditForm
        values={values}
        file={file}
        isSubmitting={isSubmitting}
        onFileChange={handleFileChange}
        onSubmit={handleFileSubmit}
        onCancel={() => navigate('/')}
        setArtist={setArtist}
        setInterpretVersion={setInterpretVersion}
        setLyricist={setLyricist}
        setComposer={setComposer}
        setProducer={setProducer}
        setName={setName}
        setAlbum={setAlbum}
        setBpm={setBpm}
        setSongYear={setSongYear}
        setTimeSignature={setTimeSignature}
        setKeyRoot={setKeyRoot}
        setKeySuffix={setKeySuffix}
        setPlay={setPlay}
        setCapo={setCapo}
        setLanguage={setLanguage}
        setCadence={setCadence}
      />
    </div>
  );
};
