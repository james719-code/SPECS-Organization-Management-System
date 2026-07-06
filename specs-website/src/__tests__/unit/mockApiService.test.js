/**
 * Unit tests for MockApiService
 * Tests the in-memory mock backend that simulates Appwrite SDK
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockApiService } from '../../shared/mock/mockApiService.js';
import {
    mockAccounts,
    mockStudents,
    mockOfficers,
    mockAdmins,
    mockEvents,
    mockStories,
    mockPayments,
    mockFiles,
    mockAttendance,
    mockExpenses,
    mockRevenue,
    mockTasks,
    mockStartingBalances,
    getMockData
} from '../../shared/mock/mockData.js';

describe('MockApiService', () => {
    let service;

    beforeEach(() => {
        service = new MockApiService();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    // ==================== AUTHENTICATION ====================

    describe('Authentication', () => {
        it('should have no current user before login', async () => {
            await expect(service.getCurrentUser()).rejects.toThrow('Not authenticated');
        });

        it('should login with valid admin credentials', async () => {
            const session = await service.login('admin@specs.org', 'admin123');
            expect(session).toBeDefined();
            expect(session.userId).toBe('account-admin-1');

            const user = await service.getCurrentUser();
            expect(user.type).toBe('admin');
            expect(user.email).toBe('admin@specs.org');
        });

        it('should login with valid student credentials', async () => {
            await service.login('john.doe@student.edu', 'student123');
            const user = await service.getCurrentUser();
            expect(user.type).toBe('student');
            expect(user.email).toBe('john.doe@student.edu');
        });

        it('should reject login with invalid email', async () => {
            await expect(service.login('nonexistent@test.com', 'password'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should reject login with wrong password', async () => {
            await expect(service.login('admin@specs.org', 'wrongpassword'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should logout and clear current user', async () => {
            await service.login('admin@specs.org', 'admin123');
            const result = await service.logout();
            expect(result).toBe(true);

            await expect(service.getCurrentUser()).rejects.toThrow('Not authenticated');
        });

        it('should persist session via sessionStorage', async () => {
            await service.login('admin@specs.org', 'admin123');

            // Create a new instance to simulate page reload
            const newService = new MockApiService();
            const user = await newService.getCurrentUser();
            expect(user.email).toBe('admin@specs.org');
        });

        it('should support devLogin by user type', async () => {
            const user = await service.devLogin('admin');
            expect(user.type).toBe('admin');
            expect(user.email).toBe('admin@specs.org');
        });

        it('should support devLogin for officer', async () => {
            const user = await service.devLogin('officer');
            expect(user.type).toBe('officer');
            expect(user.email).toBe('maria.santos@student.edu');
        });

        it('should support devLogin for student', async () => {
            const user = await service.devLogin('student');
            expect(user.type).toBe('student');
        });
    });

    // ==================== CRUD: DOCUMENTS ====================

    describe('listDocuments', () => {
        it('should list all accounts', async () => {
            const result = await service.listDocuments(null, 'accounts');
            expect(result.documents).toBeDefined();
            expect(result.documents.length).toBeGreaterThanOrEqual(6);
            expect(result.total).toBeGreaterThanOrEqual(6);
        });

        it('should list all events', async () => {
            const result = await service.listDocuments(null, 'events');
            expect(result.documents.length).toBeGreaterThanOrEqual(3);
        });

        it('should list all students', async () => {
            const result = await service.listDocuments(null, 'students');
            expect(result.documents.length).toBeGreaterThanOrEqual(5);
        });

        it('should list all payments', async () => {
            const result = await service.listDocuments(null, 'payments');
            expect(result.documents.length).toBeGreaterThanOrEqual(3);
        });

        it('should list all stories', async () => {
            const result = await service.listDocuments(null, 'stories');
            expect(result.documents.length).toBeGreaterThanOrEqual(3);
        });

        it('should list all attendance records', async () => {
            const result = await service.listDocuments(null, 'attendance');
            expect(result.documents.length).toBeGreaterThanOrEqual(3);
        });

        it('should list all expenses', async () => {
            const result = await service.listDocuments(null, 'expenses');
            expect(result.documents.length).toBeGreaterThanOrEqual(2);
        });

        it('should list all revenue', async () => {
            const result = await service.listDocuments(null, 'revenue');
            expect(result.documents.length).toBeGreaterThanOrEqual(2);
        });

        it('should list all tasks', async () => {
            const result = await service.listDocuments(null, 'tasks');
            expect(result.documents.length).toBeGreaterThanOrEqual(2);
        });

        it('should list starting balances', async () => {
            const result = await service.listDocuments(null, 'starting_balances');
            expect(result.documents.length).toBeGreaterThanOrEqual(2);
        });

        it('should return empty array for unknown collection', async () => {
            const result = await service.listDocuments(null, 'nonexistent_collection');
            expect(result.documents).toEqual([]);
        });
    });

    // ==================== QUERY PARSING ====================

    describe('Query parsing and filtering', () => {
        it('should filter by equal (type)', async () => {
            const result = await service.listDocuments(null, 'accounts', [
                'equal("type", "student")'
            ]);
            expect(result.documents.every(doc => doc.type === 'student')).toBe(true);
            expect(result.documents.length).toBeGreaterThanOrEqual(4);
        });

        it('should filter by equal (admin type)', async () => {
            const result = await service.listDocuments(null, 'accounts', [
                'equal("type", "admin")'
            ]);
            expect(result.documents.every(doc => doc.type === 'admin')).toBe(true);
        });

        it('should filter accounts by verified=true', async () => {
            const result = await service.listDocuments(null, 'accounts', [
                'equal("verified", true)'
            ]);
            expect(result.documents.every(doc => doc.verified === true)).toBe(true);
        });

        it('should apply orderDesc', async () => {
            const result = await service.listDocuments(null, 'events', [
                'orderDesc("date_to_held")'
            ]);
            if (result.documents.length >= 2) {
                expect(new Date(result.documents[0].date_to_held).getTime())
                    .toBeGreaterThanOrEqual(new Date(result.documents[1].date_to_held).getTime());
            }
        });

        it('should apply orderAsc', async () => {
            const result = await service.listDocuments(null, 'events', [
                'orderAsc("date_to_held")'
            ]);
            if (result.documents.length >= 2) {
                expect(new Date(result.documents[0].date_to_held).getTime())
                    .toBeLessThanOrEqual(new Date(result.documents[1].date_to_held).getTime());
            }
        });

        it('should apply limit', async () => {
            const result = await service.listDocuments(null, 'students', [
                'limit(2)'
            ]);
            expect(result.documents.length).toBeLessThanOrEqual(2);
        });

        it('should apply offset', async () => {
            const all = await service.listDocuments(null, 'students');
            const result = await service.listDocuments(null, 'students', [
                'offset(1)'
            ]);
            expect(result.documents.length).toBeLessThanOrEqual(all.documents.length);
        });

        it('should apply search (contains text)', async () => {
            const result = await service.listDocuments(null, 'events', [
                'search("event_name", "Tech")'
            ]);
            expect(result.documents.every(doc =>
                doc.event_name.toLowerCase().includes('tech')
            )).toBe(true);
        });

        it('should apply notEqual filter', async () => {
            const result = await service.listDocuments(null, 'accounts', [
                'notEqual("type", "admin")'
            ]);
            expect(result.documents.every(doc => doc.type !== 'admin')).toBe(true);
        });
    });

    // ==================== CRUD: SINGLE DOCUMENT ====================

    describe('getDocument', () => {
        it('should get a specific event by ID', async () => {
            const doc = await service.getDocument(null, 'events', 'event-1');
            expect(doc.$id).toBe('event-1');
            expect(doc.event_name).toBe('Annual Tech Summit 2026');
        });

        it('should get a specific student by ID', async () => {
            const doc = await service.getDocument(null, 'students', 'student-1');
            expect(doc.$id).toBe('student-1');
            expect(doc.name).toBe('John Doe');
        });

        it('should throw for non-existent document', async () => {
            await expect(service.getDocument(null, 'events', 'nonexistent-id'))
                .rejects.toThrow('Document not found');
        });

        it('should resolve nested relationships for accounts', async () => {
            const doc = await service.getDocument(null, 'accounts', 'account-officer-1');
            expect(doc.students).toBeDefined();
            expect(doc.officers).toBeDefined();
        });
    });

    describe('createDocument', () => {
        it('should create a new event', async () => {
            const result = await service.createDocument(null, 'events', 'new-event-1', {
                event_name: 'New Test Event',
                date_to_held: '2026-07-15T09:00:00.000Z',
                description: 'A new test event'
            });
            expect(result.$id).toBe('new-event-1');
            expect(result.event_name).toBe('New Test Event');

            // Verify it was added
            const doc = await service.getDocument(null, 'events', 'new-event-1');
            expect(doc.event_name).toBe('New Test Event');
        });

        it('should auto-generate ID if not provided', async () => {
            const result = await service.createDocument(null, 'payments', null, {
                price: 100,
                item_name: 'Test Payment',
                quantity: 1,
                date_paid: '2026-07-01T00:00:00.000Z'
            });
            expect(result.$id).toBeDefined();
        });
    });

    describe('updateDocument', () => {
        it('should update an existing document', async () => {
            const result = await service.updateDocument(null, 'events', 'event-1', {
                event_name: 'Updated Event Name'
            });
            expect(result.event_name).toBe('Updated Event Name');

            const doc = await service.getDocument(null, 'events', 'event-1');
            expect(doc.event_name).toBe('Updated Event Name');
        });

        it('should throw for non-existent document', async () => {
            await expect(service.updateDocument(null, 'events', 'nonexistent', { event_name: 'X' }))
                .rejects.toThrow('Document not found');
        });
    });

    describe('deleteDocument', () => {
        it('should delete an existing document', async () => {
            const result = await service.deleteDocument(null, 'events', 'event-3');
            expect(result).toBe(true);

            await expect(service.getDocument(null, 'events', 'event-3'))
                .rejects.toThrow('Document not found');
        });

        it('should not throw for non-existent document', async () => {
            const result = await service.deleteDocument(null, 'events', 'nonexistent');
            expect(result).toBe(true);
        });
    });

    // ==================== FILE OPERATIONS ====================

    describe('File operations', () => {
        it('should list files', async () => {
            const result = await service.listFiles('test-bucket');
            expect(result.files.length).toBeGreaterThanOrEqual(3);
        });

        it('should get file view URL', async () => {
            const url = await service.getFileView('test-bucket', 'file-1');
            expect(url).toContain('mock-storage.local');
        });

        it('should get file download URL', async () => {
            const url = await service.getFileDownload('test-bucket', 'file-1');
            expect(url).toContain('mock-storage.local');
        });

        it('should upload a new file', async () => {
            const mockFile = { name: 'test-doc.pdf' };
            const result = await service.createFile('test-bucket', 'new-file', mockFile);
            expect(result.fileName).toBe('test-doc.pdf');
        });

        it('should delete a file', async () => {
            const result = await service.deleteFile('test-bucket', 'file-1');
            expect(result).toBe(true);
        });
    });

    // ==================== VOLUNTEER MANAGEMENT ====================

    describe('Volunteer management', () => {
        beforeEach(async () => {
            await service.login('admin@specs.org', 'admin123');
        });

        it('should submit a volunteer request', async () => {
            const result = await service.requestVolunteerStatus('student-3');
            expect(result.success).toBe(true);
            expect(result.message).toContain('submitted');
        });

        it('should reject duplicate volunteer request', async () => {
            await expect(service.requestVolunteerStatus('student-2'))
                .rejects.toThrow('already pending');
        });

        it('should reject request for existing volunteer', async () => {
            await expect(service.requestVolunteerStatus('student-1'))
                .rejects.toThrow('Already a volunteer');
        });

        it('should get pending volunteer requests', async () => {
            const result = await service.getVolunteerRequests();
            expect(result.documents.length).toBeGreaterThanOrEqual(0);
            result.documents.forEach(doc => {
                expect(doc.status).toBe('pending');
            });
        });

        it('should approve a volunteer request', async () => {
            const result = await service.approveVolunteerRequest('student-2', 'officer-1');
            expect(result.success).toBe(true);
        });

        it('should reject a volunteer request', async () => {
            // Reset student-2 to pending first since it may have been modified
            const student = mockStudents.find(s => s.$id === 'student-2');
            if (student) {
                student.volunteer_request_status = 'pending';
            }
            const result = await service.rejectVolunteerRequest('student-2', 'officer-1');
            expect(result.success).toBe(true);
        });

        it('should handle volunteer backout request', async () => {
            const result = await service.requestVolunteerBackout('student-1');
            expect(result.success).toBe(true);
        });

        it('should reject backout from non-volunteer', async () => {
            await expect(service.requestVolunteerBackout('student-3'))
                .rejects.toThrow('not a volunteer');
        });

        it('should approve a volunteer backout', async () => {
            // Ensure student-1 is in backout_pending state
            const student = mockStudents.find(s => s.$id === 'student-1');
            if (student) {
                student.volunteer_request_status = 'backout_pending';
            }
            const result = await service.approveVolunteerBackout('student-1', 'officer-1');
            expect(result.success).toBe(true);
        });

        it('should reject a volunteer backout', async () => {
            const student = mockStudents.find(s => s.$id === 'student-1');
            if (student) {
                student.is_volunteer = true;
                student.volunteer_request_status = 'backout_pending';
            }
            const result = await service.rejectVolunteerBackout('student-1', 'officer-1');
            expect(result.success).toBe(true);
        });
    });

    // ==================== STORY/POST MANAGEMENT ====================

    describe('Story management', () => {
        beforeEach(async () => {
            await service.login('admin@specs.org', 'admin123');
        });

        it('should create a new story', async () => {
            const result = await service.createStory({
                title: 'Test Story',
                post_description: 'Test description',
                post_details: 'Test details',
                studentId: 'student-1'
            });
            expect(result.title).toBe('Test Story');
            expect(result.isAccepted).toBe(false);
            expect(result.students.$id).toBe('student-1');
        });

        it('should update a story', async () => {
            const result = await service.updateStory('story-1', {
                title: 'Updated Story Title'
            });
            expect(result.title).toBe('Updated Story Title');
        });

        it('should delete a story', async () => {
            // Create a fresh story to delete so we don't affect other tests
            const newStory = await service.createStory({
                title: 'Story To Delete',
                post_description: 'Will be deleted',
                post_details: 'Temporary',
                studentId: 'student-1'
            });
            const result = await service.deleteStory(newStory.$id);
            expect(result).toBe(true);
        });

        it('should get stories by student', async () => {
            const result = await service.getStoriesByStudent('student-1');
            result.documents.forEach(doc => {
                expect(doc.students.$id).toBe('student-1');
            });
        });

        it('should get pending stories', async () => {
            const result = await service.getPendingStories();
            result.documents.forEach(doc => {
                expect(doc.isAccepted).toBe(false);
            });
        });

        it('should approve a story', async () => {
            const result = await service.approveStory('story-3', 'officer-1');
            expect(result.success).toBe(true);
            const story = mockStories.find(s => s.$id === 'story-3');
            expect(story.isAccepted).toBe(true);
        });
    });

    // ==================== OFFICER ASSIGNMENT ====================

    describe('Officer assignment', () => {
        beforeEach(async () => {
            await service.login('admin@specs.org', 'admin123');
        });

        it('should assign a student as officer', async () => {
            const result = await service.assignStudentToOfficer('student-3', 'admin-1');
            expect(result.success).toBe(true);
            expect(result.officerId).toBeDefined();
        });

        it('should reject assigning already-an-officer', async () => {
            await expect(service.assignStudentToOfficer('student-officer-1', 'admin-1'))
                .rejects.toThrow('already an officer');
        });

        it('should list officers', async () => {
            const result = await service.getOfficers();
            expect(result.documents.length).toBeGreaterThanOrEqual(1);
        });

        it('should remove an officer', async () => {
            // Use a fresh student that hasn't been assigned yet
            // student-4 is not used in other assignment tests
            const existing = mockOfficers.find(o => o.students?.$id === 'student-4');
            if (existing) {
                // Clean up from any prior test
                const idx = mockOfficers.indexOf(existing);
                if (idx !== -1) mockOfficers.splice(idx, 1);
            }
            // Also fix the account
            const acct = mockAccounts.find(a => a.students?.$id === 'student-4');
            if (acct) { acct.type = 'student'; acct.officers = null; }

            await service.assignStudentToOfficer('student-4', 'admin-1');
            const officers = await service.getOfficers();
            const newOfficer = officers.documents.find(o =>
                o.students && o.students.$id === 'student-4'
            );
            expect(newOfficer).toBeDefined();
            if (newOfficer) {
                const result = await service.removeStudentFromOfficer(newOfficer.$id, 'admin-1');
                expect(result.success).toBe(true);
            }
        });
    });

    // ==================== DASHBOARD STATS ====================

    describe('Dashboard stats', () => {
        it('should return dashboard statistics', () => {
            const stats = service.getDashboardStats();
            expect(stats.totalAccounts).toBeGreaterThanOrEqual(6);
            expect(stats.totalStudents).toBeGreaterThanOrEqual(5);
            expect(stats.totalEvents).toBeGreaterThanOrEqual(3);
            expect(stats.totalPayments).toBeGreaterThanOrEqual(3);
            expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
            expect(stats.totalExpenses).toBeGreaterThanOrEqual(0);
            expect(typeof stats.totalVolunteers).toBe('number');
        });
    });

    // ==================== ACCOUNT TYPE MANAGEMENT ====================

    describe('Account type management', () => {
        it('should promote student to officer', async () => {
            const result = await service.updateAccountType('account-student-3', 'officer');
            expect(result).toBeDefined();
            expect(result.type).toBe('officer');
            expect(result.officers).toBeDefined();
        });

        it('should demote officer to student', async () => {
            const result = await service.updateAccountType('account-officer-1', 'student');
            expect(result).toBeDefined();
            expect(result.type).toBe('student');
        });

        it('should return null for non-existent account', async () => {
            const result = await service.updateAccountType('nonexistent', 'student');
            expect(result).toBeNull();
        });
    });
});
