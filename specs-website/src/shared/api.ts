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
    COLLECTION_ID_OFFICERS,
    BUCKET_ID_EVENT_IMAGES
} from './constants.js';
import { Query, ID } from 'appwrite';
import { dataCache, imageCache, generateCacheKey } from './cache.js';
import { createApiError, ErrorCodes, ApiError } from './errors.js';
import { 
  EventDoc, 
  PaymentDoc, 
  AttendanceDoc, 
  StudentDoc, 
  AccountDoc, 
  RevenueDoc, 
  ExpenseDoc, 
  StoryDoc, 
  FileDoc,
  OfficerDoc
} from '../types/database';

export { ApiError, ErrorCodes };

const DEFAULT_PAGE_SIZE = 100;
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
} as const;

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderDesc?: boolean | string;
  includeArchived?: boolean;
}

function createPaginatedResponse<T>(result: any, limit: number, offset: number): PaginatedResponse<T> {
    return {
        documents: result.documents,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.documents.length < result.total
    };
}

function normalizeListOptions(options: any, legacyOrderDesc = true): ListOptions {
    if (typeof options === 'number') {
        return { limit: options, offset: 0, orderDesc: legacyOrderDesc };
    }
    return options || {};
}

function clampPageSize(limit = DEFAULT_PAGE_SIZE): number {
    return Math.min(Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
}

async function listAllDocuments<T>(collectionId: string, queries: any[] = [], { pageSize = MAX_PAGE_SIZE, maxPages = 10 } = {}): Promise<PaginatedResponse<T>> {
    const documents: T[] = [];
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
        documents.push(...(result.documents as T[]));

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

async function countDocuments(collectionId: string, queries: any[] = []): Promise<number> {
    const result = await databases.listDocuments(DATABASE_ID, collectionId, [
        ...queries,
        Query.limit(1)
    ]);
    return result.total;
}

function sumMoney(documents: any[]): number {
    return documents.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
}

export const api = {
    // --- EVENTS ---
    events: {
        async list(options: ListOptions = {}): Promise<PaginatedResponse<EventDoc>> {
            try {
                const { limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = true, includeArchived = false } = normalizeListOptions(options);
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc('date_to_held'));
                if (!includeArchived) {
                    queries.push(Query.notEqual('archived', true));
                }
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, queries);
                return createPaginatedResponse<EventDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list events');
            }
        },
        async get(eventId: string): Promise<EventDoc> {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
            } catch (error) {
                throw createApiError(error, `Failed to get event ${eventId}`);
            }
        },
        async listAll({ orderDesc = 'date_to_held', maxPages = 10, includeArchived = false } = {}): Promise<PaginatedResponse<EventDoc>> {
            try {
                const queries: any[] = [];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                if (!includeArchived) {
                    queries.push(Query.notEqual('archived', true));
                }
                return await listAllDocuments<EventDoc>(COLLECTION_ID_EVENTS, queries, { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all events');
            }
        },
        async create(data: Partial<EventDoc>): Promise<EventDoc> {
            try {
                const result = await databases.createDocument(DATABASE_ID, COLLECTION_ID_EVENTS, ID.unique(), data);
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to create event');
            }
        },
        async update(eventId: string, data: Partial<EventDoc>): Promise<EventDoc> {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, data);
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to update event ${eventId}`);
            }
        },
        async delete(eventId: string): Promise<any> {
            try {
                const result = await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.ATTENDANCE, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to delete event ${eventId}`);
            }
        },
        async markEnded(eventId: string): Promise<EventDoc> {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, { event_ended: true });
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to mark event ${eventId} as ended`);
            }
        },
        async archive(eventId: string, archived = true): Promise<EventDoc> {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, { archived });
                dataCache.invalidateTags([CacheTags.EVENTS, CacheTags.DASHBOARD, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to archive event ${eventId}`);
            }
        }
    },

    // --- PAYMENTS ---
    payments: {
        async list(options: ListOptions = {}): Promise<PaginatedResponse<PaymentDoc>> {
            try {
                const { limit = DEFAULT_PAGE_SIZE, offset = 0 } = normalizeListOptions(options);
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, queries);
                return createPaginatedResponse<PaymentDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list payments');
            }
        },
        async listForStudent(studentId: string): Promise<any> {
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
        async listAll({ maxPages = 10 } = {}): Promise<PaginatedResponse<PaymentDoc>> {
            try {
                return await listAllDocuments<PaymentDoc>(COLLECTION_ID_PAYMENTS, [], { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all payments');
            }
        },
        async create(data: Partial<PaymentDoc>): Promise<PaymentDoc> {
            try {
                const result = await databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), data);
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to create payment');
            }
        },
        async update(paymentId: string, data: Partial<PaymentDoc>): Promise<PaymentDoc> {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId, data);
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to update payment ${paymentId}`);
            }
        },
        async delete(paymentId: string): Promise<any> {
            try {
                // Fetch the payment document first to check if it was paid
                const payment = await databases.getDocument<PaymentDoc>(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId);
                
                if (payment.is_paid) {
                    // Fetch student name to match the revenue document label
                    let studentName = 'Student';
                    if (payment.students) {
                        const sId = typeof payment.students === 'object' ? payment.students.$id : payment.students;
                        try {
                            const student = await databases.getDocument<StudentDoc>(DATABASE_ID, COLLECTION_ID_STUDENTS, sId);
                            studentName = student.name;
                        } catch (err) {
                            console.warn('Failed to fetch student profile for revenue deletion lookup:', err);
                        }
                    }

                    // Query the revenue collection to locate the connected finance record
                    const targetName = `${payment.item_name} (Paid by ${studentName})`;
                    const revenues = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [
                        Query.equal('name', targetName),
                        Query.equal('price', payment.price),
                        Query.equal('quantity', payment.quantity)
                    ]);

                    if (revenues.documents.length > 0) {
                        // Delete the connected revenue document
                        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_REVENUE, revenues.documents[0].$id);
                    }
                }

                const result = await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId);
                dataCache.invalidateTags([CacheTags.PAYMENTS, CacheTags.FINANCE, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to delete payment ${paymentId}`);
            }
        },
        async markPaid(payment: PaymentDoc, recorderId: string, studentName: string, modalPaid?: 'cash' | 'gcash' | null, officerId?: string | null, verifierName?: string | null): Promise<PaymentDoc> {
            try {
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_REVENUE, ID.unique(), {
                    name: `${payment.item_name} (Paid by ${studentName})`,
                    isEvent: payment.is_event,
                    event: (payment.is_event && payment.events) ? (typeof payment.events === 'object' ? payment.events.$id : payment.events) : null,
                    activity: payment.is_event ? null : payment.activity,
                    quantity: payment.quantity,
                    price: payment.price,
                    date_earned: new Date().toISOString(),
                    recorder: recorderId
                });
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, payment.$id, { 
                    is_paid: true, 
                    date_paid: new Date().toISOString(),
                    modal_paid: modalPaid || null,
                    officers: officerId || null,
                    verified_by_name: verifierName || null
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
        async listForStudent(studentId: string): Promise<any> {
            try {
                return await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDANCE, [
                    Query.equal('students', studentId),
                    Query.orderDesc('$createdAt')
                ]);
            } catch (error) {
                throw createApiError(error, `Failed to list attendance for student ${studentId}`);
            }
        },
        async listForEvent(eventId: string, { limit = DEFAULT_PAGE_SIZE, offset = 0 } = {}): Promise<PaginatedResponse<AttendanceDoc>> {
            try {
                const pageSize = Math.min(limit, MAX_PAGE_SIZE);
                const queries = [
                    Query.equal('events', eventId),
                    Query.limit(pageSize),
                    Query.offset(offset)
                ];
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDANCE, queries);
                return createPaginatedResponse<AttendanceDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, `Failed to list attendance for event ${eventId}`);
            }
        },
        async create(eventId: string, studentId: string, officerId: string, attendanceName: string): Promise<AttendanceDoc> {
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
        async delete(attendanceId: string): Promise<any> {
            try {
                const result = await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, attendanceId);
                dataCache.invalidateTags([CacheTags.ATTENDANCE, CacheTags.EVENTS, CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to delete attendance ${attendanceId}`);
            }
        }
    },

    // --- USERS (Accounts) ---
    users: {
        async getCurrent(): Promise<any> {
            try {
                return await account.get();
            } catch (error) {
                throw createApiError(error, 'Failed to get current user');
            }
        },
        async getAccount(accountId: string): Promise<AccountDoc> {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, accountId);
            } catch (error) {
                throw createApiError(error, `Failed to get account ${accountId}`);
            }
        },
        async getStudentProfile(studentId: string): Promise<StudentDoc> {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentId);
            } catch (error) {
                throw createApiError(error, `Failed to get student profile ${studentId}`);
            }
        },
        async listStudents(options: ListOptions = {}): Promise<PaginatedResponse<AccountDoc>> {
            try {
                const { limit = DEFAULT_PAGE_SIZE, offset = 0 } = normalizeListOptions(options);
                const pageSize = clampPageSize(limit);
                const queries = [
                    Query.equal('type', 'student'),
                    Query.limit(pageSize),
                    Query.offset(offset)
                ];
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, queries);
                return createPaginatedResponse<AccountDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list students');
            }
        },
        async listAccounts({ limit = DEFAULT_PAGE_SIZE, offset = 0, type = null, orderDesc = null }: any = {}): Promise<PaginatedResponse<AccountDoc>> {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (type) queries.unshift(Query.equal('type', type));
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, queries);
                return createPaginatedResponse<AccountDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list accounts');
            }
        },
        async listAllAccounts({ type = null, orderDesc = null, maxPages = 10 }: any = {}): Promise<PaginatedResponse<AccountDoc>> {
            try {
                const queries: any[] = [];
                if (type) queries.push(Query.equal('type', type));
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                return await listAllDocuments<AccountDoc>(COLLECTION_ID_ACCOUNTS, queries, { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all accounts');
            }
        }
    },

    // --- STUDENT PROFILES ---
    students: {
        async listProfiles({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = null }: any = {}): Promise<PaginatedResponse<StudentDoc>> {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, queries);
                return createPaginatedResponse<StudentDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list student profiles');
            }
        },
        async listAllProfiles({ orderDesc = null, maxPages = 10 }: any = {}): Promise<PaginatedResponse<StudentDoc>> {
            try {
                const queries: any[] = [];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                return await listAllDocuments<StudentDoc>(COLLECTION_ID_STUDENTS, queries, { maxPages });
            } catch (error) {
                throw createApiError(error, 'Failed to list all student profiles');
            }
        }
    },

    // --- DASHBOARD ---
    dashboard: {
        async getStats(): Promise<any> {
            try {
                const now = new Date();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(now.getDate() - 30);

                const [accountsRes, upcomingEventsCount, filesCount, revenueRes, expensesRes] = await Promise.all([
                    listAllDocuments<AccountDoc>(COLLECTION_ID_ACCOUNTS, [], { maxPages: 10 }),
                    countDocuments(COLLECTION_ID_EVENTS, [Query.greaterThan('date_to_held', now.toISOString())]),
                    countDocuments(COLLECTION_ID_FILES),
                    listAllDocuments<RevenueDoc>(COLLECTION_ID_REVENUE, [], { maxPages: 4 }),
                    listAllDocuments<ExpenseDoc>(COLLECTION_ID_EXPENSES, [], { maxPages: 4 })
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
        async getRangeSummary({ start, end, maxPages = 10 }: any = {}): Promise<any> {
            try {
                const startIso = start instanceof Date ? start.toISOString() : start;
                const endIso = end instanceof Date ? end.toISOString() : end;
                const [revenue, expenses, events] = await Promise.all([
                    listAllDocuments<RevenueDoc>(COLLECTION_ID_REVENUE, [
                        Query.greaterThanEqual('date_earned', startIso),
                        Query.lessThanEqual('date_earned', endIso)
                    ], { maxPages }),
                    listAllDocuments<ExpenseDoc>(COLLECTION_ID_EXPENSES, [
                        Query.greaterThanEqual('date_buy', startIso),
                        Query.lessThanEqual('date_buy', endIso)
                    ], { maxPages }),
                    listAllDocuments<EventDoc>(COLLECTION_ID_EVENTS, [], { maxPages: 2 })
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
        async list({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = true }: any = {}): Promise<PaginatedResponse<StoryDoc>> {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc('$createdAt'));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STORIES, queries);
                return createPaginatedResponse<StoryDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list stories');
            }
        },
        async get(storyId: string): Promise<StoryDoc> {
            try {
                return await databases.getDocument(DATABASE_ID, COLLECTION_ID_STORIES, storyId);
            } catch (error) {
                throw createApiError(error, `Failed to get story ${storyId}`);
            }
        }
    },

    // --- FILES & BUCKETS ---
    files: {
        async listDocuments({ limit = DEFAULT_PAGE_SIZE, offset = 0, orderDesc = '$createdAt', extraQueries = [] }: any = {}): Promise<PaginatedResponse<FileDoc>> {
            try {
                const pageSize = clampPageSize(limit);
                const queries = [...extraQueries, Query.limit(pageSize), Query.offset(offset)];
                if (orderDesc) queries.push(Query.orderDesc(orderDesc));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, queries);
                return createPaginatedResponse<FileDoc>(result, pageSize, offset);
            } catch (error) {
                throw createApiError(error, 'Failed to list files');
            }
        },
        getFilePreview(fileId: string, width = 600, height = 400): string | null {
            return imageCache.get(BUCKET_ID_EVENT_IMAGES, fileId, width, height);
        },
        async uploadEventImage(file: any): Promise<any> {
            try {
                const result = await storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), file);
                dataCache.invalidateTags([CacheTags.FILES, CacheTags.EVENTS, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, 'Failed to upload event image');
            }
        },
        async deleteEventImage(fileId: string): Promise<any> {
            try {
                imageCache.clear(fileId);
                const result = await storage.deleteFile(BUCKET_ID_EVENT_IMAGES, fileId);
                dataCache.invalidateTags([CacheTags.FILES, CacheTags.EVENTS, CacheTags.LANDING]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to delete event image ${fileId}`);
            }
        }
    },

    officers: {
        async listAll(): Promise<PaginatedResponse<OfficerDoc>> {
            try {
                return await listAllDocuments<OfficerDoc>(COLLECTION_ID_OFFICERS, []);
            } catch (error) {
                throw createApiError(error, 'Failed to list officers');
            }
        },
        async update(officerId: string, data: Partial<OfficerDoc>): Promise<OfficerDoc> {
            try {
                const result = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_OFFICERS, officerId, data);
                dataCache.invalidateTags([CacheTags.DASHBOARD]);
                return result;
            } catch (error) {
                throw createApiError(error, `Failed to update officer ${officerId}`);
            }
        }
    },

    cache: {
        clearAll(): void {
            dataCache.clear();
        },
        clearByPattern(pattern: string): void {
            dataCache.clear(pattern);
        },
        clearTags(tags: string | string[]): number {
            return dataCache.invalidateTags(tags);
        },
        clearKey(key: string): void {
            dataCache.remove(key);
        },
        getStats() {
            return {
                images: imageCache.getStats(),
                data: dataCache.getStats()
            };
        }
    }
};

