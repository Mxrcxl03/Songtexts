import '../styles/global.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import type { Song } from '../types/song';
import type { SongList, SongListItem } from '../types/songList';
import type { User } from '../types/user';
import SongService from '../services/song.service';
import SongListService from '../services/songList.service';
import UserService from '../services/user.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type EditorMode = 'view' | 'create' | 'edit';
type GeneratedListDefinition = {
  id: number;
  name: string;
  predicate: (song: Song) => boolean;
  sort: 'artist' | 'title' | 'runningNumber';
};
type GeneratedFolderDefinition = {
  key: string;
  label: string;
  lists: GeneratedListDefinition[];
};
type SongListFolder = {
  key: string;
  label: string;
  lists: SongList[];
  generated: boolean;
};

const CUSTOM_FOLDER_STORAGE_KEY = 'songtexts.songListCustomFolders.v1';
const LIST_FOLDER_STORAGE_KEY = 'songtexts.songListFolderAssignments.v1';
const DEFAULT_CUSTOM_FOLDERS = ['Göhren'];

const formatRunningNumber = (runningNumber?: number | null): string =>
  runningNumber === null || runningNumber === undefined
    ? '#-'
    : `#${String(runningNumber).padStart(4, '0')}`;

const formatListRunningNumber = (runningNumber?: number | null): string =>
  runningNumber === null || runningNumber === undefined
    ? '(-)'
    : `(${String(runningNumber).padStart(4, '0')})`;

const hasGenre = (song: Song, genre: string) =>
  (song.genres ?? []).some((item) => item.localeCompare(genre, 'de', { sensitivity: 'base' }) === 0);

const isWithinYearRange = (song: Song, fromInclusive: number, toInclusive: number) =>
  song.songYear !== null
  && song.songYear !== undefined
  && song.songYear >= fromInclusive
  && song.songYear <= toInclusive;

const generatedList = (
  id: number,
  name: string,
  predicate: (song: Song) => boolean,
  sort: GeneratedListDefinition['sort'] = 'runningNumber'
): GeneratedListDefinition => ({ id, name, predicate, sort });

const GENERATED_FOLDERS: GeneratedFolderDefinition[] = [
  {
    key: 'all',
    label: 'Alle Songs',
    lists: [
      generatedList(-101, 'A-Z Interpreten', () => true, 'artist'),
      generatedList(-102, 'A-Z Songs', () => true, 'title'),
    ],
  },
  {
    key: 'decades',
    label: 'Dekaden',
    lists: [
      generatedList(-201, 'Oldies', (song) => hasGenre(song, 'Oldies')),
      generatedList(-202, '70er', (song) => isWithinYearRange(song, 1970, 1979) || hasGenre(song, '70er')),
      generatedList(-203, '80er', (song) => isWithinYearRange(song, 1980, 1989) || hasGenre(song, '80er')),
      generatedList(-204, '90er', (song) => isWithinYearRange(song, 1990, 1999) || hasGenre(song, '90er')),
      generatedList(-205, '2000er', (song) => isWithinYearRange(song, 2000, 2009) || hasGenre(song, '2000er')),
      generatedList(-206, '2010er', (song) => isWithinYearRange(song, 2010, 2019) || hasGenre(song, '2010er')),
      generatedList(-207, '2020er', (song) => isWithinYearRange(song, 2020, 2029) || hasGenre(song, '2020er')),
    ],
  },
  {
    key: 'english',
    label: 'Genre english',
    lists: [
      generatedList(-301, 'Pop/ Rock english', (song) => hasGenre(song, 'Pop/ Rock english')),
      generatedList(-302, 'Country', (song) => hasGenre(song, 'Country')),
      generatedList(-303, 'Punk', (song) => hasGenre(song, 'Punk')),
    ],
  },
  {
    key: 'german',
    label: 'Genre deutsch',
    lists: [
      generatedList(-401, 'Deutsch', (song) => hasGenre(song, 'Deutsch')),
      generatedList(-402, 'Deutsch 2000+', (song) => hasGenre(song, 'Deutsch 2000+')),
      generatedList(-403, 'Pop/ Rock deutsch', (song) => hasGenre(song, 'Pop/ Rock deutsch')),
      generatedList(-404, 'NDW', (song) => hasGenre(song, 'NDW')),
      generatedList(-405, 'Hip Hop deutsch', (song) => hasGenre(song, 'Hip Hop deutsch')),
      generatedList(-406, 'Schlager', (song) => hasGenre(song, 'Schlager')),
      generatedList(-407, 'DDR-Schlager', (song) => hasGenre(song, 'DDR-Schlager')),
    ],
  },
  {
    key: 'specials',
    label: 'Specials',
    lists: [
      generatedList(-501, 'Schlaflieder', (song) => hasGenre(song, 'Schlaflieder')),
      generatedList(-502, 'Christmas', (song) => hasGenre(song, 'Christmas')),
      generatedList(-503, 'Duette', (song) => hasGenre(song, 'Duette')),
    ],
  },
  {
    key: 'vibes',
    label: 'Special Vibes',
    lists: [
      generatedList(-601, 'Synth', (song) => hasGenre(song, 'Synth')),
      generatedList(-602, 'Shanty', (song) => hasGenre(song, 'Shanty')),
      generatedList(-603, 'New Wave', (song) => hasGenre(song, 'New Wave')),
      generatedList(-604, 'Reggae', (song) => hasGenre(song, 'Reggae')),
      generatedList(-605, 'Volksmusik/ Folklore', (song) => hasGenre(song, 'Volksmusik/ Folklore')),
    ],
  },
];

