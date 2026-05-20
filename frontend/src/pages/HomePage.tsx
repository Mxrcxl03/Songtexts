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
  const [artistOriginalFilter, setArtistOriginalFilter] = useState('');
  const [interpretVersionFilter, setInterpretVersionFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const navigate = useNavigate();

  const artistOriginalOptions = Array.from(
    new Set(songs.map((song) => song.artist).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const interpretVersionOptions = Array.from(
    new Set(
      songs
        .map((song) => String(song.interpretVersion ?? '').trim())
        .filter((value) => value !== '')
    )
  ).sort((a, b) => a.localeCompare(b));

  const albumOptions = Array.from(
    new Set(songs.map((song) => song.album).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const languageOptions = Array.from(
    new Set(
      songs
        .map((song) => String(song.language ?? '').trim())
        .filter((value) => value !== '')
    )
  ).sort((a, b) => a.localeCompare(b));

  const yearOptions = Array.from(
    new Set(
      songs
        .map((song) => song.songYear)
        .filter((year): year is number => year !== null && year !== undefined)
    )
  ).sort((a, b) => a - b);

  const hasActiveTagFilters =
    artistOriginalFilter.trim() !== '' ||
    interpretVersionFilter.trim() !== '' ||
    albumFilter.trim() !== '' ||
    languageFilter.trim() !== '' ||
    yearFilter.trim() !== '';

  const hasText = (value: string | null | undefined) =>
    value !== null && value !== undefined && value.trim() !== '';

  const handleClick = (id: number) => {
    globalThis.open(`/song/${encodeURIComponent(String(id))}`, '_blank', 'noopener,noreferrer');
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
    if (currentUser?.role !== 'ADMIN') {
      setError('Nur Admins können alle Songtexte herunterladen.');
      return;
    }

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
    const q = query.trim().toLowerCase();
    const numberQuery = q.startsWith('#') ? q.slice(1) : q;
    const f = songs.filter((s) => {
      const runningNumber = String(s.runningNumber ?? '');
      const matchesQuery =
        runningNumber.includes(q) ||
        runningNumber.includes(numberQuery) ||
        `#${runningNumber}`.includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        String(s.interpretVersion ?? '')
          .toLowerCase()
          .includes(q) ||
        s.album.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      const matchesArtistOriginal =
        artistOriginalFilter.trim() === '' ||
        s.artist.toLowerCase() === artistOriginalFilter.toLowerCase();
      const matchesInterpretVersion =
        interpretVersionFilter.trim() === '' ||
        String(s.interpretVersion ?? '').toLowerCase() ===
          interpretVersionFilter.toLowerCase();

      const matchesAlbum =
        albumFilter.trim() === '' ||
        s.album.toLowerCase() === albumFilter.toLowerCase();
      const matchesLanguage =
        languageFilter.trim() === '' ||
        String(s.language ?? '').toLowerCase() ===
          languageFilter.trim().toLowerCase();
      const matchesYear =
        yearFilter.trim() === '' || String(s.songYear ?? '') === yearFilter;

      return (
        matchesArtistOriginal &&
        matchesInterpretVersion &&
        matchesAlbum &&
        matchesLanguage &&
        matchesYear
      );
    });
    setFiltered(f);
  }, [
    query,
    songs,
    artistOriginalFilter,
    interpretVersionFilter,
    albumFilter,
    languageFilter,
    yearFilter,
  ]);

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
          {canAdminEdit && (
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
          placeholder="Nach Nr, Titel, Interpret Original, Interpret Version oder Album suchen..."
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
              <label className="filter-label" htmlFor="artist-original-filter">
                Interpret Original
              </label>
              <select
                id="artist-original-filter"
                className="filter-control"
                value={artistOriginalFilter}
                onChange={(e) => setArtistOriginalFilter(e.target.value)}
              >
                <option value="">Alle</option>
                {artistOriginalOptions.map((artist) => (
                  <option key={artist} value={artist}>
                    {artist}
                  </option>
                ))}
              </select>

              <label
                className="filter-label"
                htmlFor="interpret-version-filter"
              >
                Interpret Version
              </label>
              <select
                id="interpret-version-filter"
                className="filter-control"
                value={interpretVersionFilter}
                onChange={(e) => setInterpretVersionFilter(e.target.value)}
              >
                <option value="">Alle</option>
                {interpretVersionOptions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>

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

              <label className="filter-label" htmlFor="language-filter">
                Sprache
              </label>
              <select
                id="language-filter"
                className="filter-control"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                <option value="">Alle</option>
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>

              <label className="filter-label" htmlFor="year-filter">
                Jahr
              </label>
              <select
                id="year-filter"
                className="filter-control"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">Alle</option>
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="filter-reset-btn"
                onClick={() => {
                  setArtistOriginalFilter('');
                  setInterpretVersionFilter('');
                  setAlbumFilter('');
                  setLanguageFilter('');
                  setYearFilter('');
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
                  <span className="song-tags-row">
                    {song.runningNumber !== null &&
                    song.runningNumber !== undefined ? (
                      <span className="song-tag song-tag-running-number">
                        Nr.: {song.runningNumber}
                      </span>
                    ) : null}
                    {hasText(song.artist) ? (
                      <span className="song-tag song-tag-interpret">
                        Interpret: {song.artist}
                      </span>
                    ) : null}
                    {hasText(song.interpretVersion) ? (
                      <span className="song-tag song-tag-interpret-version">
                        Interpret (Vers.): {song.interpretVersion}
                      </span>
                    ) : null}
                    {hasText(song.album) ? (
                      <span className="song-tag song-tag-album">
                        Album: {song.album}
                      </span>
                    ) : null}
                    {song.songYear !== null && song.songYear !== undefined ? (
                      <span className="song-tag song-tag-year">
                        Jahr: {song.songYear}
                      </span>
                    ) : null}
                    {hasText(song.language) ? (
                      <span className="song-tag song-tag-language">
                        Sprache: {song.language}
                      </span>
                    ) : null}
                  </span>
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
