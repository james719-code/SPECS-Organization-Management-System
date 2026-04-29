/**
 * Centralized Cache Manager for SPECS Application
 * Handles local image URLs and API responses with request de-duplication,
 * stale-while-revalidate, tag invalidation, and bounded cleanup.
 */

import { storage } from './appwrite.js';

const CACHE_CONFIG = {
    IMAGE_CACHE_KEY: 'specs_image_cache',
    DATA_CACHE_KEY: 'specs_data_cache',
    DEFAULT_IMAGE_TTL: 7 * 24 * 60 * 60 * 1000,
    DEFAULT_DATA_TTL: 5 * 60 * 1000,
    DEFAULT_STALE_TTL: 0,
    MAX_CACHE_SIZE: 50 * 1024 * 1024,
    CLEANUP_THRESHOLD: 0.8,
    CLEANUP_TARGET: 0.65
};

const dataInflightRequests = new Map();

const dataCacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    deduped: 0,
    refreshes: 0,
    writes: 0,
    evictions: 0,
    errors: 0
};

function normalizeTtlOptions(optionsOrTtl = null) {
    if (typeof optionsOrTtl === 'number') {
        return {
            ttl: optionsOrTtl,
            staleTtl: CACHE_CONFIG.DEFAULT_STALE_TTL,
            tags: [],
            forceRefresh: false
        };
    }

    const options = optionsOrTtl || {};
    return {
        ttl: options.ttl ?? CACHE_CONFIG.DEFAULT_DATA_TTL,
        staleTtl: options.staleTtl ?? CACHE_CONFIG.DEFAULT_STALE_TTL,
        tags: Array.isArray(options.tags) ? options.tags : [],
        forceRefresh: options.forceRefresh === true
    };
}

function getItemAge(item) {
    return Date.now() - (item?.timestamp || 0);
}

function getItemTtl(item) {
    return item?.ttl ?? CACHE_CONFIG.DEFAULT_DATA_TTL;
}

function getItemStaleTtl(item) {
    return item?.staleTtl ?? CACHE_CONFIG.DEFAULT_STALE_TTL;
}

function isFresh(item) {
    return Boolean(item) && getItemAge(item) < getItemTtl(item);
}

function isWithinStaleWindow(item) {
    if (!item) return false;
    const staleTtl = getItemStaleTtl(item);
    return staleTtl > 0 && getItemAge(item) <= getItemTtl(item) + staleTtl;
}

function calculateStoredSize(value) {
    try {
        return JSON.stringify(value).length * 2;
    } catch {
        return 0;
    }
}

