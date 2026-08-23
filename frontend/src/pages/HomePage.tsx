import '../styles/global.css';
import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import SongService from '../services/song.service';
import type { Song } from '../types/song';
import type { User } from '../types/user';
import UserService from '../services/user.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { GENRE_GROUPS, GENRE_OPTIONS } from '../constants/genres';
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
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [artistOriginalFilter, setArtistOriginalFilter] = useState('');
  const [interpretVersionFilter, setInterpretVersionFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [uploaderFilters, setUploaderFilters] = useState<string[]>([]);
  const [modeFilter, setModeFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
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

  const uploaderOptions = Array.from(
    new Set(
      songs
        .map((song) => String(song.uploader ?? '').trim())
        .filter((value) => value !== '')
    )
  ).sort((a, b) => a.localeCompare(b));

  const modeOptions = Array.from(
    new Set(
      songs
        .map((song) => String(song.mode ?? '').trim())
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

  const songGenreSet = new Set(
    songs
      .flatMap((song) => song.genres ?? [])
      .map((genre) => String(genre).trim())
      .filter((value) => value !== '')
  );
  const groupedGenreOptions = GENRE_GROUPS.map((group) => ({
    ...group,
    options: group.options.filter((genre) => songGenreSet.has(genre)),
  })).filter((group) => group.options.length > 0);
  const ungroupedGenreOptions = Array.from(songGenreSet)
    .filter((genre) => !GENRE_OPTIONS.includes(genre))
    .sort((a, b) => a.localeCompare(b));

  const hasActiveTagFilters =
    artistOriginalFilter.trim() !== '' ||
    interpretVersionFilter.trim() !== '' ||
    albumFilter.trim() !== '' ||
    uploaderFilters.length > 0 ||
    modeFilter.trim() !== '' ||
    genreFilter.trim() !== '' ||
    yearFilter.trim() !== '';

  const applyFilterSelection = (
    setter: Dispatch<SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    setShowFilterPopup(false);
  };

  const resetFilters = () => {
    setArtistOriginalFilter('');
    setInterpretVersionFilter('');
    setAlbumFilter('');
    setUploaderFilters([]);
    setModeFilter('');
    setGenreFilter('');
    setYearFilter('');
  };

  const toggleUploaderFilter = (uploader: string) => {
    setUploaderFilters((current) =>
      current.some((item) => item.toLowerCase() === uploader.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== uploader.toLowerCase())
        : [...current, uploader]
    );
  };

  const toPaddedRunningNumber = (runningNumber: number | null | undefined) =>
    runningNumber === null || runningNumber === undefined
      ? ''
      : String(runningNumber).padStart(4, '0');

  const SEARCH_STOP_WORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'of',
    'to',
    'in',
    'on',
    'at',
    'for',
    'from',
    'with',
    'by',
    'der',
    'die',
    'das',
    'den',
    'dem',
    'des',
    'ein',
    'eine',
    'einer',
    'einem',
    'einen',
    'eines',
    'und',
    'im',
    'am',
    'zu',
    'zur',
    'zum',
    'von',
    'vom',
    'mit',
  ]);

  const normalizeSearchText = (value: string | null | undefined) =>
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, ' ')
      .split(/\s+/)
      .filter((word) => word !== '' && !SEARCH_STOP_WORDS.has(word))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  const handleClick = (id: number) => {
    navigate(`/song/${encodeURIComponent(String(id))}`);
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

  const downloadAllSongsExport = async () => {
    try {
      const response = await SongService.exportAllToWordZip();
      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = globalThis.URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'songs_export_all.zip';
      globalThis.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      globalThis.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        setError(serverMessage || 'Export fehlgeschlagen');
      } else {
        setError('Export fehlgeschlagen');
      }
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
    const textQuery = normalizeSearchText(query);
    const numberQuery = q.startsWith('#') ? q.slice(1) : q;
    const f = songs.filter((s) => {
      const runningNumber = String(s.runningNumber ?? '');
      const paddedRunningNumber = toPaddedRunningNumber(s.runningNumber);
      const searchableText = normalizeSearchText(
        [
          s.name,
          s.artist,
          s.interpretVersion ?? '',
          s.album,
          s.uploader ?? '',
        ].join(' ')
      );
      const matchesQuery =
        runningNumber.includes(q) ||
        paddedRunningNumber.includes(q) ||
        runningNumber.includes(numberQuery) ||
        paddedRunningNumber.includes(numberQuery) ||
        `#${runningNumber}`.includes(q) ||
        `#${paddedRunningNumber}`.includes(q) ||
        (q === '' || textQuery !== '') &&
        searchableText.includes(textQuery);

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
      const matchesUploader =
        uploaderFilters.length === 0 ||
        uploaderFilters
          .map((uploader) => uploader.trim().toLowerCase())
          .includes(String(s.uploader ?? '').trim().toLowerCase());
      const matchesMode =
        modeFilter.trim() === '' ||
        String(s.mode ?? '').trim().toLowerCase() ===
          modeFilter.trim().toLowerCase();
      const matchesGenre =
        genreFilter.trim() === '' ||
        (s.genres ?? [])
          .map((genre) => String(genre).toLowerCase())
          .includes(genreFilter.trim().toLowerCase());
      const matchesYear =
        yearFilter.trim() === '' || String(s.songYear ?? '') === yearFilter;

      return (
        matchesArtistOriginal &&
        matchesInterpretVersion &&
        matchesAlbum &&
        matchesUploader &&
        matchesMode &&
        matchesGenre &&
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
    uploaderFilters,
    modeFilter,
    genreFilter,
    yearFilter,
  ]);

  if (loading) return <div>Lade Songs…</div>;
  if (error) return <div>Fehler: {error}</div>;
  const isAdmin = currentUser?.role === 'ADMIN';
  const canAdminEdit = isAdmin && isOnline;
  const canUploadSongs = Boolean((isAdmin || currentUser?.uploadApproved) && isOnline);

  return (
    <div className="page home-page">
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
              type="button"
              onClick={downloadAllSongsExport}
              className="primary-button btn-export"
              title="Alle Songs als ZIP (DOCX) exportieren"
            >
              Export All
            </button>
          )}
          {canUploadSongs && (
            <button
              onClick={() => navigate('/songAdd')}
              className="primary-button btn-edit"
            >
              + Song hinzufügen
            </button>
          )}
        </div>
      </div>

      <div className="search-filter-area">
        <div className="search-filter-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nach Nr, Titel, Interpret Original, Interpret Version, Album oder Uploader suchen..."
            className="search-input"
          />

          <button
            type="button"
            className="filter-reset-icon-btn"
            onClick={resetFilters}
            disabled={!hasActiveTagFilters}
            aria-label="Alle Filter zurücksetzen"
            title="Alle Filter zurücksetzen"
          >
            <svg viewBox="0 0 24 24" className="filter-reset-icon" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29 1.41 1.41z"
              />
            </svg>
          </button>

          <div className="filter-popup-wrapper">
            <button
              type="button"
              className={`filter-toggle-btn${hasActiveTagFilters ? ' has-active-filters' : ''}`}
              onClick={() => setShowFilterPopup((prev) => !prev)}
              aria-label="Filter anzeigen"
              title="Filter"
            >
              <svg viewBox="0 0 24 24" className="filter-toggle-icon" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6L14 14.5V20a1 1 0 0 1-1.447.894l-3-1.5A1 1 0 0 1 9 18.5v-4L3.2 5.6A1 1 0 0 1 3 5z"
                />
              </svg>
            </button>

            {showFilterPopup && (
              <div className="filter-popup" aria-label="Tag Filter Popup">
                <button
                  type="button"
                  className="filter-popup-close-btn"
                  onClick={() => setShowFilterPopup(false)}
                  aria-label="Filter schließen"
                  title="Filter schließen"
                >
                  <svg viewBox="0 0 24 24" className="filter-popup-close-icon" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29 1.41 1.41z"
                    />
                  </svg>
                </button>
                <label className="filter-label" htmlFor="artist-original-filter">
                  Interpret Original
                </label>
                <select
                  id="artist-original-filter"
                  className="filter-control"
                  value={artistOriginalFilter}
                  onChange={(e) => applyFilterSelection(setArtistOriginalFilter, e.target.value)}
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
                  onChange={(e) => applyFilterSelection(setInterpretVersionFilter, e.target.value)}
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
                  onChange={(e) => applyFilterSelection(setAlbumFilter, e.target.value)}
                >
                  <option value="">Alle</option>
                  {albumOptions.map((album) => (
                    <option key={album} value={album}>
                      {album}
                    </option>
                  ))}
                </select>

                <span className="filter-label" id="uploader-filter-label">
                  Uploader
                </span>
                <details
                  id="uploader-filter"
                  className="filter-control filter-checkbox-dropdown"
                  aria-labelledby="uploader-filter-label"
                >
                  <summary>
                    {uploaderFilters.length === 0
                      ? 'Alle'
                      : `Uploaded by: ${uploaderFilters.join(', ')}`}
                  </summary>
                  <div className="filter-checkbox-options">
                    <label className="filter-checkbox-item">
                      <input
                        type="checkbox"
                        checked={uploaderFilters.length === 0}
                        onChange={() => setUploaderFilters([])}
                      />
                      <span>Alle</span>
                    </label>
                    {uploaderOptions.map((uploader) => (
                      <label key={uploader} className="filter-checkbox-item">
                        <input
                          type="checkbox"
                          checked={uploaderFilters.some(
                            (item) => item.toLowerCase() === uploader.toLowerCase()
                          )}
                          onChange={() => toggleUploaderFilter(uploader)}
                        />
                        <span>uploaded by: {uploader}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <label className="filter-label" htmlFor="mode-filter">
                  Modus
                </label>
                <select
                  id="mode-filter"
                  className="filter-control"
                  value={modeFilter}
                  onChange={(e) => applyFilterSelection(setModeFilter, e.target.value)}
                >
                  <option value="">Alle</option>
                  {modeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
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
                  onChange={(e) => applyFilterSelection(setYearFilter, e.target.value)}
                >
                  <option value="">Alle</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>

                <label className="filter-label" htmlFor="genre-filter">
                  Genre
                </label>
                <select
                  id="genre-filter"
                  className="filter-control"
                  value={genreFilter}
                  onChange={(e) => applyFilterSelection(setGenreFilter, e.target.value)}
                >
                  <option value="">Alle</option>
                  {groupedGenreOptions.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {ungroupedGenreOptions.length > 0 && (
                    <optgroup label="Weitere">
                      {ungroupedGenreOptions.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="filter-reset-btn filter-reset-mobile-btn"
          onClick={resetFilters}
          disabled={!hasActiveTagFilters}
        >
          Alle Filter zurücksetzen
        </button>
      </div>

      {filtered.length === 0 ? (
        <p>Keine Songs gefunden.</p>
      ) : (
        <div className="song-list-scroll">
          <ul className="song-list">
            {filtered.map((song) => (
              <li key={song.id} className="song-item">
                <button
                  onClick={() => handleClick(song.id)}
                  className="song-item-btn"
                >
                  <span className="song-item-content">
                    <span className="song-main-row">
                      <span className="song-main-text">
                        {song.name} - {song.artist}
                      </span>
                      <span className="song-main-number">
                        {song.runningNumber !== null && song.runningNumber !== undefined
                          ? `#${toPaddedRunningNumber(song.runningNumber)}`
                          : '#-'}
                      </span>
                    </span>
                  </span>
                </button>

                {canAdminEdit && (
                  <div className="song-item-actions">
                    <button
                      onClick={() => navigate(`/song/${song.id}/edit`)}
                      className="song-small-btn btn-overwrite icon-only-btn"
                      disabled={busySongId === song.id}
                      title="Song bearbeiten"
                      aria-label="Song bearbeiten"
                    >
                      <svg viewBox="0 0 24 24" className="song-action-icon" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSong(song)}
                      className="song-small-btn btn-delete icon-only-btn"
                      disabled={busySongId === song.id}
                      title="Song loeschen"
                      aria-label="Song loeschen"
                    >
                      <svg viewBox="0 0 24 24" className="song-action-icon" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2h4v2H4V6h4l1-2z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
