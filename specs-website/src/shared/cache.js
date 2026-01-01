/**
 * Centralized Cache Manager for SPECS Application
 * Handles caching of images, API responses, and other data with automatic cleanup
 */

import { storage } from './appwrite.js';

const CACHE_CONFIG = {
    IMAGE_CACHE_KEY: 'specs_image_cache',
    DATA_CACHE_KEY: 'specs_data_cache',
    DEFAULT_IMAGE_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    DEFAULT_DATA_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
    CLEANUP_THRESHOLD: 0.8 // Clean up when cache reaches 80% of max size
};

/**
 * Image Cache Manager
 */
export const imageCache = {
    /**
     * Get cached image URL or generate and cache a new one
     * @param {string} bucketId - Appwrite bucket ID
     * @param {string} fileId - File ID in the bucket
     * @param {number} width - Desired width
     * @param {number} height - Desired height
     * @param {string} gravity - Image gravity (default: 'center')
     * @param {number} quality - Image quality (default: 80)
     * @returns {string|null} Image URL or null
     */
    get(bucketId, fileId, width = 400, height = 250, gravity = 'center', quality = 80) {
        if (!fileId || !bucketId) return null;

        try {
            const cache = this._getCache();
            const cacheKey = `${bucketId}_${fileId}_${width}x${height}_${gravity}_${quality}`;
            const now = Date.now();

            if (cache[cacheKey]) {
                const cachedItem = cache[cacheKey];
                if (now - cachedItem.timestamp < CACHE_CONFIG.DEFAULT_IMAGE_TTL) {
                    return cachedItem.url;
                } else {
                    delete cache[cacheKey];
                }
            }

            const newUrl = storage.getFilePreview(bucketId, fileId, width, height, gravity, quality);

            cache[cacheKey] = {
                url: newUrl,
                timestamp: now,
                size: newUrl.length * 2 // Rough estimate of string size in bytes
            };

            this._setCache(cache);
            this._checkCacheSize();

            return newUrl;
        } catch (error) {
            console.warn('Image cache error:', error);
            return storage.getFilePreview(bucketId, fileId, width, height, gravity, quality);
        }
    },

    /**
     * Preload multiple images into cache
     * @param {Array} images - Array of image objects {bucketId, fileId, width, height, gravity, quality}
     */
    async preload(images) {
        if (!Array.isArray(images)) return;

        images.forEach(img => {
            this.get(
                img.bucketId,
                img.fileId,
                img.width || 400,
                img.height || 250,
                img.gravity || 'center',
                img.quality || 80
            );
        });
    },

    /**
     * Clear image cache for a specific file or entire cache
     * @param {string} fileId - Optional file ID to clear specific image
     */
    clear(fileId = null) {
        try {
            if (fileId) {
                const cache = this._getCache();
                Object.keys(cache).forEach(key => {
                    if (key.includes(fileId)) {
                        delete cache[key];
                    }
                });
                this._setCache(cache);
            } else {
                localStorage.removeItem(CACHE_CONFIG.IMAGE_CACHE_KEY);
            }
        } catch (error) {
            console.warn('Failed to clear image cache:', error);
        }
    },

    /**
     * Get cache statistics
     */
    getStats() {
        try {
            const cache = this._getCache();
            const entries = Object.keys(cache).length;
            const totalSize = Object.values(cache).reduce((sum, item) => sum + (item.size || 0), 0);
            
            return {
                entries,
                totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                maxSizeMB: (CACHE_CONFIG.MAX_CACHE_SIZE / (1024 * 1024)).toFixed(2)
            };
        } catch {
            return { entries: 0, totalSize: 0, totalSizeMB: '0', maxSizeMB: '50' };
        }
    },

    _getCache() {
        try {
            return JSON.parse(localStorage.getItem(CACHE_CONFIG.IMAGE_CACHE_KEY)) || {};
        } catch {
            return {};
        }
    },

    _setCache(cache) {
        try {
            localStorage.setItem(CACHE_CONFIG.IMAGE_CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
            console.warn('Failed to save image cache:', error);
        }
    },

    _checkCacheSize() {
        try {
            const cache = this._getCache();
            const totalSize = Object.values(cache).reduce((sum, item) => sum + (item.size || 0), 0);

            if (totalSize > CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD) {
                const entries = Object.entries(cache)
                    .sort((a, b) => a[1].timestamp - b[1].timestamp);

                const toRemove = Math.ceil(entries.length * 0.25);
                for (let i = 0; i < toRemove; i++) {
                    delete cache[entries[i][0]];
                }

                this._setCache(cache);
                console.log('Image cache cleaned up:', toRemove, 'entries removed');
            }
        } catch (error) {
            console.warn('Cache size check failed:', error);
        }
    }
};

/**
 * Data Cache Manager for API responses
 */
export const dataCache = {
    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if not found/expired
     */
    get(key) {
        try {
            const cache = this._getCache();
            const item = cache[key];

            if (!item) return null;

            const now = Date.now();
            const ttl = item.ttl || CACHE_CONFIG.DEFAULT_DATA_TTL;

            if (now - item.timestamp > ttl) {
                delete cache[key];
                this._setCache(cache);
                return null;
            }

            return item.data;
        } catch (error) {
            console.warn('Data cache get error:', error);
            return null;
        }
    },

    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, data, ttl = null) {
        try {
            const cache = this._getCache();
            cache[key] = {
                data,
                timestamp: Date.now(),
                ttl: ttl || CACHE_CONFIG.DEFAULT_DATA_TTL,
                size: JSON.stringify(data).length * 2
            };

            this._setCache(cache);
            this._checkCacheSize();
        } catch (error) {
            console.warn('Data cache set error:', error);
        }
    },

    /**
     * Check if key exists and is valid
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    },

    /**
     * Remove specific key from cache
     * @param {string} key - Cache key
     */
    remove(key) {
        try {
            const cache = this._getCache();
            delete cache[key];
            this._setCache(cache);
        } catch (error) {
            console.warn('Failed to remove cache key:', error);
        }
    },

    /**
     * Clear all data cache or by pattern
     * @param {string} pattern - Optional regex pattern to match keys
     */
    clear(pattern = null) {
        try {
            if (pattern) {
                const cache = this._getCache();
                const regex = new RegExp(pattern);
                Object.keys(cache).forEach(key => {
                    if (regex.test(key)) {
                        delete cache[key];
                    }
                });
                this._setCache(cache);
            } else {
                localStorage.removeItem(CACHE_CONFIG.DATA_CACHE_KEY);
            }
        } catch (error) {
            console.warn('Failed to clear data cache:', error);
        }
    },

    /**
     * Get or set pattern - fetch data if not cached
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Async function to fetch data if not cached
     * @param {number} ttl - Time to live in milliseconds (optional)
     * @returns {Promise<any>}
     */
    async getOrFetch(key, fetchFn, ttl = null) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        try {
            const data = await fetchFn();
            this.set(key, data, ttl);
            return data;
        } catch (error) {
            console.error('Failed to fetch and cache data:', error);
            throw error;
        }
    },

    /**
     * Get cache statistics
     */
    getStats() {
        try {
            const cache = this._getCache();
            const entries = Object.keys(cache).length;
            const totalSize = Object.values(cache).reduce((sum, item) => sum + (item.size || 0), 0);
            const now = Date.now();
            const expired = Object.values(cache).filter(item => {
                const ttl = item.ttl || CACHE_CONFIG.DEFAULT_DATA_TTL;
                return now - item.timestamp > ttl;
            }).length;

            return {
                entries,
                expired,
                totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            };
        } catch {
            return { entries: 0, expired: 0, totalSize: 0, totalSizeMB: '0' };
        }
    },

    _getCache() {
        try {
            return JSON.parse(localStorage.getItem(CACHE_CONFIG.DATA_CACHE_KEY)) || {};
        } catch {
            return {};
        }
    },

    _setCache(cache) {
        try {
            localStorage.setItem(CACHE_CONFIG.DATA_CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
            console.warn('Failed to save data cache:', error);
        }
    },

    _checkCacheSize() {
        try {
            const cache = this._getCache();
            const totalSize = Object.values(cache).reduce((sum, item) => sum + (item.size || 0), 0);

            if (totalSize > CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD) {
                const entries = Object.entries(cache)
                    .sort((a, b) => a[1].timestamp - b[1].timestamp);

                const toRemove = Math.ceil(entries.length * 0.25);
                for (let i = 0; i < toRemove; i++) {
                    delete cache[entries[i][0]];
                }

                this._setCache(cache);
                console.log('Data cache cleaned up:', toRemove, 'entries removed');
            }
        } catch (error) {
            console.warn('Cache size check failed:', error);
        }
    }
};

