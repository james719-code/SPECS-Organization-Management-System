import { databases, storage, account } from './appwrite.js';
import { 
    DATABASE_ID,
    COLLECTION_ID_EVENTS,
    COLLECTION_ID_PAYMENTS,
    COLLECTION_ID_ATTENDANCE,
    COLLECTION_ID_STUDENTS,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_REVENUE,
    BUCKET_ID_EVENT_IMAGES
} from './constants.js';
import { Query, ID } from 'appwrite';
import { dataCache, imageCache, generateCacheKey } from './cache.js';
import { createApiError, ErrorCodes, ApiError } from './errors.js';

// Re-export error utilities for consumers
export { ApiError, ErrorCodes };

/**
 * Default page size for paginated queries
 */
const DEFAULT_PAGE_SIZE = 100;

/**
 * Maximum allowed page size
 */
const MAX_PAGE_SIZE = 500;

/**
 * Helper to create paginated response
 * @param {Object} result - Appwrite list result with documents and total
 * @param {number} limit - Page size used
 * @param {number} offset - Offset used
 * @returns {Object} Paginated response with hasMore flag
 */
function createPaginatedResponse(result, limit, offset) {
    return {
        documents: result.documents,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.documents.length < result.total
    };
}

export const api = {
    // --- EVENTS ---
    events: {
        /**
         * List events with pagination
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100, max: 500)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @param {boolean} options.orderDesc - Order by date descending (default: true)
         * @returns {Promise<Object>} Paginated response with documents, total, hasMore
         */
        async list({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = true } = {}) {
            try {
                const pageSize = Math.min(limit, MAX_PAGE_SIZE);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc('date_to_held'));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list events');
            }
        },
        async get(eventId) {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
            } catch (error) {
                throw createApiError(error, `Failed to get event ${eventId}`);
            }
        },
        async create(data) {
            try {
                return await databases.createDocument(DATABASE_ID, COLLECTION_ID_EVENTS, ID.unique(), data);
            } catch (error) {
                throw createApiError(error, 'Failed to create event');
            }
        },
        async update(eventId, data) {
            try {
                return await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, data);
            } catch (error) {
                throw createApiError(error, `Failed to update event ${eventId}`);
            }
        },
        async delete(eventId) {
            try {
                return await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
            } catch (error) {
                throw createApiError(error, `Failed to delete event ${eventId}`);
            }
        },
        async markEnded(eventId) {
            try {
                return await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, { event_ended: true });
            } catch (error) {
                throw createApiError(error, `Failed to mark event ${eventId} as ended`);
            }
        }
    },

    // --- PAYMENTS ---
    payments: {
        /**
         * List all payments with pagination
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100, max: 500)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @returns {Promise<Object>} Paginated response
         */
        async list({ limit = DEFAULT_PAGE_SIZE, offset = 0 } = {}) {
            try {
                const pageSize = Math.min(limit, MAX_PAGE_SIZE);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list payments');
            }
        },
        async listForStudent(studentId) {
            try {
                return await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [
                    Query.equal('students', studentId),
                    Query.orderDesc('date_paid'),
                    Query.limit(100)
                ]);
            } catch (error) {
                throw createApiError(error, `Failed to list payments for student ${studentId}`);
            }
        },
        async create(data) {
            try {
                return await databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), data);
            } catch (error) {
                throw createApiError(error, 'Failed to create payment');
            }
        },
        async update(paymentId, data) {
            try {
                return await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId, data);
            } catch (error) {
                throw createApiError(error, `Failed to update payment ${paymentId}`);
            }
        },
        async delete(paymentId) {
            try {
                return await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId);
            } catch (error) {
                throw createApiError(error, `Failed to delete payment ${paymentId}`);
            }
        },
        async markPaid(payment, recorderId, studentName) {
            try {
                // Create Revenue Record
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_REVENUE, ID.unique(), {
                    name: `${payment.item_name} (Paid by ${studentName})`,
                    isEvent: payment.is_event,
                    event: (payment.is_event && payment.events) ? ((payment.events.$id) ? payment.events.$id : payment.events) : null,
                    activity: payment.is_event ? null : payment.activity,
                    quantity: payment.quantity,
                    price: payment.price,
                    date_earned: new Date().toISOString(),
                    recorder: recorderId
                });
                // Update Payment Record
                return await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, payment.$id, { 
                    is_paid: true, 
                    date_paid: new Date().toISOString() 
                });
            } catch (error) {
                throw createApiError(error, `Failed to mark payment ${payment.$id} as paid`);
            }
        }
    },

    // --- ATTENDANCE ---
    attendance: {
        async listForStudent(studentId) {
            try {
                return await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDANCE, [
                    Query.equal('students', studentId),
                    Query.orderDesc('$createdAt')
                ]);
            } catch (error) {
                throw createApiError(error, `Failed to list attendance for student ${studentId}`);
            }
        },
        /**
         * List attendance for an event with pagination
         * @param {string} eventId - Event ID
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100, max: 500)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @returns {Promise<Object>} Paginated response
         */
        async listForEvent(eventId, { limit = DEFAULT_PAGE_SIZE, offset = 0 } = {}) {
            try {
                const pageSize = Math.min(limit, MAX_PAGE_SIZE);
                const queries = [
                    Query.equal('events', eventId),
                    Query.limit(pageSize),
                    Query.offset(offset)
                ];
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDANCE, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, `Failed to list attendance for event ${eventId}`);
            }
        },
        async create(eventId, studentId, officerId, attendanceName) {
            try {
                return await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, ID.unique(), {
                    events: eventId,
                    students: studentId,
                    officers: officerId,
                    name_attendance: attendanceName
                });
            } catch (error) {
                throw createApiError(error, 'Failed to create attendance record');
            }
        },
        async delete(attendanceId) {
            try {
                return await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, attendanceId);
            } catch (error) {
                throw createApiError(error, `Failed to delete attendance ${attendanceId}`);
            }
        }
    },

    // --- USERS (Students/Accounts) ---
    users: {
        async getCurrent() {
            try {
                return await account.get();
            } catch (error) {
                throw createApiError(error, 'Failed to get current user');
            }
        },
        async getAccount(accountId) {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, accountId);
            } catch (error) {
                throw createApiError(error, `Failed to get account ${accountId}`);
            }
        },
        async getStudentProfile(studentId) {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentId);
            } catch (error) {
                throw createApiError(error, `Failed to get student profile ${studentId}`);
            }
        },
        /**
         * List students with pagination
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100, max: 500)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @returns {Promise<Object>} Paginated response
         */
        async listStudents({ limit = DEFAULT_PAGE_SIZE, offset = 0 } = {}) {
            try {
                const pageSize = Math.min(limit, MAX_PAGE_SIZE);
                const queries = [
                    Query.equal('type', 'student'),
                    Query.limit(pageSize),
                    Query.offset(offset)
                ];
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list students');
            }
        }
    },

    // --- STORAGE ---
    files: {
        getFilePreview(fileId, width = 600, height = 400) {
            // Use centralized image cache
            return imageCache.get(BUCKET_ID_EVENT_IMAGES, fileId, width, height);
        },
        async uploadEventImage(file) {
            try {
                return await storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), file);
            } catch (error) {
                throw createApiError(error, 'Failed to upload event image');
            }
        },
        async deleteEventImage(fileId) {
            try {
                // Clear image cache when deleting
                imageCache.clear(fileId);
                return await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, fileId);
            } catch (error) {
                throw createApiError(error, `Failed to delete event image ${fileId}`);
            }
        }
    },

    // --- CACHE UTILITIES ---
    cache: {
        /**
         * Clear all cached data (useful after mutations like create/update/delete)
         */
        clearAll() {
            dataCache.clear();
        },
        /**
         * Clear data cache by pattern
         * @param {string} pattern - Regex pattern to match cache keys
         */
        clearByPattern(pattern) {
            dataCache.clear(pattern);
        },
        /**
         * Clear specific cache key
         * @param {string} key - Cache key to clear
         */
        clearKey(key) {
            dataCache.remove(key);
        },
        /**
         * Get cache statistics
         */
        getStats() {
            return {
                images: imageCache.getStats(),
                data: dataCache.getStats()
            };
        }
    }
};

