/**
 * Example usage of the centralized caching system
 * 
 * This file demonstrates various ways to use the cache in your application.
 * Copy and adapt these patterns for your specific use cases.
 */

import { imageCache, dataCache, cache, generateCacheKey } from './cache.js';
import { api, cachedApi } from './api.js';
import { databases, Query } from './appwrite.js';
import { DATABASE_ID, COLLECTION_ID_EVENTS, BUCKET_ID_EVENT_IMAGES } from './constants.js';

// ============================================================================
// EXAMPLE 1: Basic Image Caching in Event Cards
// ============================================================================

export function renderEventCard(event) {
    // Get cached image URL (or generate if not cached)
    const imageUrl = imageCache.get(
        BUCKET_ID_EVENT_IMAGES,
        event.image_file,
        400,  // width
        250   // height
    );

    return `
        <div class="event-card">
            <img src="${imageUrl}" alt="${event.event_name}">
            <h3>${event.event_name}</h3>
            <p>${event.description}</p>
        </div>
    `;
}

// ============================================================================
// EXAMPLE 2: Preloading Images for Better Performance
// ============================================================================

export async function loadEventsList() {
    // Fetch events
    const response = await cachedApi.events.list(10);
    
    // Preload all images in parallel
    const imagePreloadData = response.documents
        .filter(event => event.image_file)
        .map(event => ({
            bucketId: BUCKET_ID_EVENT_IMAGES,
            fileId: event.image_file,
            width: 400,
            height: 250
        }));
    
    imageCache.preload(imagePreloadData);
    
    // Now render - images will load instantly from cache
    return response.documents.map(event => renderEventCard(event));
}

// ============================================================================
// EXAMPLE 3: Using cachedApi for Common Operations
// ============================================================================

export async function loadDashboardData() {
    try {
        // All these calls are automatically cached
        const [events, user, students] = await Promise.all([
            cachedApi.events.list(5, true, 2 * 60 * 1000),  // Cache for 2 min
            cachedApi.users.getCurrent(),                     // Cache for 5 min
            cachedApi.users.listStudents()                    // Cache for 2 min
        ]);

        return { events, user, students };
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        throw error;
    }
}

// ============================================================================
// EXAMPLE 4: Custom Data Caching with getOrFetch
// ============================================================================

export async function getEventStatistics(eventId) {
    const cacheKey = generateCacheKey('event_stats', { eventId });
    
    return await dataCache.getOrFetch(
        cacheKey,
        async () => {
            // This expensive calculation only runs if not cached
            const [attendance, payments] = await Promise.all([
                databases.listDocuments(DATABASE_ID, 'attendance', [
                    Query.equal('events', eventId),
                    Query.limit(1000)
                ]),
                databases.listDocuments(DATABASE_ID, 'payments', [
                    Query.equal('events', eventId),
                    Query.limit(1000)
                ])
            ]);

            return {
                totalAttendees: attendance.total,
                totalRevenue: payments.documents.reduce((sum, p) => sum + p.price, 0),
                timestamp: Date.now()
            };
        },
        5 * 60 * 1000  // Cache for 5 minutes
    );
}

// ============================================================================
// EXAMPLE 5: Cache Invalidation After Mutations
// ============================================================================

export async function createNewEvent(eventData) {
    try {
        // Create the event
        const newEvent = await api.events.create(eventData);
        
        // Clear all event-related caches
        api.cache.clearByPattern('events_.*');
        
        console.log('Event created and cache cleared');
        return newEvent;
    } catch (error) {
        console.error('Failed to create event:', error);
        throw error;
    }
}

export async function updateEvent(eventId, updates) {
    try {
        // Update the event
        const updatedEvent = await api.events.update(eventId, updates);
        
        // Clear specific event cache
        api.cache.clearKey(generateCacheKey('event', { id: eventId }));
        
        // Clear event lists
        api.cache.clearByPattern('events_list.*');
        api.cache.clearByPattern('events_upcoming.*');
        api.cache.clearByPattern('events_past.*');
        
        console.log('Event updated and related caches cleared');
        return updatedEvent;
    } catch (error) {
        console.error('Failed to update event:', error);
        throw error;
    }
}

export async function deleteEvent(eventId, fileId) {
    try {
        // Delete the event
        await api.events.delete(eventId);
        
        // Delete the image file if exists
        if (fileId) {
            await api.files.deleteEventImage(fileId); // Also clears image cache
        }
        
        // Clear all event-related data caches
        api.cache.clearAll();
        
        console.log('Event deleted and all caches cleared');
    } catch (error) {
        console.error('Failed to delete event:', error);
        throw error;
    }
}

// ============================================================================
// EXAMPLE 6: Cache Monitoring and Diagnostics
// ============================================================================