function safeParseStore(rawValue) {
    if (!rawValue) return {};
    try {
        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function normalizeTags(tags) {
    if (!tags) return [];
    return Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean);
}

/**
 * Image Cache Manager
 */
export const imageCache = {
    get(bucketId, fileId, width = 400, height = 250, gravity = 'center', quality = 80) {
        if (!fileId || !bucketId) return null;

        try {
            const cacheStore = this._getCache();
            const cacheKey = `${bucketId}_${fileId}_${width}x${height}_${gravity}_${quality}`;
            const cachedItem = cacheStore[cacheKey];

            if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_CONFIG.DEFAULT_IMAGE_TTL) {
                cachedItem.lastAccessed = Date.now();
                this._setCache(cacheStore);
                return cachedItem.url;
            }

            if (cachedItem) delete cacheStore[cacheKey];

            const newUrl = storage.getFilePreview(bucketId, fileId, width, height, gravity, quality);
            cacheStore[cacheKey] = {
                url: newUrl,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                size: newUrl.length * 2
            };

            this._setCache(cacheStore);
            this._checkCacheSize();

            return newUrl;
        } catch (error) {
            console.warn('Image cache error:', error);
            return storage.getFilePreview(bucketId, fileId, width, height, gravity, quality);
        }
    },

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

    clear(fileId = null) {
        try {
            if (fileId) {
                const cacheStore = this._getCache();
                Object.keys(cacheStore).forEach(key => {
                    if (key.includes(fileId)) delete cacheStore[key];
                });
                this._setCache(cacheStore);
            } else {
                localStorage.removeItem(CACHE_CONFIG.IMAGE_CACHE_KEY);
            }
        } catch (error) {
            console.warn('Failed to clear image cache:', error);
        }
    },

    getStats() {
        try {
            const cacheStore = this._getCache();
            const entries = Object.keys(cacheStore).length;
            const totalSize = Object.values(cacheStore).reduce((sum, item) => sum + (item.size || 0), 0);

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
        return safeParseStore(localStorage.getItem(CACHE_CONFIG.IMAGE_CACHE_KEY));
    },

    _setCache(cacheStore) {
        try {
            localStorage.setItem(CACHE_CONFIG.IMAGE_CACHE_KEY, JSON.stringify(cacheStore));
        } catch (error) {
            console.warn('Failed to save image cache:', error);
        }
    },

    _checkCacheSize() {
        try {
            const cacheStore = this._getCache();
            const totalSize = Object.values(cacheStore).reduce((sum, item) => sum + (item.size || 0), 0);

            if (totalSize <= CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD) return;

            let currentSize = totalSize;
            const targetSize = CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_TARGET;
            const entries = Object.entries(cacheStore)
                .sort((a, b) => (a[1].lastAccessed || a[1].timestamp) - (b[1].lastAccessed || b[1].timestamp));

            for (const [key, item] of entries) {
                if (currentSize <= targetSize) break;
                currentSize -= item.size || 0;
                delete cacheStore[key];
            }

            this._setCache(cacheStore);
        } catch (error) {
            console.warn('Image cache size check failed:', error);
        }
    }
};

/**
 * Data Cache Manager for API responses
 */
export const dataCache = {
    get(key, options = {}) {
        try {
            const cacheStore = this._getCache();
            const item = cacheStore[key];

            if (!item) {
                dataCacheStats.misses++;
                return null;
            }

            if (isFresh(item) || (options.allowStale && isWithinStaleWindow(item))) {
                item.lastAccessed = Date.now();
                this._setCache(cacheStore);
                dataCacheStats.hits++;
                return item.data;
            }

            if (!isWithinStaleWindow(item)) {
                delete cacheStore[key];
                this._setCache(cacheStore);
            }

            dataCacheStats.misses++;
            return null;
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Data cache get error:', error);
            return null;
        }
    },

    getEntry(key) {
        try {
            return this._getCache()[key] || null;
        } catch {
            return null;
        }
    },

    set(key, data, optionsOrTtl = null) {
        const options = normalizeTtlOptions(optionsOrTtl);

        try {
            const cacheStore = this._getCache();
            const item = {
                data,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                ttl: options.ttl,
                staleTtl: options.staleTtl,
                tags: normalizeTags(options.tags)
            };
            item.size = calculateStoredSize(item);
            cacheStore[key] = item;

            this._setCache(cacheStore);
            this._checkCacheSize();
            dataCacheStats.writes++;
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Data cache set error:', error);
        }
    },

    has(key) {
        return this.get(key) !== null;
    },

    remove(key) {
        try {
            const cacheStore = this._getCache();
            delete cacheStore[key];
            this._setCache(cacheStore);
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Failed to remove cache key:', error);
        }
    },

    clear(pattern = null) {
        try {
            if (pattern) {
                const cacheStore = this._getCache();
                const regex = new RegExp(pattern);
                Object.keys(cacheStore).forEach(key => {
                    if (regex.test(key)) delete cacheStore[key];
                });
                this._setCache(cacheStore);
            } else {
                localStorage.removeItem(CACHE_CONFIG.DATA_CACHE_KEY);
            }
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Failed to clear data cache:', error);
        }
    },

    invalidateTags(tags) {
        const targetTags = new Set(normalizeTags(tags));
        if (targetTags.size === 0) return 0;

        try {
            const cacheStore = this._getCache();
            let removedCount = 0;

            Object.entries(cacheStore).forEach(([key, item]) => {
                const itemTags = normalizeTags(item.tags);
                if (itemTags.some(tag => targetTags.has(tag))) {
                    delete cacheStore[key];
                    removedCount++;
                }
            });

            this._setCache(cacheStore);
            return removedCount;
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Failed to invalidate cache tags:', error);
            return 0;
        }
    },

    async getOrFetch(key, fetchFn, optionsOrTtl = null) {
        const options = normalizeTtlOptions(optionsOrTtl);
        const item = this.getEntry(key);

        if (!options.forceRefresh && isFresh(item)) {
            dataCacheStats.hits++;
            this._touch(key);
            return item.data;
        }

        if (!options.forceRefresh && isWithinStaleWindow(item)) {
            dataCacheStats.staleHits++;
            this._touch(key);
            this._refreshInBackground(key, fetchFn, options);
            return item.data;
        }

        dataCacheStats.misses++;

        if (dataInflightRequests.has(key)) {
            dataCacheStats.deduped++;
            return dataInflightRequests.get(key);
        }

        const request = Promise.resolve()
            .then(fetchFn)
            .then(data => {
                this.set(key, data, options);
                return data;
            })
            .catch(error => {
                dataCacheStats.errors++;
                throw error;
            })
            .finally(() => {
                dataInflightRequests.delete(key);
            });

        dataInflightRequests.set(key, request);
        return request;
    },

    getStats() {
        try {
            const cacheStore = this._getCache();
            const entries = Object.keys(cacheStore).length;
            const totalSize = Object.values(cacheStore).reduce((sum, item) => sum + (item.size || 0), 0);
            const now = Date.now();
            const expired = Object.values(cacheStore).filter(item => now - item.timestamp > getItemTtl(item)).length;

            return {
                entries,
                expired,
                totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                maxSizeMB: (CACHE_CONFIG.MAX_CACHE_SIZE / (1024 * 1024)).toFixed(2),
                inflight: dataInflightRequests.size,
                hits: dataCacheStats.hits,
                misses: dataCacheStats.misses,
                staleHits: dataCacheStats.staleHits,
                deduped: dataCacheStats.deduped,
                refreshes: dataCacheStats.refreshes,
                writes: dataCacheStats.writes,
                evictions: dataCacheStats.evictions,
                errors: dataCacheStats.errors,
                savedApiCalls: dataCacheStats.hits + dataCacheStats.staleHits + dataCacheStats.deduped
            };
        } catch {
            return {
                entries: 0,
                expired: 0,
                totalSize: 0,
                totalSizeMB: '0',
                maxSizeMB: '50',
                inflight: dataInflightRequests.size,
                ...dataCacheStats,
                savedApiCalls: dataCacheStats.hits + dataCacheStats.staleHits + dataCacheStats.deduped
            };
        }
    },

    resetStats() {
        Object.keys(dataCacheStats).forEach(key => {
            dataCacheStats[key] = 0;
        });
        dataInflightRequests.clear();
    },

    _getCache() {
        return safeParseStore(localStorage.getItem(CACHE_CONFIG.DATA_CACHE_KEY));
    },

    _setCache(cacheStore) {
        try {
            localStorage.setItem(CACHE_CONFIG.DATA_CACHE_KEY, JSON.stringify(cacheStore));
        } catch (error) {
            this._evictAndRetry(cacheStore);
        }
    },

    _touch(key) {
        try {
            const cacheStore = this._getCache();
            if (!cacheStore[key]) return;
            cacheStore[key].lastAccessed = Date.now();
            this._setCache(cacheStore);
        } catch {
            // Touch failures should not make reads fail.
        }
    },

    _refreshInBackground(key, fetchFn, options) {
        if (dataInflightRequests.has(key)) return;

        dataCacheStats.refreshes++;
        const request = Promise.resolve()
            .then(fetchFn)
            .then(data => {
                this.set(key, data, options);
                return data;
            })
            .catch(error => {
                dataCacheStats.errors++;
                console.warn('Background cache refresh failed:', error);
            })
            .finally(() => {
                dataInflightRequests.delete(key);
            });

        dataInflightRequests.set(key, request);
    },

    _checkCacheSize() {
        try {
            const cacheStore = this._getCache();
            const now = Date.now();
            let totalSize = Object.values(cacheStore).reduce((sum, item) => sum + (item.size || 0), 0);
            let evicted = 0;

            Object.entries(cacheStore).forEach(([key, item]) => {
                if (!isFresh(item) && !isWithinStaleWindow(item)) {
                    totalSize -= item.size || 0;
                    delete cacheStore[key];
                    evicted++;
                } else if (!item.lastAccessed) {
                    item.lastAccessed = item.timestamp || now;
                }
            });

            if (totalSize > CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD) {
                const targetSize = CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_TARGET;
                const entries = Object.entries(cacheStore)
                    .sort((a, b) => (a[1].lastAccessed || a[1].timestamp) - (b[1].lastAccessed || b[1].timestamp));

                for (const [key, item] of entries) {
                    if (totalSize <= targetSize) break;
                    totalSize -= item.size || 0;
                    delete cacheStore[key];
                    evicted++;
                }
            }

            if (evicted > 0) dataCacheStats.evictions += evicted;
            this._setCache(cacheStore);
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Cache size check failed:', error);
        }
    },

    _evictAndRetry(cacheStore) {
        try {
            const entries = Object.entries(cacheStore)
                .sort((a, b) => (a[1].lastAccessed || a[1].timestamp) - (b[1].lastAccessed || b[1].timestamp));
            const removeCount = Math.max(1, Math.ceil(entries.length * 0.25));

            for (let i = 0; i < removeCount; i++) {
                delete cacheStore[entries[i][0]];
            }

            dataCacheStats.evictions += removeCount;
            localStorage.setItem(CACHE_CONFIG.DATA_CACHE_KEY, JSON.stringify(cacheStore));
        } catch (error) {
            dataCacheStats.errors++;
            console.warn('Failed to save data cache after eviction:', error);
        }
    }
};

/**
 * Global cache utilities
 */
export const cache = {
    get: (...args) => dataCache.get(...args),
    set: (...args) => dataCache.set(...args),
    remove: (...args) => dataCache.remove(...args),
    clear: (...args) => dataCache.clear(...args),
    clearTags: (...args) => dataCache.invalidateTags(...args),

    clearAll() {
        imageCache.clear();
        dataCache.clear();
    },

    getAllStats() {
        return {
            images: imageCache.getStats(),
            data: dataCache.getStats()
        };
    },

    init() {
        imageCache._checkCacheSize();
        dataCache._checkCacheSize();
    }
};

export function generateCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&');
    return `api_${endpoint}_${paramString}`;
}

export { CACHE_CONFIG };
