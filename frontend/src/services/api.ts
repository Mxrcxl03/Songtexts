import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL as string | undefined;
if (!BASE_URL) throw new Error('VITE_API_URL fehlt');

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original?.url?.includes('/auth/refreshtoken');

    if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingRequests.push(resolve));
        original._retry = true;
        return api(original);
      }

      try {
        isRefreshing = true;
        await api.post('/auth/refreshtoken');
        for (const resolve of pendingRequests) {
          resolve();
        }
        pendingRequests = [];
        original._retry = true;
        return api(original);
      } catch (e) {
        pendingRequests = [];
        globalThis.location.href = '/login';
        throw e;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);

export async function get<T = any>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.get<T>(url, config);
  return data;
}
export async function post<T = any>(
  url: string,
  body?: any,
  config?: AxiosRequestConfig
) {
  const { data } = await api.post<T>(url, body, config);
  return data;
}

export default api;