/**
 * Cache-enabled API wrapper
 * Use these methods when you want automatic caching of API responses
 */
export const cachedApi = {
    events: {
        /**
         * List events with caching
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @param {boolean} options.orderDesc - Order by date descending (default: true)
         * @param {number} ttl - Cache TTL in milliseconds (default: 2 minutes)
         */
        async list({ limit = 100, offset = 0, orderDesc = true } = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('events_list', { limit, offset, orderDesc });
            return dataCache.getOrFetch(cacheKey, () => api.events.list({ limit, offset, orderDesc }), ttl);
        },
        /**
         * Get single event with caching
         * @param {string} eventId - Event ID
         * @param {number} ttl - Cache TTL in milliseconds (default: 5 minutes)
         */
        async get(eventId, ttl = 5 * 60 * 1000) {
            const cacheKey = generateCacheKey('event', { id: eventId });
            return dataCache.getOrFetch(cacheKey, () => api.events.get(eventId), ttl);
        }
    },

    payments: {
        /**
         * List payments with caching
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @param {number} ttl - Cache TTL in milliseconds (default: 1 minute)
         */
        async list({ limit = 100, offset = 0 } = {}, ttl = 60 * 1000) {
            const cacheKey = generateCacheKey('payments_list', { limit, offset });
            return dataCache.getOrFetch(cacheKey, () => api.payments.list({ limit, offset }), ttl);
        },
        /**
         * List payments for a student with caching
         * @param {string} studentId - Student ID
         * @param {number} ttl - Cache TTL in milliseconds (default: 1 minute)
         */
        async listForStudent(studentId, ttl = 60 * 1000) {
            const cacheKey = generateCacheKey('payments_student', { studentId });
            return dataCache.getOrFetch(cacheKey, () => api.payments.listForStudent(studentId), ttl);
        }
    },

    users: {
        /**
         * Get current user with caching
         * @param {number} ttl - Cache TTL in milliseconds (default: 5 minutes)
         */
        async getCurrent(ttl = 5 * 60 * 1000) {
            const cacheKey = 'current_user';
            return dataCache.getOrFetch(cacheKey, () => api.users.getCurrent(), ttl);
        },
        /**
         * Get student profile with caching
         * @param {string} studentId - Student ID
         * @param {number} ttl - Cache TTL in milliseconds (default: 5 minutes)
         */
        async getStudentProfile(studentId, ttl = 5 * 60 * 1000) {
            const cacheKey = generateCacheKey('student_profile', { studentId });
            return dataCache.getOrFetch(cacheKey, () => api.users.getStudentProfile(studentId), ttl);
        },
        /**
         * List students with caching
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @param {number} ttl - Cache TTL in milliseconds (default: 2 minutes)
         */
        async listStudents({ limit = 100, offset = 0 } = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('students_list', { limit, offset });
            return dataCache.getOrFetch(cacheKey, () => api.users.listStudents({ limit, offset }), ttl);
            return dataCache.getOrFetch(cacheKey, () => api.users.listStudents(), ttl);
        }
    }
};
