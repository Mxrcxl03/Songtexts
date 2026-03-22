import api from './api';
import type { SongCreate } from '../types/song';

const createSong = (data: SongCreate) => api.post('/public/song', data);

const getSongById = (songId: number) => {
  return api.get(`/public/song/${songId}`);
};

const updateSong = (songId: number, data: SongCreate) => {
  return api.put(`/public/song/${songId}`, data);
};

const getSongContent = () => {
  return api.get('/public/song');
};

const uploadSongFile = (formData: FormData) => {
  return api.post('/public/song/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const overwriteSongFile = (songId: number, formData: FormData) => {
  return api.post(`/public/song/${songId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const deleteSong = (songId: number) => {
  return api.delete(`/public/song/${songId}`);
};

const exportToWord = (songId: number) => {
  return api.get(`/public/song/${songId}/export/word`, {
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

const exportAllToHtmlZip = () => {
  return api.get('/public/song/export/html/all', {
    responseType: 'blob',
  });
};

export default {
  getSongContent,
  getSongById,
  createSong,
  updateSong,
  uploadSongFile,
  overwriteSongFile,
  deleteSong,
  exportToWord,
  exportToPdf,
  exportToHtml,
  exportAllToHtmlZip,
};
