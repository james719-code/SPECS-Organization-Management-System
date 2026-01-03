/**
 * Test setup file for Vitest
 * Configures global mocks and test environment
 */

import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_APPWRITE_ENDPOINT', 'https://test.appwrite.io/v1');
vi.stubEnv('VITE_APPWRITE_PROJECT_ID', 'test-project');
vi.stubEnv('VITE_USE_MOCK_DATA', 'true');

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
        this.elements = new Set();
    }

    observe(element) {
        this.elements.add(element);
    }

    unobserve(element) {
        this.elements.delete(element);
    }

    disconnect() {
        this.elements.clear();
    }

    takeRecords() {
        return [];
    }

    // Helper to trigger intersection
    triggerIntersection(entries) {
        this.callback(entries, this);
    }
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() { }
    unobserve() { }
    disconnect() { }
}

global.ResizeObserver = MockResizeObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((index) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock requestIdleCallback
global.requestIdleCallback = (callback) => {
    return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
};

global.cancelIdleCallback = (id) => {
    clearTimeout(id);
};

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
});
