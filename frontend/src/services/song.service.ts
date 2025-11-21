import api from './api';
import type { SongCreate } from '../types/song';

const createSong = (data: SongCreate) => api.post('/public/song', data);

const getSongContent = () => {
  return api.get('/public/song');
};

export default {
  getSongContent,
  createSong,
};