export function logCacheStats() {
    const stats = cache.getAllStats();
    
    console.log('=== Cache Statistics ===');
    console.log('Images:');
    console.log(`  - Entries: ${stats.images.entries}`);
    console.log(`  - Size: ${stats.images.totalSizeMB} MB / ${stats.images.maxSizeMB} MB`);
    console.log('Data:');
    console.log(`  - Entries: ${stats.data.entries}`);
    console.log(`  - Expired: ${stats.data.expired}`);
    console.log(`  - Size: ${stats.data.totalSizeMB} MB`);
    console.log('=======================');
    
    return stats;
}

// ============================================================================
// EXAMPLE 7: Clear Cache on Logout
// ============================================================================

export async function logout() {
    try {
        // Perform logout
        await account.deleteSession('current');
        
        // Clear all caches
        cache.clearAll();
        
        console.log('Logged out and all caches cleared');
        
        // Redirect to login
        window.location.hash = '#login';
    } catch (error) {
        console.error('Logout failed:', error);
        throw error;
    }
}

// ============================================================================
// EXAMPLE 8: Conditional Caching Based on User Role
// ============================================================================

export async function getEventsForUser(userRole) {
    // Different cache duration based on role
    const cacheTTL = userRole === 'student' 
        ? 5 * 60 * 1000   // Students: 5 minutes
        : 2 * 60 * 1000;  // Officers/Admin: 2 minutes
    
    return await cachedApi.events.list(100, true, cacheTTL);
}

// ============================================================================
// EXAMPLE 9: Manual Cache Management for Complex Scenarios
// ============================================================================

export async function refreshEventCache() {
    // Remove old cache
    dataCache.clear('events_.*');
    
    // Fetch fresh data
    const events = await api.events.list(100);
    
    // Manually cache with custom key
    const cacheKey = generateCacheKey('events_list_refreshed', { 
        timestamp: Date.now() 
    });
    dataCache.set(cacheKey, events, 10 * 60 * 1000); // 10 minutes
    
    return events;
}

// ============================================================================
// EXAMPLE 10: Optimistic Caching for Better UX
// ============================================================================

export async function markPaymentAsPaid(paymentId, paymentData, recorderId, studentName) {
    // Optimistically update cache before API call
    const cacheKey = generateCacheKey('payments_student', { 
        studentId: paymentData.students 
    });
    
    const cachedPayments = dataCache.get(cacheKey);
    if (cachedPayments) {
        // Update payment in cache
        const updatedPayments = {
            ...cachedPayments,
            documents: cachedPayments.documents.map(p => 
                p.$id === paymentId 
                    ? { ...p, is_paid: true, date_paid: new Date().toISOString() }
                    : p
            )
        };
        dataCache.set(cacheKey, updatedPayments, 60 * 1000);
    }
    
    try {
        // Make actual API call
        const result = await api.payments.markPaid(
            paymentData, 
            recorderId, 
            studentName
        );
        
        // Refresh cache with real data
        await cachedApi.payments.listForStudent(paymentData.students, 60 * 1000);
        
        return result;
    } catch (error) {
        // Revert optimistic update on error
        api.cache.clearKey(cacheKey);
        throw error;
    }
}

// ============================================================================
// EXAMPLE 11: Batch Image URL Generation
// ============================================================================

export function generateEventCardImages(events) {
    return events.map(event => {
        const thumbnailUrl = imageCache.get(
            BUCKET_ID_EVENT_IMAGES, 
            event.image_file, 
            300, 
            200
        );
        
        const fullUrl = imageCache.get(
            BUCKET_ID_EVENT_IMAGES, 
            event.image_file, 
            800, 
            600
        );
        
        return {
            ...event,
            thumbnailUrl,
            fullUrl
        };
    });
}

// ============================================================================
// EXAMPLE 12: Cache-First Strategy with Fallback
// ============================================================================

export async function getEventDetails(eventId) {
    const cacheKey = generateCacheKey('event_details', { eventId });
    
    // Try cache first
    let eventData = dataCache.get(cacheKey);
    
    if (eventData) {
        console.log('Serving from cache');
        return eventData;
    }
    
    // Cache miss - fetch from API
    try {
        eventData = await api.events.get(eventId);
        dataCache.set(cacheKey, eventData, 5 * 60 * 1000);
        console.log('Fetched from API and cached');
        return eventData;
    } catch (error) {
        console.error('Failed to fetch event:', error);
        throw error;
    }
}

// ============================================================================
// Export for easy testing in console
// ============================================================================

if (typeof window !== 'undefined') {
    window.cacheExamples = {
        logStats: logCacheStats,
        clearAll: () => cache.clearAll(),
        getStats: () => cache.getAllStats()
    };
    
    console.log('Cache examples loaded! Try: cacheExamples.logStats()');
}