/**
 * Global cache utilities
 */
export const cache = {
    /**
     * Clear all caches (images and data)
     */
    clearAll() {
        imageCache.clear();
        dataCache.clear();
        console.log('All caches cleared');
    },

    /**
     * Get statistics for all caches
     */
    getAllStats() {
        return {
            images: imageCache.getStats(),
            data: dataCache.getStats()
        };
    },

    /**
     * Initialize cache cleanup on app start
     */
    init() {
        imageCache._checkCacheSize();
        dataCache._checkCacheSize();
        
        try {
            const dataStore = dataCache._getCache();
            const now = Date.now();
            let removedCount = 0;

            Object.entries(dataStore).forEach(([key, item]) => {
                const ttl = item.ttl || CACHE_CONFIG.DEFAULT_DATA_TTL;
                if (now - item.timestamp > ttl) {
                    delete dataStore[key];
                    removedCount++;
                }
            });

            if (removedCount > 0) {
                dataCache._setCache(dataStore);
                console.log(`Cache initialized: ${removedCount} expired entries removed`);
            }
        } catch (error) {
            console.warn('Cache initialization failed:', error);
        }
    }
};

// Helper function to generate cache keys for API calls
export function generateCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&');
    return `api_${endpoint}_${paramString}`;
}

// Export configuration for advanced users
export { CACHE_CONFIG };
