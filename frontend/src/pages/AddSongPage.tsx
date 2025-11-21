import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import SongService from '../services/song.service';
import type { SongCreate, SongLineCreate } from '../types/song';
import type { ChordAnnotation } from '../types/chordAnnotation';

export function parseChordLineForCreate(src: string): {
  text: string;
  chordAnnotations: ChordAnnotation[];
} {
  const raw = src.replaceAll('\r', '');
  const line = raw.replace(/^[\s\u00A0]+/, '').replace(/[\s\u00A0]+$/, '');
  const tag = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  let cursor = 0;
  let plain = '';
  const chordAnnotations: ChordAnnotation[] = [];

  while ((m = tag.exec(line)) !== null) {
    plain += line.slice(cursor, m.index);
    const pos = Array.from(plain).length;
    chordAnnotations.push({ name: m[1], position: pos });
    cursor = m.index + m[0].length;
  }
  plain += line.slice(cursor);
  return { text: plain, chordAnnotations };
}

export const AddSongPage = () => {
  const [artist, setArtist] = useState('');
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [rawLines, setRawLines] = useState('');
  const [tooLongChord, setTooLongChord] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const lines = rawLines.replaceAll('\r', '').split('\n');
    let foundTooLong = false;

    for (const line of lines) {
      if (!line.trim()) continue;
      const { chordAnnotations } = parseChordLineForCreate(line);
      for (const c of chordAnnotations) {
        if (c.name && c.name.length > 10) {
          foundTooLong = true;
          break;
        }
      }
      if (foundTooLong) break;
    }
    setTooLongChord(foundTooLong);
  }, [rawLines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lines: SongLineCreate[] = rawLines
      .replaceAll('\r', '')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, index) => {
        const { text, chordAnnotations } = parseChordLineForCreate(line);
        return { text, orderIndex: index + 1, chordAnnotations };
      });

    const newSong: SongCreate = { artist, name, album, lines };
    console.log('CREATE-PAYLOAD:', JSON.stringify(newSong, null, 2));

    SongService.createSong(newSong)
      .then(() => navigate('/'))
      .catch((err: Error) => console.error('Fehler beim Erstellen:', err));
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem' }}>
      <h2>Neuen Song hinzufügen</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="artist">Künstler:</label>
          <br />
          <input
            value={artist}
            id="artist"
            onChange={(e) => setArtist(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="title">Titel:</label>
          <br />
          <input
            id="title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="album">Album:</label>
          <br />
          <input
            id="album"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="song-lines">
            Songzeilen (eine pro Zeile, Akkorde in eckigen Klammern):
          </label>
          <br />
          <textarea
            id="song-lines"
            value={rawLines}
            onChange={(e) => setRawLines(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              backgroundColor: tooLongChord ? '#ffe6e6' : 'white',
              border: tooLongChord ? '2px solid #ff8080' : '1px solid #ccc',
            }}
            placeholder={`Beispiel:\n[G]Hello [D]darkness my [Em]old [C]friend`}
          />
          {tooLongChord && (
            <div style={{ color: '#cc0000', marginTop: '0.25rem' }}>
              ⚠️ Mindestens ein Akkord ist länger als 10 Zeichen.
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={tooLongChord}
          style={{
            backgroundColor: tooLongChord ? '#aaa' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            marginTop: '1rem',
            cursor: tooLongChord ? 'not-allowed' : 'pointer',
          }}
        >
          Speichern
        </button>
      </form>
    </div>
  );
};
