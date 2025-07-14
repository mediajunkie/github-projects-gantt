/**
 * Multi-layer caching system for GitHub Projects Gantt
 * Implements browser cache, localStorage fallback, and cache invalidation
 */

class CacheManager {
  constructor() {
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.LOCAL_STORAGE_KEY = 'gantt-tasks-cache';
    this.METADATA_KEY = 'gantt-metadata-cache';
    this.serviceWorkerSupported = 'serviceWorker' in navigator;
    this.cacheAPISupported = 'caches' in window;
    
    this.init();
  }

  async init() {
    // Register service worker if supported
    if (this.serviceWorkerSupported) {
      try {
        await navigator.serviceWorker.register('./service-worker.js');
        console.log('Service worker registered for caching');
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  }

  /**
   * Fetch data with multi-layer caching
   * 1. Try network first
   * 2. Fall back to Cache API
   * 3. Fall back to localStorage
   * 4. Cache successful responses
   */
  async fetchWithCache(url, options = {}) {
    const cacheKey = this.getCacheKey(url);
    
    try {
      // Try network first
      const response = await fetch(url, options);
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the successful response
        await this.cacheResponse(url, data);
        this.updateLocalStorageCache(cacheKey, data);
        
        return data;
      }
      
      throw new Error(`Network response not ok: ${response.status}`);
      
    } catch (error) {
      console.warn('Network request failed, trying cache:', error.message);
      
      // Try Cache API first
      if (this.cacheAPISupported) {
        try {
          const cachedData = await this.getCachedResponse(url);
          if (cachedData) {
            console.log('Serving from Cache API');
            return cachedData;
          }
        } catch (cacheError) {
          console.warn('Cache API failed:', cacheError);
        }
      }
      
      // Fall back to localStorage
      const localData = this.getLocalStorageCache(cacheKey);
      if (localData) {
        console.log('Serving from localStorage cache');
        return localData;
      }
      
      // No cache available, re-throw original error
      throw error;
    }
  }

  /**
   * Cache response using Cache API
   */
  async cacheResponse(url, data) {
    if (!this.cacheAPISupported) return;
    
    try {
      const cache = await caches.open('gantt-cache-v1');
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${this.CACHE_DURATION / 1000}`,
          'X-Cached-At': new Date().toISOString()
        }
      });
      
      await cache.put(url, response);
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  /**
   * Get cached response from Cache API
   */
  async getCachedResponse(url) {
    if (!this.cacheAPISupported) return null;
    
    try {
      const cache = await caches.open('gantt-cache-v1');
      const response = await cache.match(url);
      
      if (response) {
        const cachedAt = response.headers.get('X-Cached-At');
        const cacheAge = Date.now() - new Date(cachedAt).getTime();
        
        if (cacheAge < this.CACHE_DURATION) {
          return await response.json();
        } else {
          // Cache expired, remove it
          await cache.delete(url);
        }
      }
    } catch (error) {
      console.warn('Failed to get cached response:', error);
    }
    
    return null;
  }

  /**
   * Update localStorage cache
   */
  updateLocalStorageCache(key, data) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        url: key
      };
      
      localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Failed to update localStorage cache:', error);
    }
  }

  /**
   * Get data from localStorage cache
   */
  getLocalStorageCache(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const cacheEntry = JSON.parse(cached);
      const cacheAge = Date.now() - cacheEntry.timestamp;
      
      if (cacheAge < this.CACHE_DURATION) {
        return cacheEntry.data;
      } else {
        // Cache expired, remove it
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error);
    }
    
    return null;
  }

  /**
   * Generate cache key from URL
   */
  getCacheKey(url) {
    return `${this.LOCAL_STORAGE_KEY}-${url.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    try {
      // Clear Cache API
      if (this.cacheAPISupported) {
        const cache = await caches.open('gantt-cache-v1');
        const keys = await cache.keys();
        await Promise.all(keys.map(key => cache.delete(key)));
      }
      
      // Clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.LOCAL_STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const stats = {
      cacheAPI: { supported: this.cacheAPISupported, entries: 0 },
      localStorage: { supported: true, entries: 0 },
      serviceWorker: { supported: this.serviceWorkerSupported, registered: false }
    };
    
    try {
      // Cache API stats
      if (this.cacheAPISupported) {
        const cache = await caches.open('gantt-cache-v1');
        const keys = await cache.keys();
        stats.cacheAPI.entries = keys.length;
      }
      
      // localStorage stats
      stats.localStorage.entries = Object.keys(localStorage).filter(key => 
        key.startsWith(this.LOCAL_STORAGE_KEY)
      ).length;
      
      // Service worker stats
      if (this.serviceWorkerSupported) {
        const registration = await navigator.serviceWorker.getRegistration();
        stats.serviceWorker.registered = !!registration;
      }
      
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }
    
    return stats;
  }
}

// Export for use in other modules
window.CacheManager = CacheManager;