const readStringArrayFromStorage = (key: string, fallback: string[]) => {
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(key) ?? 'null');
    if (Array.isArray(parsed)) {
      const values = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      return values.length > 0 ? values : fallback;
    }
  } catch {
    // Ignore invalid local storage data and use the default.
  }
  return fallback;
};

const readRecordFromStorage = (key: string) => {
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => typeof value === 'string')
      ) as Record<string, string>;
    }
  } catch {
    // Ignore invalid local storage data and use an empty mapping.
  }
  return {};
};

const toSongListItems = (songs: Song[]): SongListItem[] =>
  songs.map((song, index) => ({
    songId: song.id,
    orderIndex: index + 1,
    runningNumber: song.runningNumber,
    songName: song.name,
    artist: song.artist,
  }));

const sortSongs = (songs: Song[], sort: GeneratedListDefinition['sort']) => {
  const next = [...songs];
  if (sort === 'artist') {
    return next.sort((a, b) => {
      const artistCompare = a.artist.localeCompare(b.artist, 'de', { sensitivity: 'base' });
      if (artistCompare !== 0) return artistCompare;
      return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
    });
  }
  if (sort === 'title') {
    return next.sort((a, b) => {
      const titleCompare = a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
      if (titleCompare !== 0) return titleCompare;
      return a.artist.localeCompare(b.artist, 'de', { sensitivity: 'base' });
    });
  }
  return next.sort((a, b) => {
    const runningNumberCompare = (a.runningNumber ?? Number.MAX_SAFE_INTEGER) - (b.runningNumber ?? Number.MAX_SAFE_INTEGER);
    if (runningNumberCompare !== 0) return runningNumberCompare;
    return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
  });
};

