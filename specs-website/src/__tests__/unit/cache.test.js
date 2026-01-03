/**
 * Unit tests for Cache utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need to mock the module before importing it
vi.mock('../../shared/appwrite.js', () => ({
    account: {
        get: vi.fn()
    },
    databases: {
        listDocuments: vi.fn(),
        getDocument: vi.fn()
    }
}));

describe('Cache Utility', () => {
    let cache;

    beforeEach(async () => {
        localStorage.clear();
        // Dynamically import to get fresh instance
        const module = await import('../../shared/cache.js');
        cache = module.cache;
        cache.init();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('init()', () => {
        it('should initialize without errors', () => {
            expect(() => cache.init()).not.toThrow();
        });
    });

    describe('set() and get()', () => {
        it('should store and retrieve simple data', () => {
            cache.set('test-key', 'test-value', 3600);
            const result = cache.get('test-key');
            expect(result).toBe('test-value');
        });

        it('should store and retrieve object data', () => {
            const testData = { foo: 'bar', count: 42 };
            cache.set('object-key', testData, 3600);
            const result = cache.get('object-key');
            expect(result).toEqual(testData);
        });

        it('should store and retrieve array data', () => {
            const testArray = [1, 2, 3, 'test'];
            cache.set('array-key', testArray, 3600);
            const result = cache.get('array-key');
            expect(result).toEqual(testArray);
        });

        it('should return null for non-existent keys', () => {
            const result = cache.get('non-existent-key');
            expect(result).toBeNull();
        });
    });

    describe('TTL expiration', () => {
        it('should return null for expired data', () => {
            // Set with 0 TTL (already expired)
            cache.set('expired-key', 'value', 0);
            const result = cache.get('expired-key');
            expect(result).toBeNull();
        });

        it('should return data that has not expired', () => {
            cache.set('valid-key', 'value', 3600);
            const result = cache.get('valid-key');
            expect(result).toBe('value');
        });
    });

    describe('remove()', () => {
        it('should remove a cached item', () => {
            cache.set('remove-key', 'value', 3600);
            expect(cache.get('remove-key')).toBe('value');
            cache.remove('remove-key');
            expect(cache.get('remove-key')).toBeNull();
        });

        it('should not throw when removing non-existent key', () => {
            expect(() => cache.remove('non-existent')).not.toThrow();
        });
    });

    describe('clear()', () => {
        it('should clear all cached items', () => {
            cache.set('key1', 'value1', 3600);
            cache.set('key2', 'value2', 3600);
            cache.set('key3', 'value3', 3600);

            cache.clear();

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
            expect(cache.get('key3')).toBeNull();
        });
    });
});
