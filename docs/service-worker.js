/**
 * Service Worker for GitHub Projects Gantt
 * Provides offline caching and background sync capabilities
 */

const CACHE_NAME = 'gantt-sw-cache-v1';
const DATA_CACHE_NAME = 'gantt-data-cache-v1';

// Files to cache on install
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/cache-manager.js',
  'https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.css',
  'https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((thisCacheName) => {
          if (thisCacheName !== CACHE_NAME && thisCacheName !== DATA_CACHE_NAME) {
            console.log('Removing old cache:', thisCacheName);
            return caches.delete(thisCacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle data requests (tasks.json, metadata.json)
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              // If network request is successful, cache it
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Network failed, try cache
              console.log('Network failed, serving from cache:', request.url);
              return cache.match(request);
            });
        })
    );
    return;
  }
  
  // Handle static assets
  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            return fetch(request)
              .then((response) => {
                // Don't cache non-successful responses
                if (response.status !== 200) {
                  return response;
                }
                
                // Cache successful responses
                cache.put(request, response.clone());
                return response;
              });
          });
      })
  );
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-data') {
    event.waitUntil(
      // Attempt to fetch fresh data in the background
      fetch('/tasks.json')
        .then((response) => response.json())
        .then((data) => {
          // Update cache with fresh data
          return caches.open(DATA_CACHE_NAME)
            .then((cache) => {
              cache.put('/tasks.json', new Response(JSON.stringify(data)));
            });
        })
        .catch((error) => {
          console.log('Background sync failed:', error);
        })
    );
  }
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(CACHE_NAME),
        caches.delete(DATA_CACHE_NAME)
      ]).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    event.waitUntil(
      Promise.all([
        caches.open(CACHE_NAME).then(cache => cache.keys()),
        caches.open(DATA_CACHE_NAME).then(cache => cache.keys())
      ]).then(([staticKeys, dataKeys]) => {
        event.ports[0].postMessage({
          static: staticKeys.length,
          data: dataKeys.length
        });
      })
    );
  }
});