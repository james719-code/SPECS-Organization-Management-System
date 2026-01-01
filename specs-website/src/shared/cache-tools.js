/**
 * Cache Developer Tools
 * 
 * Utility functions for debugging and monitoring the cache system.
 * Import this in browser console for interactive cache management.
 */

import { imageCache, dataCache, cache } from './cache.js';

/**
 * Cache Developer Tools Object
 * Available in browser console as window.cacheTools
 */
export let cacheTools = {
    /**
     * Display detailed cache statistics
     */
    stats() {
        const stats = cache.getAllStats();
        console.log('╔══════════════════════════════════════╗');
        console.log('║       CACHE STATISTICS               ║');
        console.log('╠══════════════════════════════════════╣');
        console.log('║ IMAGE CACHE                          ║');
        console.log(`║   Entries:    ${String(stats.images.entries).padEnd(24)}║`);
        console.log(`║   Size:       ${String(stats.images.totalSizeMB + ' MB').padEnd(24)}║`);
        console.log(`║   Max Size:   ${String(stats.images.maxSizeMB + ' MB').padEnd(24)}║`);
        console.log(`║   Usage:      ${String(((parseFloat(stats.images.totalSizeMB) / parseFloat(stats.images.maxSizeMB)) * 100).toFixed(1) + '%').padEnd(24)}║`);
        console.log('╠══════════════════════════════════════╣');
        console.log('║ DATA CACHE                           ║');
        console.log(`║   Entries:    ${String(stats.data.entries).padEnd(24)}║`);
        console.log(`║   Expired:    ${String(stats.data.expired).padEnd(24)}║`);
        console.log(`║   Size:       ${String(stats.data.totalSizeMB + ' MB').padEnd(24)}║`);
        console.log('╚══════════════════════════════════════╝');
        
        return stats;
    },

    /**
     * List all cached keys
     */
    listKeys() {
        const imageStore = imageCache._getCache();
        const dataStore = dataCache._getCache();
        
        console.log('\n📸 Image Cache Keys:');
        console.table(
            Object.keys(imageStore).map(key => ({
                key,
                timestamp: new Date(imageStore[key].timestamp).toLocaleString(),
                size: `${(imageStore[key].size / 1024).toFixed(2)} KB`
            }))
        );
        
        console.log('\n📦 Data Cache Keys:');
        console.table(
            Object.keys(dataStore).map(key => ({
                key,
                timestamp: new Date(dataStore[key].timestamp).toLocaleString(),
                ttl: `${(dataStore[key].ttl / 1000).toFixed(0)}s`,
                size: `${(dataStore[key].size / 1024).toFixed(2)} KB`,
                expired: Date.now() - dataStore[key].timestamp > dataStore[key].ttl ? '❌' : '✅'
            }))
        );
    },

    /**
     * Inspect a specific cache entry
     */
    inspect(key) {
        const dataStore = dataCache._getCache();
        const entry = dataStore[key];
        
        if (!entry) {
            console.error(`❌ Key "${key}" not found in data cache`);
            return null;
        }
        
        const now = Date.now();
        const age = now - entry.timestamp;
        const expired = age > entry.ttl;
        
        console.log('╔══════════════════════════════════════╗');
        console.log('║       CACHE ENTRY DETAILS            ║');
        console.log('╠══════════════════════════════════════╣');
        console.log(`║ Key:       ${key.substring(0, 26)}...║`);
        console.log(`║ Created:   ${new Date(entry.timestamp).toLocaleString().padEnd(24)}║`);
        console.log(`║ Age:       ${(age / 1000).toFixed(0)}s / ${(entry.ttl / 1000).toFixed(0)}s${' '.repeat(15)}║`);
        console.log(`║ Status:    ${expired ? '❌ Expired' : '✅ Valid'}${' '.repeat(16)}║`);
        console.log(`║ Size:      ${(entry.size / 1024).toFixed(2)} KB${' '.repeat(17)}║`);
        console.log('╚══════════════════════════════════════╝');
        
        console.log('\n📄 Data:');
        console.log(entry.data);
        
        return entry;
    },

    /**
     * Clear specific cache type
     */
    clear(type = 'all') {
        switch (type.toLowerCase()) {
            case 'images':
                imageCache.clear();
                console.log('✅ Image cache cleared');
                break;
            case 'data':
                dataCache.clear();
                console.log('✅ Data cache cleared');
                break;
            case 'all':
            default:
                cache.clearAll();
                console.log('✅ All caches cleared');
        }
    },

    /**
     * Clear expired entries
     */
    clearExpired() {
        const dataStore = dataCache._getCache();
        const now = Date.now();
        let removedCount = 0;

        Object.entries(dataStore).forEach(([key, item]) => {
            const ttl = item.ttl || 300000;
            if (now - item.timestamp > ttl) {
                delete dataStore[key];
                removedCount++;
            }
        });

        dataCache._setCache(dataStore);
        console.log(`✅ Removed ${removedCount} expired entries`);
    },

    /**
     * Search cache keys by pattern
     */
    search(pattern) {
        const dataStore = dataCache._getCache();
        const regex = new RegExp(pattern, 'i');
        const matches = Object.keys(dataStore).filter(key => regex.test(key));
        
        console.log(`\n🔍 Found ${matches.length} matching keys:`);
        matches.forEach(key => console.log(`  - ${key}`));
        
        return matches;
    },

    /**
     * Test cache performance
     */
    async test() {
        console.log('🧪 Running cache performance tests...\n');
        
        // Test 1: Write performance
        const writeStart = performance.now();
        for (let i = 0; i < 100; i++) {
            dataCache.set(`test_key_${i}`, { data: 'test value', index: i });
        }
        const writeTime = performance.now() - writeStart;
        console.log(`✅ Write: 100 entries in ${writeTime.toFixed(2)}ms (${(writeTime/100).toFixed(2)}ms per entry)`);
        
        // Test 2: Read performance
        const readStart = performance.now();
        for (let i = 0; i < 100; i++) {
            dataCache.get(`test_key_${i}`);
        }
        const readTime = performance.now() - readStart;
        console.log(`✅ Read: 100 entries in ${readTime.toFixed(2)}ms (${(readTime/100).toFixed(2)}ms per entry)`);
        
        // Test 3: Clear performance
        const clearStart = performance.now();
        dataCache.clear('test_key_.*');
        const clearTime = performance.now() - clearStart;
        console.log(`✅ Clear: Pattern match in ${clearTime.toFixed(2)}ms`);
        
        console.log('\n📊 Performance Summary:');
        console.log(`   Total test time: ${(writeTime + readTime + clearTime).toFixed(2)}ms`);
    },

    /**
     * Simulate cache stress test
     */
    stress(entries = 1000) {
        console.log(`🔥 Starting stress test with ${entries} entries...`);
        
        const start = performance.now();
        for (let i = 0; i < entries; i++) {
            dataCache.set(`stress_test_${i}`, {
                data: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                index: i,
                timestamp: Date.now()
            });
        }
        const duration = performance.now() - start;
        
        const stats = cache.getAllStats();
        console.log(`✅ Created ${entries} entries in ${duration.toFixed(2)}ms`);
        console.log(`📦 Cache size: ${stats.data.totalSizeMB}MB`);
        console.log(`🧹 Cleaning up...`);
        
        dataCache.clear('stress_test_.*');
        console.log(`✅ Stress test complete`);
    },

    /**
     * Monitor cache in real-time
     */
    monitor(intervalSeconds = 5) {
        console.log(`📊 Starting cache monitor (updates every ${intervalSeconds}s)`);
        console.log('Press Ctrl+C or refresh page to stop\n');
        
        let iteration = 0;
        const intervalId = setInterval(() => {
            iteration++;
            const stats = cache.getAllStats();
            
            console.log(`[${new Date().toLocaleTimeString()}] Iteration ${iteration}:`);
            console.log(`  Images: ${stats.images.entries} entries, ${stats.images.totalSizeMB}MB`);
            console.log(`  Data: ${stats.data.entries} entries (${stats.data.expired} expired), ${stats.data.totalSizeMB}MB`);
            console.log('---');
        }, intervalSeconds * 1000);
        
        // Store interval ID for manual cleanup
        this._monitorInterval = intervalId;
        
        return intervalId;
    },

    /**
     * Stop monitoring
     */
    stopMonitor() {
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
            console.log('✅ Cache monitoring stopped');
        } else {
            console.log('ℹ️ No active monitor to stop');
        }
    },

    /**
     * Export cache data
     */
    export() {
        const imageStore = imageCache._getCache();
        const dataStore = dataCache._getCache();
        
        const exportData = {
            timestamp: Date.now(),
            version: '1.0',
            images: imageStore,
            data: dataStore
        };
        
        console.log('📤 Exporting cache data...');
        const json = JSON.stringify(exportData, null, 2);
        console.log(`✅ Exported ${json.length} characters`);
        
        // Copy to clipboard if available
        if (navigator.clipboard) {
            navigator.clipboard.writeText(json);
            console.log('📋 Copied to clipboard');
        }
        
        return exportData;
    },

    /**
     * Show help
     */
    help() {
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║              CACHE DEVELOPER TOOLS - HELP                    ║');
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log('║ cacheTools.stats()              - Show cache statistics      ║');
        console.log('║ cacheTools.listKeys()           - List all cached keys       ║');
        console.log('║ cacheTools.inspect(key)         - Inspect cache entry        ║');
        console.log('║ cacheTools.clear([type])        - Clear cache (all/images/data)');
        console.log('║ cacheTools.clearExpired()       - Remove expired entries     ║');
        console.log('║ cacheTools.search(pattern)      - Search keys by pattern     ║');
        console.log('║ cacheTools.test()               - Run performance tests      ║');
        console.log('║ cacheTools.stress(n)            - Stress test with n entries ║');
        console.log('║ cacheTools.monitor([interval])  - Start monitoring           ║');
        console.log('║ cacheTools.stopMonitor()        - Stop monitoring            ║');
        console.log('║ cacheTools.export()             - Export cache to JSON       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log('\n💡 Quick examples:');
        console.log('   cacheTools.stats()');
        console.log('   cacheTools.search("events")');
        console.log('   cacheTools.clear("data")');
        console.log('   cacheTools.monitor(10)');
    }
};

// Make tools available in browser console
if (typeof window !== 'undefined') {
    window.cacheTools = cacheTools;
    console.log('🔧 Cache Developer Tools loaded!');
    console.log('   Type "cacheTools.help()" for available commands');
}

export default cacheTools;
