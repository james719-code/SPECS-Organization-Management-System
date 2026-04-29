import { databases, storage, account } from './appwrite.js';
import { 
    DATABASE_ID,
    COLLECTION_ID_EVENTS,
    COLLECTION_ID_PAYMENTS,
    COLLECTION_ID_ATTENDANCE,
    COLLECTION_ID_STUDENTS,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_REVENUE,
    COLLECTION_ID_EXPENSES,
    COLLECTION_ID_STORIES,
    COLLECTION_ID_FILES,
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

export const CacheTags = {
    EVENTS: 'events',
    PAYMENTS: 'payments',
    ATTENDANCE: 'attendance',
    STUDENTS: 'students',
    ACCOUNTS: 'accounts',
    FINANCE: 'finance',
    FILES: 'files',
    STORIES: 'stories',
    DASHBOARD: 'dashboard',
    LANDING: 'landing'
};

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

function normalizeListOptions(options, legacyOrderDesc = true) {
    if (typeof options === 'number') {
        return { limit: options, offset: 0, orderDesc: legacyOrderDesc };
    }
    return options || {};
}

function clampPageSize(limit = DEFAULT_PAGE_SIZE) {
    return Math.min(Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
}

async function listAllDocuments(collectionId, queries = [], { pageSize = MAX_PAGE_SIZE, maxPages = 10 } = {}) {
    const documents = [];
    let total = 0;
    const limit = clampPageSize(pageSize);

    for (let page = 0; page < maxPages; page++) {
        const offset = page * limit;
        const result = await databases.listDocuments(DATABASE_ID, collectionId, [
            ...queries,
            Query.limit(limit),
            Query.offset(offset)
        ]);

        total = result.total;
        documents.push(...result.documents);

        if (documents.length >= result.total || result.documents.length < limit) break;
    }

    return {
        documents,
        total,
        limit,
        offset: 0,
        hasMore: documents.length < total
    };
}

async function countDocuments(collectionId, queries = []) {
    const result = await databases.listDocuments(DATABASE_ID, collectionId, [
        ...queries,
        Query.limit(1)
    ]);
    return result.total;
}

function sumMoney(documents) {
    return documents.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
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
        async list(options = {}) {
            try {
                const { limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = true } = normalizeListOptions(options, arguments[1]);
                const pageSize = clampPageSize(limit);
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
        async listAll({ orderDesc = 'date_to_held', maxPages = 10 } = {}) {
            try {
                const queries = [];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                return await listAllDocuments(COLLECTION_ID_EVENTS, queries, { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all events');
            }
        },
        async create(data) {
            try {
                const result = await databases.createDocument(DATABASE_ID, COLLECTION_ID_EVENTS, ID.unique(), data);
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to create event');
            }
        },
        async update(eventId, data) {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, data);
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to update event ${eventId}`);
            }
        },
        async delete(eventId) {
            try {
                const result = await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.ATTENDANCE, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to delete event ${eventId}`);
            }
        },
        async markEnded(eventId) {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, { event_ended: true });
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
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
        async list(options = {}) {
            try {
                const { limit = DEFAULT_PAGE_SIZE, offset = 0 } = normalizeListOptions(options);
                const pageSize = clampPageSize(limit);
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
        async listAll({ maxPages = 10 } = {}) {
            try {
                return await listAllDocuments(COLLECTION_ID_PAYMENTS, [], { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all payments');
            }
        },
        async create(data) {
            try {
                const result = await databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), data);
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to create payment');
            }
        },
        async update(paymentId, data) {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId, data);
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to update payment ${paymentId}`);
            }
        },
        async delete(paymentId) {
            try {
                const result = await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId);
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
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
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, payment.$id, { 
                    is_paid: true, 
                    date_paid: new Date().toISOString() 
                });
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
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
                const result = await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, ID.unique(), {
                    events: eventId,
                    students: studentId,
                    officers: officerId,
                    name_attendance: attendanceName
                });
                dataCache.invalidateTags([CacheTags.ATTENDANCE, CacheTags.EVENTS, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to create attendance record');
            }
        },
        async delete(attendanceId) {
            try {
                const result = await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, attendanceId);
                dataCache.invalidateTags([CacheTags.ATTENDANCE, CacheTags.EVENTS, CacheTags.DASHBOARD]);
                return result;
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
        async listStudents(options = {}) {
            try {
                const { limit = DEFAULT_PAGE_SIZE, offset = 0 } = normalizeListOptions(options);
                const pageSize = clampPageSize(limit);
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
        },
        async listAccounts({ limit = DEFAULT_PAGE_SIZE, offset = 0, type = null, orderDesc = null } = {}) {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (type) queries.unshift(Query.equal('type', type));
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list accounts');
            }
        },
        async listAllAccounts({ type = null, orderDesc = null, maxPages = 10 } = {}) {
            try {
                const queries = [];
                if (type) queries.push(Query.equal('type', type));
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                return await listAllDocuments(COLLECTION_ID_ACCOUNTS, queries, { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all accounts');
            }
        }
    },

    // --- STUDENT PROFILES ---
    students: {
        async listProfiles({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = null } = {}) {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list student profiles');
            }
        },
        async listAllProfiles({ orderDesc = null, maxPages = 10 } = {}) {
            try {
                const queries = [];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                return await listAllDocuments(COLLECTION_ID_STUDENTS, queries, { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all student profiles');
            }
        }
    },

    // --- DASHBOARD / SUMMARIES ---
    dashboard: {
        async getStats() {
            try {
                const now = new Date();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(now.getDate() - 30);

                const [accountsRes, upcomingEventsCount, filesCount, revenueRes, expensesRes] = await Promise.all([
                    listAllDocuments(COLLECTION_ID_ACCOUNTS, [], { maxPages: 10 }),
                    countDocuments(COLLECTION_ID_EVENTS, [Query.greaterThan('date_to_held', now.toISOString())]),
                    countDocuments(COLLECTION_ID_FILES),
                    listAllDocuments(COLLECTION_ID_REVENUE, [], { maxPages: 4 }),
                    listAllDocuments(COLLECTION_ID_EXPENSES, [], { maxPages: 4 })
                ]);

                const accounts = accountsRes.documents;
                const nonAdminAccounts = accounts.filter(user => user.type !== 'admin');
                const newUsersLast30Days = accounts.filter(user => new Date(user.$createdAt) > thirtyDaysAgo).length;
                const previousTotal = accounts.length - newUsersLast30Days;

                return {
                    accounts,
                    totalUsers: accounts.length,
                    pendingVerifications: nonAdminAccounts.filter(user => !user.verified).length,
                    upcomingEventsCount,
                    filesCount,
                    totalRevenue: sumMoney(revenueRes.documents),
                    totalExpenses: sumMoney(expensesRes.documents),
                    newUsersLast30Days,
                    growthPercentage: previousTotal > 0 ? Number(((newUsersLast30Days / previousTotal) * 100).toFixed(1)) : 100,
                    hasMore: accountsRes.hasMore || revenueRes.hasMore || expensesRes.hasMore
                };
            } catch (error) {
                throw createApiError(error, 'Failed to load dashboard stats');
            }
        }
    },

    // --- FINANCE ---
    finance: {
        async getRangeSummary({ start, end, maxPages = 10 } = {}) {
            try {
                const startIso = start instanceof Date ? start.toISOString() : start;
                const endIso = end instanceof Date ? end.toISOString() : end;
                const [revenue, expenses, events] = await Promise.all([
                    listAllDocuments(COLLECTION_ID_REVENUE, [
                        Query.greaterThanEqual('date_earned', startIso),
                        Query.lessThanEqual('date_earned', endIso)
                    ], { maxPages }),
                    listAllDocuments(COLLECTION_ID_EXPENSES, [
                        Query.greaterThanEqual('date_buy', startIso),
                        Query.lessThanEqual('date_buy', endIso)
                    ], { maxPages }),
                    listAllDocuments(COLLECTION_ID_EVENTS, [], { maxPages: 2 })
                ]);

                return {
                    revenue: revenue.documents,
                    expenses: expenses.documents,
                    events: events.documents,
                    totalRevenue: sumMoney(revenue.documents),
                    totalExpenses: sumMoney(expenses.documents),
                    hasMore: revenue.hasMore || expenses.hasMore || events.hasMore
                };
            } catch (error) {
                throw createApiError(error, 'Failed to load finance range summary');
            }
        }
    },

    // --- STORIES ---
    stories: {
        async list({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = true } = {}) {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc('$createdAt'));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STORIES, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list stories');
            }
        }
    },

    // --- STORAGE ---
    files: {
        async listDocuments({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = '$createdAt', extraQueries = [] } = {}) {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [...extraQueries, Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, queries);
                return createPaginatedResponse(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list files');
            }
        },
        getFilePreview(fileId, width = 600, height = 400) {
            // Use centralized image cache
            return imageCache.get(BUCKET_ID_EVENT_IMAGES, fileId, width, height);
        },
        async uploadEventImage(file) {
            try {
                const result = await storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), file);
                dataCache.invalidateTags([CacheTags.FILES, CacheTags.EVENTS, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to upload event image');
            }
        },
        async deleteEventImage(fileId) {
            try {
                // Clear image cache when deleting
                imageCache.clear(fileId);
                const result = await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, fileId);
                dataCache.invalidateTags([CacheTags.FILES, CacheTags.EVENTS, CacheTags.LANDING]);
                return result;
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
        clearTags(tags) {
            return dataCache.invalidateTags(tags);
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
        async list(options = {}, ttl = 2 * 60 * 1000) {
            const { limit = 100, offset = 0, orderDesc = true } = normalizeListOptions(options, arguments[1]);
            if (typeof options === 'number' && typeof arguments[1] === 'boolean') ttl = 2 * 60 * 1000;
            const cacheKey = generateCacheKey('events_list', { limit, offset, orderDesc });
            return dataCache.getOrFetch(cacheKey, () => api.events.list({ limit, offset, orderDesc }), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.EVENTS, CacheTags.LANDING]
            });
        },
        /**
         * Get single event with caching
         * @param {string} eventId - Event ID
         * @param {number} ttl - Cache TTL in milliseconds (default: 5 minutes)
         */
        async get(eventId, ttl = 5 * 60 * 1000) {
            const cacheKey = generateCacheKey('event', { id: eventId });
            return dataCache.getOrFetch(cacheKey, () => api.events.get(eventId), {
                ttl,
                staleTtl: 10 * 60 * 1000,
                tags: [CacheTags.EVENTS]
            });
        },
        async listAll(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('events_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.events.listAll(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.EVENTS, CacheTags.LANDING]
            });
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
        async list(options = {}, ttl = 60 * 1000) {
            const { limit = 100, offset = 0 } = normalizeListOptions(options);
            const cacheKey = generateCacheKey('payments_list', { limit, offset });
            return dataCache.getOrFetch(cacheKey, () => api.payments.list({ limit, offset }), {
                ttl,
                staleTtl: 2 * 60 * 1000,
                tags: [CacheTags.PAYMENTS, CacheTags.FINANCE]
            });
        },
        /**
         * List payments for a student with caching
         * @param {string} studentId - Student ID
         * @param {number} ttl - Cache TTL in milliseconds (default: 1 minute)
         */
        async listForStudent(studentId, ttl = 60 * 1000) {
            const cacheKey = generateCacheKey('payments_student', { studentId });
            return dataCache.getOrFetch(cacheKey, () => api.payments.listForStudent(studentId), {
                ttl,
                staleTtl: 2 * 60 * 1000,
                tags: [CacheTags.PAYMENTS, CacheTags.FINANCE]
            });
        },
        async listAll(options = {}, ttl = 60 * 1000) {
            const cacheKey = generateCacheKey('payments_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.payments.listAll(options), {
                ttl,
                staleTtl: 2 * 60 * 1000,
                tags: [CacheTags.PAYMENTS, CacheTags.FINANCE]
            });
        }
    },

    users: {
        /**
         * Get current user with caching
         * @param {number} ttl - Cache TTL in milliseconds (default: 5 minutes)
         */
        async getCurrent(ttl = 5 * 60 * 1000) {
            const cacheKey = 'current_user';
            return dataCache.getOrFetch(cacheKey, () => api.users.getCurrent(), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS]
            });
        },
        /**
         * Get student profile with caching
         * @param {string} studentId - Student ID
         * @param {number} ttl - Cache TTL in milliseconds (default: 5 minutes)
         */
        async getStudentProfile(studentId, ttl = 5 * 60 * 1000) {
            const cacheKey = generateCacheKey('student_profile', { studentId });
            return dataCache.getOrFetch(cacheKey, () => api.users.getStudentProfile(studentId), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS]
            });
        },
        /**
         * List students with caching
         * @param {Object} options - Query options
         * @param {number} options.limit - Page size (default: 100)
         * @param {number} options.offset - Offset for pagination (default: 0)
         * @param {number} ttl - Cache TTL in milliseconds (default: 2 minutes)
         */
        async listStudents(options = {}, ttl = 2 * 60 * 1000) {
            const { limit = 100, offset = 0 } = normalizeListOptions(options);
            const cacheKey = generateCacheKey('students_list', { limit, offset });
            return dataCache.getOrFetch(cacheKey, () => api.users.listStudents({ limit, offset }), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS, CacheTags.ACCOUNTS]
            });
        },
        async listAccounts(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('accounts_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.users.listAccounts(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS, CacheTags.STUDENTS]
            });
        },
        async listAllAccounts(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('accounts_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.users.listAllAccounts(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS, CacheTags.STUDENTS]
            });
        }
    },

    dashboard: {
        async getStats(ttl = 2 * 60 * 1000) {
            return dataCache.getOrFetch('dashboard_stats', () => api.dashboard.getStats(), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.DASHBOARD, CacheTags.ACCOUNTS, CacheTags.EVENTS, CacheTags.FINANCE, CacheTags.FILES]
            });
        }
    },

    finance: {
        async getRangeSummary({ start, end, maxPages = 10 } = {}, ttl = 2 * 60 * 1000) {
            const startKey = start instanceof Date ? start.toISOString() : start;
            const endKey = end instanceof Date ? end.toISOString() : end;
            const cacheKey = generateCacheKey('finance_range', { start: startKey, end: endKey, maxPages });
            return dataCache.getOrFetch(cacheKey, () => api.finance.getRangeSummary({ start, end, maxPages }), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.FINANCE, CacheTags.DASHBOARD]
            });
        }
    },

    students: {
        async listProfiles(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('student_profiles_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.students.listProfiles(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS]
            });
        },
        async listAllProfiles(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('student_profiles_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.students.listAllProfiles(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS]
            });
        }
    },

    files: {
        async listDocuments(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('files_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.files.listDocuments(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.FILES]
            });
        }
    },

    stories: {
        async list(options = {}, ttl = 2 * 60 * 1000) {
            const cacheKey = generateCacheKey('stories_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.stories.list(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STORIES, CacheTags.LANDING]
            });
        }
    }
};