const createGeneratedList = (definition: GeneratedListDefinition, songs: Song[]): SongList => {
  const matchingSongs = sortSongs(songs.filter(definition.predicate), definition.sort);
  return {
    id: definition.id,
    name: definition.name,
    generated: true,
    songCount: matchingSongs.length,
    songs: toSongListItems(matchingSongs),
  };
};

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
  const [openFolderKey, setOpenFolderKey] = useState<string>('all');
  const [formName, setFormName] = useState('');
  const [formFolderKey, setFormFolderKey] = useState('custom:Göhren');
  const [formSongIds, setFormSongIds] = useState<number[]>([]);
  const [songToAdd, setSongToAdd] = useState<string>('');
  const [songUploaderToAdd, setSongUploaderToAdd] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [customFolders, setCustomFolders] = useState<string[]>(() =>
    readStringArrayFromStorage(CUSTOM_FOLDER_STORAGE_KEY, DEFAULT_CUSTOM_FOLDERS)
  );
  const [listFolderAssignments, setListFolderAssignments] = useState<Record<string, string>>(() =>
    readRecordFromStorage(LIST_FOLDER_STORAGE_KEY)
  );
  const [newFolderName, setNewFolderName] = useState('');

  const songsById = useMemo(
    () => new Map(allSongs.map((song) => [song.id, song])),
    [allSongs]
  );

  const manualLists = useMemo(
    () => songLists.filter((list) => !list.generated),
    [songLists]
  );

  const generatedFolders = useMemo<SongListFolder[]>(
    () => GENERATED_FOLDERS.map((folder) => ({
      key: folder.key,
      label: folder.label,
      generated: true,
      lists: folder.lists.map((list) => createGeneratedList(list, allSongs)),
    })),
    [allSongs]
  );

  const customSongListFolders = useMemo<SongListFolder[]>(() => {
    const folders = customFolders.map((folderName) => {
      const key = `custom:${folderName}`;
      return {
        key,
        label: folderName,
        generated: false,
        lists: manualLists.filter((list) => (listFolderAssignments[String(list.id)] ?? 'custom:Göhren') === key),
      };
    });

    const knownKeys = new Set(folders.map((folder) => folder.key));
    const unassignedLists = manualLists.filter((list) => {
      const key = listFolderAssignments[String(list.id)];
      return key && !knownKeys.has(key);
    });

    return unassignedLists.length > 0
      ? [...folders, { key: 'custom:Weitere', label: 'Weitere', generated: false, lists: unassignedLists }]
      : folders;
  }, [customFolders, listFolderAssignments, manualLists]);

  const folders = useMemo<SongListFolder[]>(
    () => [...generatedFolders, ...customSongListFolders],
    [customSongListFolders, generatedFolders]
  );

  const allDisplayLists = useMemo(
    () => folders.flatMap((folder) => folder.lists),
    [folders]
  );

  const selectedList = useMemo(
    () => allDisplayLists.find((list) => list.id === selectedListId) ?? null,
    [allDisplayLists, selectedListId]
  );

  const isAdmin = currentUser?.role === 'ADMIN';
  const canManageLists = isAdmin && isOnline;

  const uploaderOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allSongs
            .map((song) => String(song.uploader ?? '').trim())
            .filter((value) => value !== '')
        )
      ).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })),
    [allSongs]
  );

  const availableSongsForAdd = useMemo(
    () =>
      allSongs.filter((song) => {
        const matchesUploader =
          songUploaderToAdd.trim() === '' ||
          String(song.uploader ?? '').trim().localeCompare(songUploaderToAdd, 'de', {
            sensitivity: 'base',
          }) === 0;
        return matchesUploader && !formSongIds.includes(song.id);
      }),
    [allSongs, formSongIds, songUploaderToAdd]
  );

  const persistCustomFolders = (nextFolders: string[]) => {
    setCustomFolders(nextFolders);
    globalThis.localStorage.setItem(CUSTOM_FOLDER_STORAGE_KEY, JSON.stringify(nextFolders));
  };

  const persistListFolderAssignments = (nextAssignments: Record<string, string>) => {
    setListFolderAssignments(nextAssignments);
    globalThis.localStorage.setItem(LIST_FOLDER_STORAGE_KEY, JSON.stringify(nextAssignments));
  };

  const loadData = async () => {
    const [listsResponse, songsResponse] = await Promise.all([
      SongListService.getAllSongLists(),
      SongService.getSongContent(),
    ]);

    const listsData = Array.isArray(listsResponse.data) ? listsResponse.data : [];
    const songsData = Array.isArray(songsResponse.data) ? songsResponse.data : [];
    setSongLists(listsData.filter((list) => !list.generated));
    setAllSongs(songsData);
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
  }, []);

  useEffect(() => {
    if (selectedListId !== null && allDisplayLists.some((list) => list.id === selectedListId)) {
      return;
    }
    const firstList = folders.find((folder) => folder.lists.length > 0)?.lists[0] ?? null;
    setSelectedListId(firstList?.id ?? null);
    if (firstList) {
      const folder = folders.find((item) => item.lists.some((list) => list.id === firstList.id));
      setOpenFolderKey(folder?.key ?? 'all');
    }
  }, [allDisplayLists, folders, selectedListId]);

  const startCreate = (folderKey = formFolderKey) => {
    if (!isAdmin) {
      setError('Nur Admins koennen Song-Listen erstellen.');
      return;
    }
    setMode('create');
    setFormName('');
    setFormFolderKey(folderKey.startsWith('custom:') ? folderKey : 'custom:Göhren');
    setFormSongIds([]);
    setSongToAdd('');
    setSongUploaderToAdd('');
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
    setFormFolderKey(listFolderAssignments[String(list.id)] ?? 'custom:Göhren');
    setFormSongIds(
      [...list.songs]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => item.songId)
    );
    setSongToAdd('');
    setSongUploaderToAdd('');
    setError(null);
  };

  const cancelEditor = () => {
    setMode('view');
    setFormName('');
    setFormSongIds([]);
    setSongToAdd('');
    setSongUploaderToAdd('');
  };

  const createFolder = () => {
    const nextName = newFolderName.trim();
    if (!nextName) {
      setError('Bitte gib einen Ordnernamen ein.');
      return;
    }
    if (customFolders.some((folder) => folder.localeCompare(nextName, 'de', { sensitivity: 'base' }) === 0)) {
      setError('Diesen Ordner gibt es bereits.');
      return;
    }
    const nextFolders = [...customFolders, nextName].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
    persistCustomFolders(nextFolders);
    setOpenFolderKey(`custom:${nextName}`);
    setFormFolderKey(`custom:${nextName}`);
    setNewFolderName('');
    setError(null);
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
        persistListFolderAssignments({
          ...listFolderAssignments,
          [String(created.data.id)]: formFolderKey,
        });
        await loadData();
        setSelectedListId(created.data.id);
        setOpenFolderKey(formFolderKey);
      } else if (mode === 'edit' && selectedListId) {
        const selected = manualLists.find((list) => list.id === selectedListId);
        if (selected?.generated) {
          setError('Automatische Song-Listen koennen nicht bearbeitet werden.');
          return;
        }
        await SongListService.updateSongList(selectedListId, payload);
        persistListFolderAssignments({
          ...listFolderAssignments,
          [String(selectedListId)]: formFolderKey,
        });
        await loadData();
        setOpenFolderKey(formFolderKey);
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
      const { [String(list.id)]: _removed, ...nextAssignments } = listFolderAssignments;
      persistListFolderAssignments(nextAssignments);
      await loadData();
      if (selectedListId === list.id) {
        setSelectedListId(null);
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

  const selectList = (list: SongList, folderKey: string) => {
    setSelectedListId(list.id);
    setOpenFolderKey(folderKey);
    setMode('view');
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
              onClick={() => startCreate()}
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
          {canManageLists && (
            <div className="song-list-folder-create">
              <input
                className="text-input"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="Ordnername"
                aria-label="Ordnername"
              />
              <button
                type="button"
                className="primary-button btn-confirm"
                onClick={createFolder}
                disabled={saving || isOffline}
              >
                + Ordner
              </button>
            </div>
          )}

          <div className="song-list-folder-group-title">Automatisch</div>
          <ul className="song-list-folder-list">
            {generatedFolders.map((folder) => (
              <li key={folder.key} className="song-list-folder">
                <button
                  type="button"
                  className={
                    openFolderKey === folder.key
                      ? 'song-list-folder-toggle is-open'
                      : 'song-list-folder-toggle'
                  }
                  onClick={() => setOpenFolderKey(openFolderKey === folder.key ? '' : folder.key)}
                >
                  <span>{openFolderKey === folder.key ? '▾' : '▸'}</span>
                  <strong>{folder.label}</strong>
                </button>
                {openFolderKey === folder.key && (
                  <ul className="song-list-folder-items">
                    {folder.lists.map((list) => (
                      <li key={list.id} className="song-lists-item">
                        <button
                          type="button"
                          className={
                            selectedListId === list.id
                              ? 'song-lists-item-main is-active'
                              : 'song-lists-item-main'
                          }
                          onClick={() => selectList(list, folder.key)}
                        >
                          <strong>{list.name}</strong>
                          <span>{list.songCount} Song(s)</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className="song-list-folder-group-title">Individuell</div>
          <ul className="song-list-folder-list">
            {customSongListFolders.map((folder) => (
              <li key={folder.key} className="song-list-folder">
                <button
                  type="button"
                  className={
                    openFolderKey === folder.key
                      ? 'song-list-folder-toggle is-open'
                      : 'song-list-folder-toggle'
                  }
                  onClick={() => setOpenFolderKey(openFolderKey === folder.key ? '' : folder.key)}
                >
                  <span>{openFolderKey === folder.key ? '▾' : '▸'}</span>
                  <strong>{folder.label}</strong>
                </button>
                {openFolderKey === folder.key && (
                  <div className="song-list-folder-body">
                    {canManageLists && (
                      <button
                        type="button"
                        className="song-list-folder-add-list"
                        onClick={() => startCreate(folder.key)}
                        disabled={saving || isOffline}
                      >
                        + Liste in diesem Ordner
                      </button>
                    )}
                    {folder.lists.length === 0 ? (
                      <p className="song-list-folder-empty">Noch keine Song-Listen.</p>
                    ) : (
                      <ul className="song-list-folder-items">
                        {folder.lists.map((list) => (
                          <li key={list.id} className="song-lists-item">
                            <button
                              type="button"
                              className={
                                selectedListId === list.id
                                  ? 'song-lists-item-main is-active'
                                  : 'song-lists-item-main'
                              }
                              onClick={() => selectList(list, folder.key)}
                            >
                              <strong>{list.name}</strong>
                              <span>{list.songCount} Song(s)</span>
                            </button>
                            {canManageLists && (
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
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="song-lists-content">
          {mode === 'view' || !canManageLists ? (
            selectedList ? (
              <div>
                <h3>{selectedList.name}</h3>
                {selectedList.songs.length === 0 ? (
                  <p>Diese Liste ist leer.</p>
                ) : (
                  <ul className="song-lists-song-rows">
                    {[...selectedList.songs]
                      .sort((a, b) => {
                        const orderCompare = a.orderIndex - b.orderIndex;
                        if (orderCompare !== 0) return orderCompare;
                        return a.songName.localeCompare(b.songName, 'de', { sensitivity: 'base' });
                      })
                      .map((item) => (
                        <li key={`${selectedList.id}-${item.orderIndex}-${item.songId}`}>
                          <button
                            type="button"
                            className="song-lists-song-link"
                            onClick={() =>
                              navigate(`/song/${encodeURIComponent(String(item.songId))}`)
                            }
                          >
                            <span className="song-lists-song-title">
                              {item.songName} - {item.artist}
                            </span>
                            <span className="song-lists-song-number">
                              {formatListRunningNumber(item.runningNumber)}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ) : (
              <p>Waehle eine Song-Liste aus oder lege eine neue an.</p>
            )
          ) : (
            <div className="song-list-editor">
              <h3>{mode === 'create' ? 'Neue Song-Liste' : 'Song-Liste bearbeiten'}</h3>
              <div className="form-field">
                <label htmlFor="song-list-folder">Ordner</label>
                <select
                  id="song-list-folder"
                  className="text-input"
                  value={formFolderKey}
                  onChange={(event) => setFormFolderKey(event.target.value)}
                >
                  {customFolders.map((folder) => (
                    <option key={folder} value={`custom:${folder}`}>
                      {folder}
                    </option>
                  ))}
                </select>
              </div>
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
                <label htmlFor="song-list-add-uploader">Uploaded by</label>
                <select
                  id="song-list-add-uploader"
                  className="text-input"
                  value={songUploaderToAdd}
                  onChange={(event) => {
                    setSongUploaderToAdd(event.target.value);
                    setSongToAdd('');
                  }}
                >
                  <option value="">Alle</option>
                  {uploaderOptions.map((uploader) => (
                    <option key={uploader} value={uploader}>
                      uploaded by: {uploader}
                    </option>
                  ))}
                </select>
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
