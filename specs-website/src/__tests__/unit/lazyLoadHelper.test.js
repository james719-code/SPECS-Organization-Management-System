/**
 * Unit tests for lazyLoadHelper utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    lazyLoadComponent,
    lazyLoadAll,
    lazyImage,
    initLazyImages,
    prefetchModule,
    createViewLoader
} from '../../shared/lazyLoadHelper.js';

describe('lazyLoadHelper', () => {
    describe('lazyLoadComponent()', () => {
        it('should create an IntersectionObserver', () => {
            const element = document.createElement('div');
            const loadFn = vi.fn();

            const observer = lazyLoadComponent(element, loadFn);

            expect(observer).toBeDefined();
            expect(observer.elements.has(element)).toBe(true);
        });

        it('should call loadFn when element intersects', () => {
            const element = document.createElement('div');
            const loadFn = vi.fn();

            const observer = lazyLoadComponent(element, loadFn);

            // Simulate intersection
            observer.triggerIntersection([
                { target: element, isIntersecting: true }
            ]);

            expect(loadFn).toHaveBeenCalledWith(element);
        });

        it('should unobserve element after intersection', () => {
            const element = document.createElement('div');
            const loadFn = vi.fn();

            const observer = lazyLoadComponent(element, loadFn);

            observer.triggerIntersection([
                { target: element, isIntersecting: true }
            ]);

            expect(observer.elements.has(element)).toBe(false);
        });

        it('should not call loadFn when not intersecting', () => {
            const element = document.createElement('div');
            const loadFn = vi.fn();

            const observer = lazyLoadComponent(element, loadFn);

            observer.triggerIntersection([
                { target: element, isIntersecting: false }
            ]);

            expect(loadFn).not.toHaveBeenCalled();
        });
    });

    describe('lazyLoadAll()', () => {
        it('should observe multiple elements', () => {
            const elements = [
                document.createElement('div'),
                document.createElement('div'),
                document.createElement('div')
            ];
            const loadFn = vi.fn();

            const observer = lazyLoadAll(elements, loadFn);

            expect(observer.elements.size).toBe(3);
        });

        it('should call loadFn for each intersecting element', () => {
            const elements = [
                document.createElement('div'),
                document.createElement('div')
            ];
            const loadFn = vi.fn();

            const observer = lazyLoadAll(elements, loadFn);

            observer.triggerIntersection([
                { target: elements[0], isIntersecting: true },
                { target: elements[1], isIntersecting: true }
            ]);

            expect(loadFn).toHaveBeenCalledTimes(2);
        });
    });

    describe('lazyImage()', () => {
        it('should return img HTML with data-lazy-src', () => {
            const html = lazyImage('https://example.com/image.jpg', 'Test Image', 'img-class');

            expect(html).toContain('data-lazy-src="https://example.com/image.jpg"');
            expect(html).toContain('alt="Test Image"');
            expect(html).toContain('class="img-class lazy-image"');
            expect(html).toContain('loading="lazy"');
        });

        it('should use placeholder SVG as initial src', () => {
            const html = lazyImage('https://example.com/image.jpg');

            expect(html).toContain('src="data:image/svg+xml');
        });
    });

    describe('prefetchModule()', () => {
        it('should call import function', async () => {
            vi.useFakeTimers();
            const importFn = vi.fn().mockResolvedValue({});

            prefetchModule(importFn);

            // Fast-forward timers
            vi.runAllTimers();

            expect(importFn).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    describe('createViewLoader()', () => {
        it('should load and cache modules', async () => {
            const mockModule = {
                default: vi.fn((arg) => ({ html: `<div>${arg}</div>` }))
            };

            const viewModules = {
                test: vi.fn().mockResolvedValue(mockModule)
            };

            const loadView = createViewLoader(viewModules);

            // First load
            await loadView('test', 'arg1');
            expect(viewModules.test).toHaveBeenCalledTimes(1);

            // Second load should use cache
            await loadView('test', 'arg2');
            expect(viewModules.test).toHaveBeenCalledTimes(1);
        });

        it('should throw for unknown views', async () => {
            const loadView = createViewLoader({});

            await expect(loadView('unknown')).rejects.toThrow('Unknown view: unknown');
        });
    });
});
