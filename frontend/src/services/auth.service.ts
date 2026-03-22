import type { User } from "../types/user";
import api from "./api";
import axios from 'axios';

export type LoginRequest = { username: string; password: string };
export type RegisterRequest = { username: string; email: string; password: string };

export const register = (
  username: string,
  email: string,
  password: string
): Promise<string | { message: string }> => {
  return api
    .post<string | { message: string }>("/auth/register", {
      username,
      email,
      password,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Register error:", error);
      throw error;
    });
};

export const login = (username: string, password: string): Promise<User> => {
  return api
    .post<User>("/auth/login", { username, password })
    .then((response) => response.data)
    .catch((error) => {
      console.error("Login error:", error);
      throw error;
    });
};

export const logout = (): Promise<void> => {
  return api
    .post("/auth/logout")
    .then(() => {
      console.log("User logged out – Cookies deleted by backend");
    })
    .catch((error) => {
      if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
        console.warn('Logout skipped while offline.');
        return;
      }

      console.error("Logout error:", error);
    });
};

export const refreshToken = (): Promise<string | { message: string }> => {
  return api
    .post<string | { message: string }>("/auth/refreshtoken")
    .then((response) => response.data)
    .catch((error) => {
      console.error("Refresh error:", error);
      throw error;
    });
};

const AuthService = {
  register,
  login,
  logout,
  refreshToken,
};

export default AuthService;