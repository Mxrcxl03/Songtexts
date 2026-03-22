/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

const SONG_CACHE = 'songtexts-songs-cache-v1';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request, url }) => {
    if (request.method !== 'GET') return false;
    if (!url.pathname.startsWith('/api/v1/public/song')) return false;
    if (url.pathname.includes('/export/')) return false;
    return true;
  },
  new NetworkFirst({
    cacheName: SONG_CACHE,
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
);

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_SONG_CACHE') return;

  event.waitUntil(caches.delete(SONG_CACHE));
});
