import type { User } from '../types/user';
import type { RegistrationRequest } from '../types/registrationRequest';
import type { LoginEvent } from '../types/loginEvent';
import api from './api';

const getUser = () => {
  return api.get('/public/user');
};

export const getAllUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/public/user', {
    withCredentials: true,
  });
  return response.data;
};

export const deleteUserById = async (userId: number): Promise<void> => {
  await api.delete(`/public/user/${userId}`, {
    withCredentials: true,
  });
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

export const getPendingRegistrationRequests = async (): Promise<
  RegistrationRequest[]
> => {
  const response = await api.get<RegistrationRequest[]>(
    '/admin/registration-requests',
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const approveRegistrationRequest = async (
  requestId: number
): Promise<RegistrationRequest> => {
  const response = await api.post<RegistrationRequest>(
    `/admin/registration-requests/${requestId}/approve`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const rejectRegistrationRequest = async (
  requestId: number
): Promise<void> => {
  await api.post(
    `/admin/registration-requests/${requestId}/reject`,
    {},
    {
      withCredentials: true,
    }
  );
};

export const getLoginHistory = async (userId?: number): Promise<LoginEvent[]> => {
  const response = await api.get<LoginEvent[]>('/admin/login-events', {
    withCredentials: true,
    params: userId ? { userId } : undefined,
  });
  return response.data;
};

const UserService = {
  getUser,
  getAllUsers,
  deleteUserById,
  getCurrentUser,
  getPendingRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  getLoginHistory,
};

export default UserService;
