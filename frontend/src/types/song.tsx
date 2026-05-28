import type { ChordAnnotation } from './chordAnnotation';

export type SongLine = {
  id?: number;
  orderIndex: number;
  text: string;
  chordAnnotations: ChordAnnotation[];
};

export type Song = {
  id: number;
  runningNumber?: number | null;
  artist: string;
  interpretVersion?: string | null;
  name: string;
  album: string;
  bpm?: number | null;
  capo?: number | null;
  language?: string | null;
  cadence?: string | null;
  songYear?: number | null;
  timeSignature?: string | null;
  lyricist?: string | null;
  composer?: string | null;
  producer?: string | null;
  keyRoot?: string | null;
  keySuffix?: string | null;
  play?: string | null;
  genres?: string[] | null;
  lines: SongLine[];
};

export type SongLineViewRowProps = {
  index: number;
  line: SongLine;
};

export type SongLineEditRowProps = {
  index: number;
  line: SongLine;
  onChangeFromMarkup: (
    index: number,
    text: string,
    chords: ChordAnnotation[]
  ) => void;
  onSplitLine: (
    index: number,
    beforeMarkup: string,
    afterMarkup: string
  ) => void;
};

export type SongLineCreate = Omit<SongLine, 'id'>;
export type SongCreate = Omit<Song, 'id'>;
