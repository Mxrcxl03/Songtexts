import api from './api';
import type { SongCreate } from '../types/song';

const createSong = (data: SongCreate) => api.post('/public/song', data);

const importSongFromWord = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/public/song/import/word', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const previewSongFromWord = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/public/song/import/word/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const getSongById = (songId: number) => {
  return api.get(`/public/song/${songId}`);
};

const updateSong = (songId: number, data: SongCreate) => {
  return api.put(`/public/song/${songId}`, data);
};

const getSongContent = () => {
  return api.get('/public/song');
};

const deleteSong = (songId: number) => {
  return api.delete(`/public/song/${songId}`);
};

const exportToWord = (songId: number) => {
  return api.get(`/public/song/${songId}/export/word`, {
    responseType: 'blob',
  });
};

const exportAllToWordZip = () => {
  return api.get('/public/song/export/word/all', {
    responseType: 'blob',
  });
};

const exportToPdf = (songId: number) => {
  return api.get(`/public/song/${songId}/export/pdf`, {
    responseType: 'blob',
  });
};

const exportToHtml = (songId: number) => {
  return api.get(`/public/song/${songId}/export/html`, {
    responseType: 'blob',
  });
};

export default {
  getSongContent,
  getSongById,
  createSong,
  importSongFromWord,
  previewSongFromWord,
  updateSong,
  deleteSong,
  exportToWord,
  exportAllToWordZip,
  exportToPdf,
  exportToHtml,
};
