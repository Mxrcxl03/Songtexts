import api from './api';
import type { SongList, SongListRequest } from '../types/songList';

const getAllSongLists = () => api.get<SongList[]>('/public/song-lists');

const getSongListById = (id: number) => api.get<SongList>(`/public/song-lists/${id}`);

const createSongList = (data: SongListRequest) => api.post<SongList>('/public/song-lists', data);

const updateSongList = (id: number, data: SongListRequest) =>
  api.put<SongList>(`/public/song-lists/${id}`, data);

const deleteSongList = (id: number) => api.delete(`/public/song-lists/${id}`);

export default {
  getAllSongLists,
  getSongListById,
  createSongList,
  updateSongList,
  deleteSongList,
};
