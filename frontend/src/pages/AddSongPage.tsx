import { useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import '../styles/global.css';

export const AddSongPage = () => {
  const isOnline = useOnlineStatus();
  const [artist, setArtist] = useState('');
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [bpm, setBpm] = useState('');
  const [capo, setCapo] = useState('');
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
      formData.append('name', name);
      formData.append('album', album);
      if (bpm.trim()) {
        formData.append('bpm', bpm.trim());
      }
      if (capo.trim()) {
        formData.append('capo', capo.trim());
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
          <label htmlFor="artist-file">Künstler:</label>
          <input
            value={artist}
            id="artist-file"
            onChange={(e) => setArtist(e.target.value)}
            className="text-input"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="title-file">Titel:</label>
          <input
            id="title-file"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-input"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="album-file">Album:</label>
          <input
            id="album-file"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="text-input"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="bpm-file">BPM (optional):</label>
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
          <label htmlFor="capo-file">Capo (optional):</label>
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
          <label htmlFor="file-input">.htm-Datei hochladen:</label>
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
