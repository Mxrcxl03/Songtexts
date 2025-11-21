import '../styles/global.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import SongService from '../services/song.service';
import type { Song } from '../types/song';
import type { User } from '../types/user';
import UserService from '../services/user.service';

export const HomePage = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [filtered, setFiltered] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleClick = (id: number) => {
    navigate(`/song/${id}`);
  };

  useEffect(() => {
    UserService.getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
    SongService.getSongContent()
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
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    const f = songs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q)
    );
    setFiltered(f);
  }, [query, songs]);

  if (loading) return <div>Lade Songs…</div>;
  if (error) return <div>Fehler: {error}</div>;
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="page">
      <div className="header-row">
        <h2>Alle Songs</h2>
        {isAdmin && (
          <button
            onClick={() => navigate('/songAdd')}
            className="primary-button btn-edit"
          >
            + Song hinzufügen
          </button>
        )}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nach Song, Künstler oder Album suchen..."
        className="search-input"
      />

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
                {song.artist} – {song.name} ({song.album})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
