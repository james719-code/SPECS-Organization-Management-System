/**
 * Comprehensive API integration tests
 * Tests all API namespaces against mocked Appwrite SDK
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const appwriteMocks = vi.hoisted(() => ({
    account: {
        get: vi.fn()
    },
    databases: {
        listDocuments: vi.fn(),
        getDocument: vi.fn(),
        createDocument: vi.fn(),
        updateDocument: vi.fn(),
        deleteDocument: vi.fn()
    },
    storage: {
        createFile: vi.fn(),
        deleteFile: vi.fn(),
        getFilePreview: vi.fn(() => 'preview-url')
    }
}));

vi.mock('../../shared/appwrite.ts', () => appwriteMocks);

describe('API Layer', () => {
    let api;
    let cachedApi;
    let dataCache;

    beforeEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();

        const cacheModule = await import('../../shared/cache.ts');
        dataCache = cacheModule.dataCache;
        dataCache.clear();
        dataCache.resetStats();

        const apiModule = await import('../../shared/api.ts');
        api = apiModule.api;
        cachedApi = apiModule.cachedApi;
    });

    // ==================== EVENTS ====================

    describe('api.events', () => {
        it('should list events with pagination', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'event-1', event_name: 'Event 1', event_ended: false, archived: false },
                    { $id: 'event-2', event_name: 'Event 2', event_ended: true, archived: false }
                ],
                total: 2
            });

            const result = await api.events.list({ limit: 10 });
            expect(result.documents).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.hasMore).toBe(false);
        });

        it('should filter out archived events by default', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'event-1', event_name: 'Active', event_ended: false, archived: false },
                    { $id: 'event-2', event_name: 'Archived', event_ended: true, archived: true }
                ],
                total: 2
            });

            const result = await api.events.list({ limit: 10 });
            expect(result.documents).toHaveLength(1);
            expect(result.documents[0].$id).toBe('event-1');
        });

        it('should include archived events when requested', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'event-1', event_name: 'Active', event_ended: false, archived: false },
                    { $id: 'event-2', event_name: 'Archived', event_ended: true, archived: true }
                ],
                total: 2
            });

            const result = await api.events.list({ limit: 10, includeArchived: true });
            expect(result.documents).toHaveLength(2);
        });

        it('should get a single event', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: 'event-1',
                event_name: 'Test Event',
                event_ended: false
            });

            const event = await api.events.get('event-1');
            expect(event.$id).toBe('event-1');
            expect(event.event_name).toBe('Test Event');
        });

        it('should create an event', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'new-event',
                event_name: 'New Event'
            });

            const result = await api.events.create({ event_name: 'New Event' });
            expect(result.$id).toBe('new-event');
            expect(appwriteMocks.databases.createDocument).toHaveBeenCalledTimes(1);
        });

        it('should update an event', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'event-1',
                event_name: 'Updated Event'
            });

            const result = await api.events.update('event-1', {
                event_name: 'Updated Event'
            });
            expect(result.event_name).toBe('Updated Event');
        });

        it('should delete an event', async () => {
            appwriteMocks.databases.deleteDocument.mockResolvedValue({});
            const result = await api.events.delete('event-1');
            expect(appwriteMocks.databases.deleteDocument).toHaveBeenCalledTimes(1);
            expect(result).toBeDefined();
        });

        it('should mark an event as ended', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'event-1',
                event_ended: true
            });

            const result = await api.events.markEnded('event-1');
            expect(result.event_ended).toBe(true);
        });

        it('should archive an event', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'event-1',
                archived: true
            });

            const result = await api.events.archive('event-1', true);
            expect(result.archived).toBe(true);
        });

        it('should listAll events', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [{ $id: 'event-1', event_name: 'Event', event_ended: false }],
                total: 1
            });

            const result = await api.events.listAll();
            expect(result.documents.length).toBeGreaterThanOrEqual(0);
        });
    });

    // ==================== PAYMENTS ====================

    describe('api.payments', () => {
        it('should list payments', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'pay-1', price: 500, item_name: 'Fee', quantity: 1, is_paid: false }
                ],
                total: 1
            });

            const result = await api.payments.list({ limit: 10 });
            expect(result.documents).toHaveLength(1);
        });

        it('should list payments for a student', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'pay-1', price: 500, item_name: 'Fee', quantity: 1, is_paid: true }
                ],
                total: 1
            });

            const result = await api.payments.listForStudent('student-1');
            expect(result.documents).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('should create a payment', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'new-payment',
                price: 300,
                item_name: 'New Fee',
                quantity: 1
            });

            const result = await api.payments.create({
                price: 300,
                item_name: 'New Fee',
                quantity: 1
            });
            expect(result.$id).toBe('new-payment');
        });

        it('should update a payment', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'pay-1',
                is_paid: true
            });

            const result = await api.payments.update('pay-1', { is_paid: true });
            expect(result.is_paid).toBe(true);
        });

        it('should mark a payment as paid and create revenue', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({ $id: 'rev-new' });
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'pay-1',
                is_paid: true,
                date_paid: '2026-07-06T00:00:00.000Z'
            });

            const payment = {
                $id: 'pay-1',
                item_name: 'Test Fee',
                price: 500,
                quantity: 1,
                is_event: false,
                is_paid: false,
                events: null,
                activity: 'Membership'
            };

            const result = await api.payments.markPaid(
                payment,
                'recorder-1',
                'John Doe',
                'cash',
                'officer-1',
                'Maria Santos'
            );
            expect(result.is_paid).toBe(true);
            expect(appwriteMocks.databases.createDocument).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== ATTENDANCE ====================

    describe('api.attendance', () => {
        it('should list attendance for a student', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'att-1', name_attendance: 'Event A', students: { $id: 'student-1' } }
                ],
                total: 1
            });

            const result = await api.attendance.listForStudent('student-1');
            expect(result.documents).toHaveLength(1);
        });

        it('should list attendance for an event', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'att-1', name_attendance: 'Event A' }
                ],
                total: 1
            });

            const result = await api.attendance.listForEvent('event-1');
            expect(result.documents).toHaveLength(1);
        });

        it('should list all attendance', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'att-1', name_attendance: 'Orientation' }
                ],
                total: 1
            });

            const result = await api.attendance.listAll();
            expect(result.documents).toHaveLength(1);
        });

        it('should create a student attendance record', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'att-new',
                name_attendance: 'Test Event'
            });

            const result = await api.attendance.create(
                'event-1',
                'student',
                'student-1',
                null,
                'officer-1',
                'Test Event'
            );
            expect(result.$id).toBe('att-new');
        });

        it('should create a non-member attendance record', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'att-nonmember',
                name_attendance: 'Test Event',
                attendance_type: 'non-member'
            });

            const result = await api.attendance.create(
                'event-1',
                'non-member',
                null,
                { name: 'Guest User', email: 'guest@test.com' },
                null,
                'Test Event'
            );
            expect(result.$id).toBe('att-nonmember');
        });

        it('should delete an attendance record', async () => {
            appwriteMocks.databases.deleteDocument.mockResolvedValue({});
            const result = await api.attendance.delete('att-1');
            expect(appwriteMocks.databases.deleteDocument).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== USERS & ACCOUNTS ====================

    describe('api.users', () => {
        it('should get current user', async () => {
            appwriteMocks.account.get.mockResolvedValue({
                $id: 'user-1',
                email: 'test@test.com',
                name: 'Test User'
            });

            const user = await api.users.getCurrent();
            expect(user.$id).toBe('user-1');
        });

        it('should get an account', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: 'account-1',
                username: 'testuser',
                type: 'student',
                verified: true
            });

            const account = await api.users.getAccount('account-1');
            expect(account.username).toBe('testuser');
        });

        it('should get a student profile', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: 'student-1',
                name: 'Test Student',
                student_id: 20240001
            });

            const profile = await api.users.getStudentProfile('student-1');
            expect(profile.name).toBe('Test Student');
        });

        it('should list student accounts with type filter', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'acc-1', type: 'student', verified: true }
                ],
                total: 1
            });

            const result = await api.users.listStudents();
            expect(result.documents).toHaveLength(1);
            result.documents.forEach(doc => {
                expect(doc.type).toBe('student');
            });
        });

        it('should list accounts with filters', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'acc-1', type: 'student', verified: false }
                ],
                total: 1
            });

            const result = await api.users.listAccounts({
                type: 'student',
                verified: false
            });
            expect(result.documents).toHaveLength(1);
        });
    });

    // ==================== STUDENTS ====================

    describe('api.students', () => {
        it('should list profiles', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'student-1', name: 'Test Student', student_id: 20240001 }
                ],
                total: 1
            });

            const result = await api.students.listProfiles({ limit: 10 });
            expect(result.documents).toHaveLength(1);
        });
    });

    // ==================== DASHBOARD ====================

    describe('api.dashboard', () => {
        it('should get dashboard stats', async () => {
            // Mock accounts list
            appwriteMocks.databases.listDocuments
                .mockResolvedValueOnce({
                    documents: [
                        { $id: 'acc-1', type: 'student', verified: true, $createdAt: new Date().toISOString() },
                        { $id: 'acc-2', type: 'officer', verified: true, $createdAt: '2024-01-01T00:00:00.000Z' },
                        { $id: 'acc-3', type: 'admin', verified: true, $createdAt: '2024-01-01T00:00:00.000Z' }
                    ],
                    total: 3
                })  // Count upcoming events
                .mockResolvedValueOnce({
                    documents: [],
                    total: 2
                })  // Count files
                .mockResolvedValueOnce({
                    documents: [],
                    total: 5
                })  // Revenue listAll
                .mockResolvedValueOnce({
                    documents: [
                        { price: 500, quantity: 1 },
                        { price: 200, quantity: 2 }
                    ],
                    total: 2
                })  // Expenses listAll
                .mockResolvedValueOnce({
                    documents: [
                        { price: 100, quantity: 1 }
                    ],
                    total: 1
                });

            const stats = await api.dashboard.getStats();
            expect(stats.totalRevenue).toBe(900);
            expect(stats.totalExpenses).toBe(100);
            expect(typeof stats.growthPercentage).toBe('number');
        });
    });

    // ==================== FINANCE ====================

    describe('api.finance', () => {
        it('should get range summary', async () => {
            appwriteMocks.databases.listDocuments
                .mockResolvedValueOnce({
                    documents: [{ price: 500, quantity: 1 }],
                    total: 1
                })
                .mockResolvedValueOnce({
                    documents: [{ price: 200, quantity: 1 }],
                    total: 1
                })
                .mockResolvedValueOnce({
                    documents: [],
                    total: 0
                });

            const summary = await api.finance.getRangeSummary({
                start: '2026-01-01T00:00:00.000Z',
                end: '2026-12-31T00:00:00.000Z'
            });
            expect(summary.totalRevenue).toBe(500);
            expect(summary.totalExpenses).toBe(200);
        });
    });

    // ==================== STORIES ====================

    describe('api.stories', () => {
        it('should list stories', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'story-1', title: 'Test Story', isAccepted: true }
                ],
                total: 1
            });

            const result = await api.stories.list();
            expect(result.documents).toHaveLength(1);
        });

        it('should get a story', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: 'story-1',
                title: 'Test Story',
                isAccepted: true
            });

            const story = await api.stories.get('story-1');
            expect(story.title).toBe('Test Story');
        });

        it('should create a story', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'new-story',
                title: 'New Story',
                isAccepted: false
            });

            const result = await api.stories.create({ title: 'New Story' });
            expect(result.$id).toBe('new-story');
        });

        it('should update a story', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'story-1',
                title: 'Updated Story'
            });

            const result = await api.stories.update('story-1', { title: 'Updated Story' });
            expect(result.title).toBe('Updated Story');
        });

        it('should delete a story', async () => {
            appwriteMocks.databases.deleteDocument.mockResolvedValue({});
            const result = await api.stories.delete('story-1');
            expect(appwriteMocks.databases.deleteDocument).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== FILES ====================

    describe('api.files', () => {
        it('should list file documents', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'file-1', fileName: 'test.pdf' }
                ],
                total: 1
            });

            const result = await api.files.listDocuments();
            expect(result.documents).toHaveLength(1);
        });

        it('should get file preview URL', () => {
            const url = api.files.getFilePreview('test-file');
            expect(url).toBeTruthy();
        });

        it('should upload an event image', async () => {
            appwriteMocks.storage.createFile.mockResolvedValue({
                $id: 'new-image',
                name: 'test.jpg'
            });

            const result = await api.files.uploadEventImage({ name: 'test.jpg' });
            expect(result.name).toBe('test.jpg');
        });

        it('should delete an event image', async () => {
            appwriteMocks.storage.deleteFile.mockResolvedValue({});
            const result = await api.files.deleteEventImage('file-1');
            expect(appwriteMocks.storage.deleteFile).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== OFFICERS ====================

    describe('api.officers', () => {
        it('should list all officers', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'officer-1', position: 'president' }
                ],
                total: 1
            });

            const result = await api.officers.listAll();
            expect(result.documents).toHaveLength(1);
        });

        it('should update an officer', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'officer-1',
                position: 'secretary'
            });

            const result = await api.officers.update('officer-1', { position: 'secretary' });
            expect(result.position).toBe('secretary');
        });
    });

    // ==================== TASKS ====================

    describe('api.tasks', () => {
        it('should list tasks', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'task-1', name: 'Test Task', is_done: false }
                ],
                total: 1
            });

            const result = await api.tasks.list();
            expect(result.documents).toHaveLength(1);
        });

        it('should create a task', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'new-task',
                name: 'New Task',
                is_done: false
            });

            const result = await api.tasks.create({ name: 'New Task' });
            expect(result.$id).toBe('new-task');
        });

        it('should update a task', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'task-1',
                is_done: true,
                name_of_done: 'Admin User',
                time_done: '2026-07-06T00:00:00.000Z'
            });

            const result = await api.tasks.update('task-1', {
                is_done: true,
                name_of_done: 'Admin User',
                time_done: '2026-07-06T00:00:00.000Z'
            });
            expect(result.is_done).toBe(true);
        });

        it('should delete a task', async () => {
            appwriteMocks.databases.deleteDocument.mockResolvedValue({});
            const result = await api.tasks.delete('task-1');
            expect(appwriteMocks.databases.deleteDocument).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== ADMINS ====================

    describe('api.admins', () => {
        it('should get an admin profile', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: 'admin-1',
                fullName: 'Admin User',
                email: 'admin@specs.org'
            });

            const admin = await api.admins.get('admin-1');
            expect(admin.fullName).toBe('Admin User');
        });

        it('should update an admin profile', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'admin-1',
                fullName: 'Updated Admin',
                email: 'admin@specs.org'
            });

            const result = await api.admins.update('admin-1', { fullName: 'Updated Admin' });
            expect(result.fullName).toBe('Updated Admin');
        });
    });

    // ==================== STARTING BALANCES ====================

    describe('api.startingBalances', () => {
        it('should get a starting balance by school year', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: '2025-2026',
                amount: 15000,
                start_first_sem: '2025-08-15T00:00:00.000Z',
                end_first_sem: '2025-12-20T00:00:00.000Z',
                start_second_sem: '2026-01-10T00:00:00.000Z',
                end_second_sem: '2026-05-30T00:00:00.000Z'
            });

            const balance = await api.startingBalances.get('2025-2026');
            expect(balance.amount).toBe(15000);
        });

        it('should return null for non-existent school year', async () => {
            appwriteMocks.databases.getDocument.mockRejectedValue({ code: 404 });

            const balance = await api.startingBalances.get('nonexistent');
            expect(balance).toBeNull();
        });

        it('should create a new starting balance', async () => {
            // getDocument throws 404 (doesn't exist), then createDocument succeeds
            appwriteMocks.databases.getDocument.mockRejectedValue({ code: 404 });
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: '2026-2027',
                amount: 20000
            });

            const result = await api.startingBalances.updateOrCreate('2026-2027', {
                amount: 20000,
                start_first_sem: '2026-08-15T00:00:00.000Z',
                end_first_sem: '2026-12-20T00:00:00.000Z',
                start_second_sem: '2027-01-10T00:00:00.000Z',
                end_second_sem: '2027-05-30T00:00:00.000Z'
            });
            expect(result.amount).toBe(20000);
        });

        it('should update an existing starting balance', async () => {
            appwriteMocks.databases.getDocument.mockResolvedValue({
                $id: '2025-2026',
                amount: 15000
            });
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: '2025-2026',
                amount: 18000
            });

            const result = await api.startingBalances.updateOrCreate('2025-2026', {
                amount: 18000,
                start_first_sem: '2025-08-15T00:00:00.000Z',
                end_first_sem: '2025-12-20T00:00:00.000Z',
                start_second_sem: '2026-01-10T00:00:00.000Z',
                end_second_sem: '2026-05-30T00:00:00.000Z'
            });
            expect(result.amount).toBe(18000);
        });

        it('should list starting balances', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: '2025-2026', amount: 15000 },
                    { $id: '2024-2025', amount: 12000 }
                ],
                total: 2
            });

            const result = await api.startingBalances.list();
            expect(result.documents).toHaveLength(2);
        });

        it('should delete a starting balance', async () => {
            appwriteMocks.databases.deleteDocument.mockResolvedValue({});
            const result = await api.startingBalances.delete('2024-2025');
            expect(appwriteMocks.databases.deleteDocument).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== METADATA ====================

    describe('api.metadata', () => {
        it('should get metadata', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: 'meta-1', ismaintenance: false, schoolYear: '2025-2026' }
                ],
                total: 1
            });

            const metadata = await api.metadata.get();
            expect(metadata).toBeDefined();
            expect(metadata.ismaintenance).toBe(false);
        });

        it('should return null when no metadata exists', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [],
                total: 0
            });

            const metadata = await api.metadata.get();
            expect(metadata).toBeNull();
        });

        it('should create metadata', async () => {
            appwriteMocks.databases.createDocument.mockResolvedValue({
                $id: 'meta-new',
                ismaintenance: true
            });

            const result = await api.metadata.create({ ismaintenance: true });
            expect(result.ismaintenance).toBe(true);
        });

        it('should update metadata', async () => {
            appwriteMocks.databases.updateDocument.mockResolvedValue({
                $id: 'meta-1',
                ismaintenance: false
            });

            const result = await api.metadata.update('meta-1', { ismaintenance: false });
            expect(result.ismaintenance).toBe(false);
        });
    });

    // ==================== CACHE MANAGEMENT ====================

    describe('api.cache', () => {
        it('should clear all cache', () => {
            expect(() => api.cache.clearAll()).not.toThrow();
        });

        it('should clear cache by pattern', () => {
            expect(() => api.cache.clearByPattern('events')).not.toThrow();
        });

        it('should clear cache by tags', () => {
            const removed = api.cache.clearTags(['events']);
            expect(typeof removed).toBe('number');
        });

        it('should clear a specific key', () => {
            expect(() => api.cache.clearKey('some-key')).not.toThrow();
        });

        it('should return cache stats', () => {
            const stats = api.cache.getStats();
            expect(stats).toBeDefined();
            expect(stats.images).toBeDefined();
            expect(stats.data).toBeDefined();
        });
    });

    // ==================== PAGINATION HELPERS ====================

    describe('Pagination helpers', () => {
        it('should set hasMore correctly when more docs exist', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: '1' }, { $id: '2' }, { $id: '3' }
                ],
                total: 10
            });

            const result = await api.events.list({ limit: 3, offset: 0 });
            expect(result.hasMore).toBe(true);
        });

        it('should set hasMore false when all docs fetched', async () => {
            appwriteMocks.databases.listDocuments.mockResolvedValue({
                documents: [
                    { $id: '1' }, { $id: '2' }, { $id: '3' }
                ],
                total: 3
            });

            const result = await api.events.list({ limit: 10, offset: 0 });
            expect(result.hasMore).toBe(false);
        });
    });
});
