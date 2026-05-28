export type SongListItem = {
  songId: number;
  orderIndex: number;
  runningNumber?: number | null;
  songName: string;
  artist: string;
};

export type SongList = {
  id: number;
  name: string;
  generated: boolean;
  songCount: number;
  songs: SongListItem[];
};

export type SongListRequest = {
  name: string;
  songIds: number[];
};
