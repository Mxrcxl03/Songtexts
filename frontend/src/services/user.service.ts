import type { User } from '../types/user';
import api from './api';

const getUser = () => {
  return api.get('/public/user');
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get<User>("/public/user/me", { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error("Fehler beim Abrufen des aktuellen Benutzers:", error);
    return null;
  }
};

const UserService = {
  getUser,
  getCurrentUser,
};

export default UserService;
