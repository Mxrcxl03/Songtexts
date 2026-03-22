import '../styles/global.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import type { Song } from '../types/song';
import type { User } from '../types/user';
import UserService from '../services/user.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const HomePage = () => {
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [songs, setSongs] = useState<Song[]>([]);
  const [filtered, setFiltered] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySongId, setBusySongId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [albumFilter, setAlbumFilter] = useState('');
  const [bpmFilter, setBpmFilter] = useState('');
  const [capoFilter, setCapoFilter] = useState('');
  const navigate = useNavigate();

  const albumOptions = Array.from(
    new Set(songs.map((song) => song.album).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const hasActiveTagFilters =
    albumFilter.trim() !== '' ||
    bpmFilter.trim() !== '' ||
    capoFilter.trim() !== '';

  const warmSongHtmlCache = (list: Song[]) => {
    if (!isOnline) return;

    for (const song of list) {
      const viewUrl = `/api/v1/public/song/${encodeURIComponent(String(song.id))}/view/html`;
      fetch(viewUrl, {
        method: 'GET',
        credentials: 'include',
      }).catch(() => {
        // Cache warm-up should not block UI when a single fetch fails.
      });
    }
  };

  const handleClick = (id: number) => {
    const viewUrl = `/api/v1/public/song/${encodeURIComponent(String(id))}/view/html`;
    globalThis.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  const loadSongs = () => {
    return SongService.getSongContent()
      .then((response) => {
        const data = response.data;
        let list: Song[] = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.items)) {
          list = data.items;
        }

        setSongs(list);
        setFiltered(list);
        warmSongHtmlCache(list);
        setError(null);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ?? err?.message ?? 'Unbekannter Fehler';
        setError(msg);
        setSongs([]);
        setFiltered([]);
      });
  };

  const handleDeleteSong = async (song: Song) => {
    const confirmed = globalThis.confirm(
      `Willst du "${song.name}" wirklich loeschen?`
    );
    if (!confirmed) return;

    try {
      setBusySongId(song.id);
      await SongService.deleteSong(song.id);
      await loadSongs();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        setError(serverMessage || 'Loeschen fehlgeschlagen');
      } else {
        setError('Loeschen fehlgeschlagen');
      }
    } finally {
      setBusySongId(null);
    }
  };

  const handleDownloadAllSongs = async () => {
    if (isOffline) {
      setError('Offline-Modus: Download aller Songtexte ist nicht moeglich.');
      return;
    }

    try {
      setDownloadingAll(true);
      setError(null);

      const response = await SongService.exportAllToHtmlZip();
      const url = globalThis.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'songtexte-html.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        setError(serverMessage || 'Download fehlgeschlagen');
      } else {
        setError('Download fehlgeschlagen');
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  useEffect(() => {
    UserService.getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
    loadSongs().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOnline) {
      loadSongs().catch(() => undefined);
    }
  }, [isOnline]);

  useEffect(() => {
    const q = query.toLowerCase();
    const f = songs.filter((s) => {
      const matchesQuery =
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        String(s.bpm ?? '').includes(q) ||
        String(s.capo ?? '').includes(q);

      if (!matchesQuery) return false;

      const matchesAlbum =
        albumFilter.trim() === '' ||
        s.album.toLowerCase() === albumFilter.toLowerCase();
      const matchesBpm =
        bpmFilter.trim() === '' || String(s.bpm ?? '') === bpmFilter.trim();
      const matchesCapo =
        capoFilter.trim() === '' || String(s.capo ?? '') === capoFilter.trim();

      return matchesAlbum && matchesBpm && matchesCapo;
    });
    setFiltered(f);
  }, [query, songs, albumFilter, bpmFilter, capoFilter]);

  if (loading) return <div>Lade Songs…</div>;
  if (error) return <div>Fehler: {error}</div>;
  const isAdmin = currentUser?.role === 'ADMIN';
  const canAdminEdit = isAdmin && isOnline;

  return (
    <div className="page">
      {isOffline && (
        <div className="offline-banner">
          Offline-Modus aktiv: Es werden nur gecachte Songs angezeigt
          (Read-Only).
        </div>
      )}

      <div className="header-row">
        <h2>Alle Songs</h2>
        <div className="header-actions">
          {isOnline && (
            <button
              onClick={handleDownloadAllSongs}
              className="primary-button btn-export"
              disabled={downloadingAll}
              title="Alle gespeicherten Songtexte als ZIP herunterladen"
            >
              {downloadingAll ? 'Download laeuft…' : 'Alle Texte downloaden'}
            </button>
          )}

          {canAdminEdit && (
            <button
              onClick={() => navigate('/songAdd')}
              className="primary-button btn-edit"
            >
              + Song hinzufügen
            </button>
          )}
        </div>
      </div>

      <div className="search-filter-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nach Song, Künstler oder Album suchen..."
          className="search-input"
        />

        <div className="filter-popup-wrapper">
          <button
            type="button"
            className={`filter-toggle-btn${hasActiveTagFilters ? ' has-active-filters' : ''}`}
            onClick={() => setShowFilterPopup((prev) => !prev)}
          >
            Filter
          </button>

          {showFilterPopup && (
            <div className="filter-popup" aria-label="Tag Filter Popup">
              <label className="filter-label" htmlFor="album-filter">
                Album
              </label>
              <select
                id="album-filter"
                className="filter-control"
                value={albumFilter}
                onChange={(e) => setAlbumFilter(e.target.value)}
              >
                <option value="">Alle</option>
                {albumOptions.map((album) => (
                  <option key={album} value={album}>
                    {album}
                  </option>
                ))}
              </select>

              <label className="filter-label" htmlFor="bpm-filter">
                BPM
              </label>
              <input
                id="bpm-filter"
                type="number"
                inputMode="numeric"
                className="filter-control"
                value={bpmFilter}
                onChange={(e) => setBpmFilter(e.target.value)}
                placeholder="z.B. 120"
              />

              <label className="filter-label" htmlFor="capo-filter">
                Capo
              </label>
              <input
                id="capo-filter"
                type="number"
                inputMode="numeric"
                className="filter-control"
                value={capoFilter}
                onChange={(e) => setCapoFilter(e.target.value)}
                placeholder="z.B. 2"
              />

              <button
                type="button"
                className="filter-reset-btn"
                onClick={() => {
                  setAlbumFilter('');
                  setBpmFilter('');
                  setCapoFilter('');
                }}
                disabled={!hasActiveTagFilters}
              >
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p>Keine Songs gefunden.</p>
      ) : (
        <ul className="song-list">
          {filtered.map((song) => (
            <li key={song.id} className="song-item">
              <button
                onClick={() => handleClick(song.id)}
                className="song-item-btn"
              >
                <span className="song-item-content">
                  <span className="song-main-text">
                    {song.name} - {song.artist}
                  </span>
                  <span className="song-tag song-tag-album">
                    Album: {song.album}
                  </span>
                  {song.bpm === null || song.bpm === undefined ? null : (
                    <span className="song-tag song-tag-bpm">
                      BPM: {song.bpm}
                    </span>
                  )}
                  {song.capo === null || song.capo === undefined ? null : (
                    <span className="song-tag song-tag-capo">
                      Capo: {song.capo}
                    </span>
                  )}
                </span>
              </button>

              {canAdminEdit && (
                <div className="song-item-actions">
                  <button
                    onClick={() => navigate(`/song/${song.id}/edit`)}
                    className="song-small-btn btn-overwrite"
                    disabled={busySongId === song.id}
                    title="Song bearbeiten"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSong(song)}
                    className="song-small-btn btn-delete"
                    disabled={busySongId === song.id}
                    title="Song loeschen"
                  >
                    Loeschen
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
