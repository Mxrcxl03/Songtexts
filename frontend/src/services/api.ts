import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = original?.url ?? '';
    const isAuthCall = typeof url === 'string' && url.startsWith('/auth/');
    const isRefreshCall = original?.url?.includes('/auth/refreshtoken');

    if (error.response?.status === 401 && !original._retry && !isRefreshCall && !isAuthCall) {
      if (isRefreshing) {
        await new Promise<void>((resolve, reject) =>
          pendingRequests.push({ resolve, reject })
        );
        original._retry = true;
        return api(original);
      }

      try {
        isRefreshing = true;
        await api.post('/auth/refreshtoken');
        for (const pending of pendingRequests) {
          pending.resolve();
        }
        pendingRequests = [];
        original._retry = true;
        return api(original);
      } catch (e) {
        for (const pending of pendingRequests) {
          pending.reject(e);
        }
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
