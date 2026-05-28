import '../styles/global.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import type { Song } from '../types/song';
import type { SongList } from '../types/songList';
import type { User } from '../types/user';
import SongService from '../services/song.service';
import SongListService from '../services/songList.service';
import UserService from '../services/user.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type EditorMode = 'view' | 'create' | 'edit';

const formatRunningNumber = (runningNumber?: number | null): string =>
  runningNumber === null || runningNumber === undefined
    ? '#-'
    : `#${String(runningNumber).padStart(4, '0')}`;

export function SongListsPage() {
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const navigate = useNavigate();
  const [songLists, setSongLists] = useState<SongList[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('view');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formSongIds, setFormSongIds] = useState<number[]>([]);
  const [songToAdd, setSongToAdd] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const songsById = useMemo(
    () => new Map(allSongs.map((song) => [song.id, song])),
    [allSongs]
  );

  const selectedList = useMemo(
    () => songLists.find((list) => list.id === selectedListId) ?? null,
    [songLists, selectedListId]
  );
  const isAdmin = currentUser?.role === 'ADMIN';
  const canManageLists = isAdmin && isOnline;

  const availableSongsForAdd = useMemo(
    () => allSongs.filter((song) => !formSongIds.includes(song.id)),
    [allSongs, formSongIds]
  );

  const loadData = async () => {
    const [listsResponse, songsResponse] = await Promise.all([
      SongListService.getAllSongLists(),
      SongService.getSongContent(),
    ]);

    const listsData = Array.isArray(listsResponse.data) ? listsResponse.data : [];
    const songsData = Array.isArray(songsResponse.data) ? songsResponse.data : [];
    setSongLists(listsData);
    setAllSongs(songsData);

    if (listsData.length === 0) {
      setSelectedListId(null);
      return;
    }
    const hasCurrentSelection = selectedListId != null && listsData.some((list) => list.id === selectedListId);
    if (!hasCurrentSelection) {
      setSelectedListId(listsData[0].id);
    }
  };

  useEffect(() => {
    UserService.getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));

    setLoading(true);
    setError(null);
    loadData()
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          const serverMessage =
            typeof err.response?.data === 'string'
              ? err.response.data
              : err.response?.data?.message;
          setError(serverMessage || 'Song-Listen konnten nicht geladen werden.');
        } else {
          setError('Song-Listen konnten nicht geladen werden.');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreate = () => {
    if (!isAdmin) {
      setError('Nur Admins koennen Song-Listen erstellen.');
      return;
    }
    setMode('create');
    setFormName('');
    setFormSongIds([]);
    setSongToAdd('');
    setError(null);
  };

  const startEdit = (list: SongList) => {
    if (!isAdmin) {
      setError('Nur Admins koennen Song-Listen bearbeiten.');
      return;
    }
    if (list.generated) {
      setError('Automatische Song-Listen koennen nicht bearbeitet werden.');
      return;
    }
    setSelectedListId(list.id);
    setMode('edit');
    setFormName(list.name);
    setFormSongIds(
      [...list.songs]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => item.songId)
    );
    setSongToAdd('');
    setError(null);
  };

  const cancelEditor = () => {
    setMode('view');
    setFormName('');
    setFormSongIds([]);
    setSongToAdd('');
  };

  const submitEditor = async () => {
    if (!isAdmin) {
      setError('Nur Admins koennen Song-Listen speichern.');
      return;
    }
    if (!formName.trim()) {
      setError('Bitte gib einen Namen fuer die Song-Liste ein.');
      return;
    }
    if (isOffline) {
      setError('Offline-Modus: Song-Listen koennen nur online bearbeitet werden.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: formName.trim(),
        songIds: formSongIds,
      };

      if (mode === 'create') {
        const created = await SongListService.createSongList(payload);
        await loadData();
        setSelectedListId(created.data.id);
      } else if (mode === 'edit' && selectedListId) {
        const selected = songLists.find((list) => list.id === selectedListId);
        if (selected?.generated) {
          setError('Automatische Song-Listen koennen nicht bearbeitet werden.');
          return;
        }
        await SongListService.updateSongList(selectedListId, payload);
        await loadData();
      }

      setMode('view');
      setFormSongIds([]);
      setFormName('');
      setSongToAdd('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        setError(serverMessage || 'Speichern fehlgeschlagen.');
      } else {
        setError('Speichern fehlgeschlagen.');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async (list: SongList) => {
    if (!isAdmin) {
      setError('Nur Admins koennen Song-Listen loeschen.');
      return;
    }
    if (list.generated) {
      setError('Automatische Song-Listen koennen nicht geloescht werden.');
      return;
    }
    if (isOffline) {
      setError('Offline-Modus: Song-Listen koennen nur online geloescht werden.');
      return;
    }
    const confirmed = globalThis.confirm(
      `Willst du die Song-Liste "${list.name}" wirklich loeschen?`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      await SongListService.deleteSongList(list.id);
      await loadData();
      if (selectedListId === list.id) {
        const remaining = songLists.filter((item) => item.id !== list.id);
        setSelectedListId(remaining[0]?.id ?? null);
      }
      if (mode === 'edit' && selectedListId === list.id) {
        cancelEditor();
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message;
        setError(serverMessage || 'Loeschen fehlgeschlagen.');
      } else {
        setError('Loeschen fehlgeschlagen.');
      }
    } finally {
      setSaving(false);
    }
  };

  const addSongToForm = () => {
    const id = Number(songToAdd);
    if (!Number.isFinite(id) || id <= 0) return;
    if (formSongIds.includes(id)) return;
    setFormSongIds((current) => [...current, id]);
    setSongToAdd('');
  };

  const removeSongFromForm = (songId: number) => {
    setFormSongIds((current) => current.filter((id) => id !== songId));
  };

  const moveSongInForm = (songId: number, direction: 'up' | 'down') => {
    setFormSongIds((current) => {
      const index = current.findIndex((id) => id === songId);
      if (index < 0) return current;
      if (direction === 'up' && index === 0) return current;
      if (direction === 'down' && index === current.length - 1) return current;

      const next = [...current];
      const target = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (loading) return <div className="page">Song-Listen werden geladen...</div>;

  return (
    <div className="page">
      {isOffline && (
        <div className="offline-banner">
          Offline-Modus aktiv: Song-Listen sind nur lesbar.
        </div>
      )}
      <div className="header-row">
        <h2 className="no-margin">Song-Listen</h2>
        <div className="header-actions">
          {canManageLists && (
            <button
              type="button"
              className="primary-button btn-edit"
              onClick={startCreate}
              disabled={saving || isOffline}
            >
              + Neue Liste
            </button>
          )}
        </div>
      </div>

      {error && <p className="status-error">Fehler: {error}</p>}

      <div className="song-lists-layout">
        <div className="song-lists-sidebar">
          {songLists.length === 0 ? (
            <p>Noch keine Song-Listen vorhanden.</p>
          ) : (
            <ul className="song-lists-list">
              {songLists.map((list) => (
                <li key={list.id} className="song-lists-item">
                  <button
                    type="button"
                    className={
                      selectedListId === list.id
                        ? 'song-lists-item-main is-active'
                        : 'song-lists-item-main'
                    }
                    onClick={() => {
                      setSelectedListId(list.id);
                      setMode('view');
                    }}
                  >
                    <strong>{list.generated ? `${list.name} (Auto)` : list.name}</strong>
                    <span>{list.songCount} Song(s)</span>
                  </button>
                  {canManageLists && !list.generated && (
                    <div className="song-lists-item-actions">
                      <button
                        type="button"
                        className="song-small-btn btn-overwrite icon-only-btn"
                        onClick={() => startEdit(list)}
                        disabled={saving || isOffline}
                        title="Song-Liste bearbeiten"
                        aria-label="Song-Liste bearbeiten"
                      >
                        <svg viewBox="0 0 24 24" className="song-action-icon" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="song-small-btn btn-delete icon-only-btn"
                        onClick={() => deleteList(list)}
                        disabled={saving || isOffline}
                        title="Song-Liste loeschen"
                        aria-label="Song-Liste loeschen"
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
          )}
        </div>

        <div className="song-lists-content">
          {mode === 'view' || !canManageLists ? (
            selectedList ? (
              <div>
                <h3>{selectedList.name}</h3>
                {selectedList.generated && (
                  <p>Automatisch erzeugte Liste. Wird bei Song-Aenderungen automatisch aktualisiert.</p>
                )}
                {selectedList.songs.length === 0 ? (
                  <p>Diese Liste ist leer.</p>
                ) : (
                  <ol className="song-lists-song-rows">
                    {[...selectedList.songs]
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((item) => (
                        <li key={`${selectedList.id}-${item.orderIndex}-${item.songId}`}>
                          <button
                            type="button"
                            className="song-lists-song-link"
                            onClick={() =>
                              navigate(`/song/${encodeURIComponent(String(item.songId))}`)
                            }
                          >
                            {formatRunningNumber(item.runningNumber)} {item.songName} - {item.artist}
                          </button>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            ) : (
              <p>Waehle eine Song-Liste aus oder lege eine neue an.</p>
            )
          ) : (
            <div className="song-list-editor">
              <h3>{mode === 'create' ? 'Neue Song-Liste' : 'Song-Liste bearbeiten'}</h3>
              <div className="form-field">
                <label htmlFor="song-list-name">Name</label>
                <input
                  id="song-list-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="text-input"
                  maxLength={120}
                />
              </div>

              <div className="form-field">
                <label htmlFor="song-list-add-song">Songs hinzufuegen</label>
                <div className="song-list-add-row">
                  <select
                    id="song-list-add-song"
                    className="text-input"
                    value={songToAdd}
                    onChange={(event) => setSongToAdd(event.target.value)}
                  >
                    <option value="">Song waehlen</option>
                    {availableSongsForAdd.map((song) => (
                      <option key={song.id} value={song.id}>
                        {formatRunningNumber(song.runningNumber)} {song.name} - {song.artist}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary-button btn-confirm"
                    onClick={addSongToForm}
                    disabled={!songToAdd}
                  >
                    Hinzufuegen
                  </button>
                </div>
              </div>

              <ol className="song-list-editor-rows">
                {formSongIds.map((songId, index) => {
                  const song = songsById.get(songId);
                  if (!song) return null;
                  return (
                    <li key={`editor-song-${songId}`}>
                      <span>
                        {formatRunningNumber(song.runningNumber)} {song.name} - {song.artist}
                      </span>
                      <div className="song-list-editor-actions">
                        <button
                          type="button"
                          className="song-small-btn btn-export"
                          onClick={() => moveSongInForm(songId, 'up')}
                          disabled={index === 0}
                        >
                          Hoch
                        </button>
                        <button
                          type="button"
                          className="song-small-btn btn-export"
                          onClick={() => moveSongInForm(songId, 'down')}
                          disabled={index === formSongIds.length - 1}
                        >
                          Runter
                        </button>
                        <button
                          type="button"
                          className="song-small-btn btn-delete"
                          onClick={() => removeSongFromForm(songId)}
                        >
                          Entfernen
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="button-row">
                <button
                  type="button"
                  className="primary-button btn-confirm"
                  onClick={submitEditor}
                  disabled={saving || isOffline}
                >
                  {saving ? 'Speichert...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  className="primary-button btn-neutral"
                  onClick={cancelEditor}
                  disabled={saving}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
