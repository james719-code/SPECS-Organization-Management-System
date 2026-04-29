/**
 * Cache Developer Tools
 *
 * Utility functions for debugging and monitoring the local cache system.
 * Available in the browser console as window.cacheTools.
 */

import { imageCache, dataCache, cache } from './cache.js';

function formatBytes(bytes = 0) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function listStoreEntries(store) {
    return Object.entries(store).map(([key, item]) => ({
        key,
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        ageSeconds: Math.round((Date.now() - item.timestamp) / 1000),
        ttlSeconds: Math.round((item.ttl || 0) / 1000),
        staleSeconds: Math.round((item.staleTtl || 0) / 1000),
        size: formatBytes(item.size || 0)
    }));
}

export const cacheTools = {
    stats() {
        const stats = cache.getAllStats();
        const data = stats.data;

        console.table({
            imageEntries: stats.images.entries,
            imageSize: stats.images.totalSizeMB,
            dataEntries: data.entries,
            dataSize: data.totalSizeMB,
            hits: data.hits,
            misses: data.misses,
            staleHits: data.staleHits,
            deduped: data.deduped,
            inflight: data.inflight,
            refreshes: data.refreshes,
            evictions: data.evictions,
            savedApiCalls: data.savedApiCalls,
            errors: data.errors
        });

        return stats;
    },

    listKeys() {
        console.group('Image cache');
        console.table(listStoreEntries(imageCache._getCache()));
        console.groupEnd();

        console.group('Data cache');
        console.table(listStoreEntries(dataCache._getCache()));
        console.groupEnd();
    },

    inspect(key) {
        const entry = dataCache.getEntry(key);
        if (!entry) {
            console.warn(`Cache key not found: ${key}`);
            return null;
        }

        console.table({
            key,
            tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : '',
            created: new Date(entry.timestamp).toLocaleString(),
            lastAccessed: new Date(entry.lastAccessed || entry.timestamp).toLocaleString(),
            ttlSeconds: Math.round((entry.ttl || 0) / 1000),
            staleSeconds: Math.round((entry.staleTtl || 0) / 1000),
            size: formatBytes(entry.size || 0)
        });
        console.log(entry.data);
        return entry;
    },

    search(pattern) {
        const regex = new RegExp(pattern, 'i');
        const matches = Object.keys(dataCache._getCache()).filter(key => regex.test(key));
        console.table(matches.map(key => ({ key })));
        return matches;
    },

    clear(type = 'all') {
        if (type === 'images') {
            imageCache.clear();
        } else if (type === 'data') {
            dataCache.clear();
        } else {
            cache.clearAll();
        }
        return this.stats();
    },

    clearTags(tags) {
        const removed = dataCache.invalidateTags(Array.isArray(tags) ? tags : [tags]);
        console.log(`Removed ${removed} cache entr${removed === 1 ? 'y' : 'ies'}.`);
        return removed;
    },

    clearExpired() {
        const before = dataCache.getStats().entries;
        dataCache._checkCacheSize();
        const after = dataCache.getStats().entries;
        console.log(`Removed ${before - after} expired cache entr${before - after === 1 ? 'y' : 'ies'}.`);
        return before - after;
    },

    resetStats() {
        dataCache.resetStats();
        return this.stats();
    },

    async test() {
        dataCache.resetStats();

        const key = 'cache_tools_test';
        let fetchCount = 0;
        const fetcher = async () => {
            fetchCount++;
            return { ok: true, fetchCount };
        };

        await Promise.all([
            dataCache.getOrFetch(key, fetcher, { ttl: 1000, tags: ['test'] }),
            dataCache.getOrFetch(key, fetcher, { ttl: 1000, tags: ['test'] })
        ]);
        await dataCache.getOrFetch(key, fetcher, { ttl: 1000, tags: ['test'] });

        const stats = this.stats();
        dataCache.invalidateTags(['test']);
        return { fetchCount, stats };
    },

    monitor(intervalSeconds = 5) {
        this.stopMonitor();
        this._monitorInterval = setInterval(() => this.stats(), intervalSeconds * 1000);
        return this._monitorInterval;
    },

    stopMonitor() {
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
        }
    },

    export() {
        return {
            timestamp: Date.now(),
            images: imageCache._getCache(),
            data: dataCache._getCache(),
            stats: cache.getAllStats()
        };
    },

    help() {
        console.table([
            'cacheTools.stats()',
            'cacheTools.listKeys()',
            'cacheTools.inspect(key)',
            'cacheTools.search(pattern)',
            'cacheTools.clear("all" | "data" | "images")',
            'cacheTools.clearTags(["events", "payments"])',
            'cacheTools.clearExpired()',
            'cacheTools.resetStats()',
            'cacheTools.test()',
            'cacheTools.monitor(seconds)',
            'cacheTools.stopMonitor()',
            'cacheTools.export()'
        ]);
    }
};

if (typeof window !== 'undefined') {
    window.cacheTools = cacheTools;
}

export default cacheTools;
