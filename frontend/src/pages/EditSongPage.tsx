import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import type { Song, SongCreate } from '../types/song';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import '../styles/global.css';

type SongFormValues = {
  artist: string;
  name: string;
  album: string;
  bpm: string;
  capo: string;
};

type SongMetaFieldsProps = {
  ids: {
    artist: string;
    title: string;
    album: string;
    bpm: string;
    capo: string;
  };
  values: SongFormValues;
  setArtist: (value: string) => void;
  setName: (value: string) => void;
  setAlbum: (value: string) => void;
  setBpm: (value: string) => void;
  setCapo: (value: string) => void;
};

type FileEditFormProps = {
  values: SongFormValues;
  file: File | null;
  isSubmitting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  setArtist: (value: string) => void;
  setName: (value: string) => void;
  setAlbum: (value: string) => void;
  setBpm: (value: string) => void;
  setCapo: (value: string) => void;
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
    name: overrides.name,
    album: overrides.album,
    bpm: toNullableNumber(overrides.bpm),
    capo: toNullableNumber(overrides.capo),
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
  setName,
  setAlbum,
  setBpm,
  setCapo,
}: SongMetaFieldsProps) => {
  return (
    <>
      <div>
        <label htmlFor={ids.artist}>Kuenstler:</label>
        <input
          value={values.artist}
          id={ids.artist}
          onChange={(e) => setArtist(e.target.value)}
          className="text-input"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.title}>Titel:</label>
        <input
          id={ids.title}
          value={values.name}
          onChange={(e) => setName(e.target.value)}
          className="text-input"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.album}>Album:</label>
        <input
          id={ids.album}
          value={values.album}
          onChange={(e) => setAlbum(e.target.value)}
          className="text-input"
          required
        />
      </div>
      <div>
        <label htmlFor={ids.bpm}>BPM (optional):</label>
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
        <label htmlFor={ids.capo}>Capo (optional):</label>
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
  setName,
  setAlbum,
  setBpm,
  setCapo,
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
          title: 'title-file-edit',
          album: 'album-file-edit',
          bpm: 'bpm-file-edit',
          capo: 'capo-file-edit',
        }}
        values={values}
        setArtist={setArtist}
        setName={setName}
        setAlbum={setAlbum}
        setBpm={setBpm}
        setCapo={setCapo}
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
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [bpm, setBpm] = useState('');
  const [capo, setCapo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingSong, setExistingSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidSongId = useMemo(() => !Number.isNaN(songId), [songId]);
  const values: SongFormValues = { artist, name, album, bpm, capo };

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
        setName(song.name ?? '');
        setAlbum(song.album ?? '');
        setBpm(
          song.bpm === null || song.bpm === undefined ? '' : String(song.bpm)
        );
        setCapo(
          song.capo === null || song.capo === undefined ? '' : String(song.capo)
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
        name,
        album,
        bpm,
        capo,
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
        setName={setName}
        setAlbum={setAlbum}
        setBpm={setBpm}
        setCapo={setCapo}
      />
    </div>
  );
};