export const cachedApi = {
    events: {
        async list(options: ListOptions = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<EventDoc>> {
            const { limit = 100, offset = 0, orderDesc = true } = normalizeListOptions(options);
            const cacheKey = generateCacheKey('events_list', { limit, offset, orderDesc });
            return dataCache.getOrFetch(cacheKey, () => api.events.list({ limit, offset, orderDesc }), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.EVENTS, CacheTags.LANDING]
            });
        },
        async get(eventId: string, ttl = 5 * 60 * 1000): Promise<EventDoc> {
            const cacheKey = generateCacheKey('event', { id: eventId });
            return dataCache.getOrFetch(cacheKey, () => api.events.get(eventId), {
                ttl,
                staleTtl: 10 * 60 * 1000,
                tags: [CacheTags.EVENTS]
            });
        },
        async listAll(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<EventDoc>> {
            const cacheKey = generateCacheKey('events_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.events.listAll(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.EVENTS, CacheTags.LANDING]
            });
        }
    },

    payments: {
        async list(options: ListOptions = {}, ttl = 60 * 1000): Promise<PaginatedResponse<PaymentDoc>> {
            const { limit = 100, offset = 0 } = normalizeListOptions(options);
            const cacheKey = generateCacheKey('payments_list', { limit, offset });
            return dataCache.getOrFetch(cacheKey, () => api.payments.list({ limit, offset }), {
                ttl,
                staleTtl: 2 * 60 * 1000,
                tags: [CacheTags.PAYMENTS, CacheTags.FINANCE]
            });
        },
        async listForStudent(studentId: string, ttl = 60 * 1000): Promise<any> {
            const cacheKey = generateCacheKey('payments_student', { studentId });
            return dataCache.getOrFetch(cacheKey, () => api.payments.listForStudent(studentId), {
                ttl,
                staleTtl: 2 * 60 * 1000,
                tags: [CacheTags.PAYMENTS, CacheTags.FINANCE]
            });
        },
        async listAll(options: any = {}, ttl = 60 * 1000): Promise<PaginatedResponse<PaymentDoc>> {
            const cacheKey = generateCacheKey('payments_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.payments.listAll(options), {
                ttl,
                staleTtl: 2 * 60 * 1000,
                tags: [CacheTags.PAYMENTS, CacheTags.FINANCE]
            });
        }
    },

    users: {
        async getCurrent(ttl = 5 * 60 * 1000): Promise<any> {
            const cacheKey = 'current_user';
            return dataCache.getOrFetch(cacheKey, () => api.users.getCurrent(), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS]
            });
        },
        async getAccount(accountId: string, ttl = 5 * 60 * 1000): Promise<AccountDoc> {
            const cacheKey = generateCacheKey('account', { accountId });
            return dataCache.getOrFetch(cacheKey, () => api.users.getAccount(accountId), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS]
            });
        },
        async getStudentProfile(studentId: string, ttl = 5 * 60 * 1000): Promise<StudentDoc> {
            const cacheKey = generateCacheKey('student_profile', { studentId });
            return dataCache.getOrFetch(cacheKey, () => api.users.getStudentProfile(studentId), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS]
            });
        },
        async listStudents(options: ListOptions = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<AccountDoc>> {
            const { limit = 100, offset = 0 } = normalizeListOptions(options);
            const cacheKey = generateCacheKey('students_list', { limit, offset });
            return dataCache.getOrFetch(cacheKey, () => api.users.listStudents({ limit, offset }), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS, CacheTags.ACCOUNTS]
            });
        },
        async listAccounts(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<AccountDoc>> {
            const cacheKey = generateCacheKey('accounts_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.users.listAccounts(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS, CacheTags.STUDENTS]
            });
        },
        async listAllAccounts(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<AccountDoc>> {
            const cacheKey = generateCacheKey('accounts_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.users.listAllAccounts(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.ACCOUNTS, CacheTags.STUDENTS]
            });
        }
    },

    dashboard: {
        async getStats(ttl = 2 * 60 * 1000): Promise<any> {
            return dataCache.getOrFetch('dashboard_stats', () => api.dashboard.getStats(), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.DASHBOARD, CacheTags.ACCOUNTS, CacheTags.EVENTS, CacheTags.FINANCE, CacheTags.FILES]
            });
        }
    },

    finance: {
        async getRangeSummary(options: any = {}, ttl = 2 * 60 * 1000): Promise<any> {
            const startKey = options.start instanceof Date ? options.start.toISOString() : options.start;
            const endKey = options.end instanceof Date ? options.end.toISOString() : options.end;
            const cacheKey = generateCacheKey('finance_range', { start: startKey, end: endKey, maxPages: options.maxPages });
            return dataCache.getOrFetch(cacheKey, () => api.finance.getRangeSummary(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.FINANCE, CacheTags.DASHBOARD]
            });
        }
    },

    students: {
        async listProfiles(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<StudentDoc>> {
            const cacheKey = generateCacheKey('student_profiles_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.students.listProfiles(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS]
            });
        },
        async listAllProfiles(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<StudentDoc>> {
            const cacheKey = generateCacheKey('student_profiles_all', options);
            return dataCache.getOrFetch(cacheKey, () => api.students.listAllProfiles(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STUDENTS]
            });
        }
    },

    files: {
        async listDocuments(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<FileDoc>> {
            const cacheKey = generateCacheKey('files_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.files.listDocuments(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.FILES]
            });
        }
    },

    stories: {
        async list(options: any = {}, ttl = 2 * 60 * 1000): Promise<PaginatedResponse<StoryDoc>> {
            const cacheKey = generateCacheKey('stories_list', options);
            return dataCache.getOrFetch(cacheKey, () => api.stories.list(options), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STORIES, CacheTags.LANDING]
            });
        },
        async get(storyId: string, ttl = 5 * 60 * 1000): Promise<StoryDoc> {
            const cacheKey = generateCacheKey('story', { storyId });
            return dataCache.getOrFetch(cacheKey, () => api.stories.get(storyId), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.STORIES]
            });
        }
    },

    officers: {
        async listAll(ttl = 2 * 60 * 1000): Promise<PaginatedResponse<OfficerDoc>> {
            const cacheKey = generateCacheKey('officers_all', {});
            return dataCache.getOrFetch(cacheKey, () => api.officers.listAll(), {
                ttl,
                staleTtl: 5 * 60 * 1000,
                tags: [CacheTags.DASHBOARD]
            });
        }
    }
};
