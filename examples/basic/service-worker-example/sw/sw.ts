import { SubAppServiceWorkerManager } from '@ringcentral/mfe-service-worker/sw/service-worker.mfe';

declare const self: ServiceWorkerGlobalScope;

new SubAppServiceWorkerManager().listener();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Become available to all pages
});
