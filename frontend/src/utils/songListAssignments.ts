import SongListService from '../services/songList.service';
import type { SongList } from '../types/songList';

export const getManualSongLists = (songLists: SongList[]) =>
  songLists.filter((songList) => !songList.generated);

export const getAssignedSongListIds = (songLists: SongList[], songId: number) =>
  getManualSongLists(songLists)
    .filter((songList) => songList.songs.some((item) => item.songId === songId))
    .map((songList) => songList.id);

export const toggleSongListSelection = (
  currentIds: number[],
  songListId: number
) => {
  if (currentIds.includes(songListId)) {
    return currentIds.filter((id) => id !== songListId);
  }

  return [...currentIds, songListId];
};

export const syncSongListAssignments = async (
  manualSongLists: SongList[],
  selectedSongListIds: number[],
  songId: number
) => {
  const selectedIds = new Set(selectedSongListIds);

  await Promise.all(
    manualSongLists.map((songList) => {
      const currentSongIds = songList.songs.map((item) => item.songId);
      const hasSong = currentSongIds.includes(songId);
      const shouldHaveSong = selectedIds.has(songList.id);

      if (hasSong === shouldHaveSong) {
        return Promise.resolve();
      }

      const nextSongIds = shouldHaveSong
        ? [...currentSongIds, songId]
        : currentSongIds.filter((currentSongId) => currentSongId !== songId);

      return SongListService.updateSongList(songList.id, {
        name: songList.name,
        songIds: nextSongIds,
      });
    })
  );
};
