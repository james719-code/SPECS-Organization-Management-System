/**
 * Unit tests for mock data integrity
 * Validates that all mock data aligns with the DATABASE.md schema
 */

import { describe, it, expect } from 'vitest';
import {
    mockCredentials,
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
    mockVolunteerRequests,
    mockUsers,
    getMockData,
    getMockDashboardStats
} from '../../shared/mock/mockData.js';

describe('Mock Data Integrity', () => {

    // ==================== CREDENTIALS ====================

    describe('mockCredentials', () => {
        it('should have matching entries for all mock accounts', () => {
            for (const account of mockAccounts) {
                if (account.email) {
                    const found = Object.keys(mockCredentials).some(
                        k => k.toLowerCase() === account.email.toLowerCase()
                    );
                    expect(found).toBe(true);
                }
            }
        });

        it('should have valid password strings', () => {
            for (const [, password] of Object.entries(mockCredentials)) {
                expect(typeof password).toBe('string');
                expect(password.length).toBeGreaterThan(0);
            }
        });
    });

    // ==================== ACCOUNTS ====================

    describe('mockAccounts', () => {
        it('should have all required fields', () => {
            for (const account of mockAccounts) {
                expect(account.$id).toBeDefined();
                expect(account.$createdAt).toBeDefined();
                expect(account.$updatedAt).toBeDefined();
                expect(account.username).toBeDefined();
                expect(['student', 'officer', 'admin']).toContain(account.type);
                expect(typeof account.verified).toBe('boolean');
                expect(typeof account.deactivated).toBe('boolean');
            }
        });

        it('should have unique IDs', () => {
            const ids = mockAccounts.map(a => a.$id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('should have admin account with admins relationship', () => {
            const admin = mockAccounts.find(a => a.type === 'admin');
            expect(admin).toBeDefined();
            expect(admin.admins).toBeDefined();
            expect(admin.students).toBeNull();
        });

        it('should have officer account with students and officers relationships', () => {
            const officer = mockAccounts.find(a => a.type === 'officer');
            expect(officer).toBeDefined();
            expect(officer.students).toBeDefined();
            expect(officer.officers).toBeDefined();
        });

        it('should have student accounts with students relationship', () => {
            const students = mockAccounts.filter(a => a.type === 'student');
            expect(students.length).toBeGreaterThanOrEqual(1);
            for (const student of students) {
                expect(student.students).toBeDefined();
                expect(student.officers).toBeNull();
                expect(student.admins).toBeNull();
            }
        });
    });

    // ==================== STUDENTS ====================

    describe('mockStudents', () => {
        it('should have all required fields', () => {
            for (const student of mockStudents) {
                expect(student.$id).toBeDefined();
                expect(student.name).toBeDefined();
                expect(typeof student.name).toBe('string');
                expect(student.student_id).toBeDefined();
                expect(typeof student.student_id).toBe('number');
                expect(typeof student.is_volunteer).toBe('boolean');
                expect([
                    'none', 'pending', 'approved', 'rejected', 'backout_pending'
                ]).toContain(student.volunteer_request_status);
            }
        });

        it('should have valid year levels', () => {
            for (const student of mockStudents) {
                if (student.yearLevel !== null) {
                    expect(student.yearLevel).toBeGreaterThanOrEqual(1);
                    expect(student.yearLevel).toBeLessThanOrEqual(4);
                }
            }
        });

        it('should have one student who IS a volunteer and approved', () => {
            const volunteer = mockStudents.find(s => s.is_volunteer && s.volunteer_request_status === 'approved');
            expect(volunteer).toBeDefined();
        });

        it('should have one student with pending volunteer request', () => {
            const pending = mockStudents.find(s => s.volunteer_request_status === 'pending');
            expect(pending).toBeDefined();
        });

        it('should have one student with backout_pending status', () => {
            const backout = mockStudents.find(s => s.volunteer_request_status === 'backout_pending');
            expect(backout).toBeDefined();
        });
    });

    // ==================== OFFICERS ====================

    describe('mockOfficers', () => {
        it('should have all required fields', () => {
            for (const officer of mockOfficers) {
                expect(officer.$id).toBeDefined();
                expect(officer.students).toBeDefined();
                expect(typeof officer.isSchedule).toBe('boolean');
                expect(officer.position).toBeDefined();
            }
        });

        it('should reference valid students', () => {
            for (const officer of mockOfficers) {
                const studentId = officer.students?.$id;
                expect(studentId).toBeDefined();
                const student = mockStudents.find(s => s.$id === studentId);
                expect(student).toBeDefined();
            }
        });
    });

    // ==================== ADMINS ====================

    describe('mockAdmins', () => {
        it('should have all required fields', () => {
            for (const admin of mockAdmins) {
                expect(admin.$id).toBeDefined();
                expect(admin.fullName).toBeDefined();
                expect(admin.email).toBeDefined();
                expect(admin.email).toContain('@');
            }
        });
    });

    // ==================== EVENTS ====================

    describe('mockEvents', () => {
        it('should have all required fields', () => {
            for (const event of mockEvents) {
                expect(event.$id).toBeDefined();
                expect(event.event_name).toBeDefined();
                expect(typeof event.event_ended).toBe('boolean');
                expect(typeof event.archived).toBe('boolean');
            }
        });

        it('should have valid dates', () => {
            for (const event of mockEvents) {
                if (event.date_to_held) {
                    const date = new Date(event.date_to_held);
                    expect(date.toString()).not.toBe('Invalid Date');
                }
            }
        });

        it('should have at least one upcoming and one past event', () => {
            const upcoming = mockEvents.filter(e => !e.event_ended);
            const past = mockEvents.filter(e => e.event_ended);
            expect(upcoming.length).toBeGreaterThanOrEqual(1);
            expect(past.length).toBeGreaterThanOrEqual(1);
        });

        it('should have collab as array when present', () => {
            for (const event of mockEvents) {
                if (event.collab) {
                    expect(Array.isArray(event.collab)).toBe(true);
                }
            }
        });
    });

    // ==================== PAYMENTS ====================

    describe('mockPayments', () => {
        it('should have all required fields', () => {
            for (const payment of mockPayments) {
                expect(payment.$id).toBeDefined();
                expect(payment.price).toBeDefined();
                expect(typeof payment.price).toBe('number');
                expect(payment.item_name).toBeDefined();
                expect(payment.quantity).toBeGreaterThanOrEqual(1);
                expect(typeof payment.is_paid).toBe('boolean');
                expect(typeof payment.is_event).toBe('boolean');
            }
        });

        it('should have valid payment references', () => {
            for (const payment of mockPayments) {
                if (payment.students) {
                    const studentId = payment.students.$id;
                    const student = mockStudents.find(s => s.$id === studentId);
                    expect(student).toBeDefined();
                }
                if (payment.events) {
                    const eventId = payment.events.$id;
                    const event = mockEvents.find(e => e.$id === eventId);
                    expect(event).toBeDefined();
                }
            }
        });

        it('should have both paid and unpaid payments', () => {
            const paid = mockPayments.filter(p => p.is_paid);
            const unpaid = mockPayments.filter(p => !p.is_paid);
            expect(paid.length).toBeGreaterThanOrEqual(1);
            expect(unpaid.length).toBeGreaterThanOrEqual(1);
        });

        it('should have verified_by_name for paid payments', () => {
            const paidPayments = mockPayments.filter(p => p.is_paid);
            for (const payment of paidPayments) {
                expect(payment.verified_by_name).toBeDefined();
            }
        });
    });

    // ==================== ATTENDANCE ====================

    describe('mockAttendance', () => {
        it('should have all required fields', () => {
            for (const record of mockAttendance) {
                expect(record.$id).toBeDefined();
                expect(record.students).toBeDefined();
                expect(record.events).toBeDefined();
                expect(record.name_attendance).toBeDefined();
            }
        });

        it('should reference valid students', () => {
            for (const record of mockAttendance) {
                const studentId = record.students.$id;
                const student = mockStudents.find(s => s.$id === studentId);
                expect(student).toBeDefined();
            }
        });

        it('should reference valid events', () => {
            for (const record of mockAttendance) {
                const eventId = record.events.$id;
                const event = mockEvents.find(e => e.$id === eventId);
                expect(event).toBeDefined();
            }
        });
    });

    // ==================== STORIES ====================

    describe('mockStories', () => {
        it('should have all required fields', () => {
            for (const story of mockStories) {
                expect(story.$id).toBeDefined();
                expect(story.title).toBeDefined();
                expect(typeof story.isAccepted).toBe('boolean');
                expect(typeof story.officerApproval).toBe('boolean');
                expect(typeof story.adminApproval).toBe('boolean');
                expect(story.students).toBeDefined();
            }
        });

        it('should reference valid students', () => {
            for (const story of mockStories) {
                const studentId = story.students.$id;
                const student = mockStudents.find(s => s.$id === studentId);
                expect(student).toBeDefined();
            }
        });

        it('should have stories with different approval states', () => {
            const approved = mockStories.filter(s => s.isAccepted);
            const pending = mockStories.filter(s => !s.isAccepted);
            expect(approved.length).toBeGreaterThanOrEqual(1);
            expect(pending.length).toBeGreaterThanOrEqual(1);
        });

        it('should have meaningful data for meaning arrays', () => {
            for (const story of mockStories) {
                if (story.meaning) {
                    expect(Array.isArray(story.meaning)).toBe(true);
                }
            }
        });
    });

    // ==================== EXPENSES ====================

    describe('mockExpenses', () => {
        it('should have all required fields', () => {
            for (const expense of mockExpenses) {
                expect(expense.$id).toBeDefined();
                expect(expense.name).toBeDefined();
                expect(typeof expense.price).toBe('number');
                expect(expense.quantity).toBeGreaterThanOrEqual(1);
                expect(typeof expense.isEvent).toBe('boolean');
            }
        });
    });

    // ==================== REVENUE ====================

    describe('mockRevenue', () => {
        it('should have all required fields', () => {
            for (const rev of mockRevenue) {
                expect(rev.$id).toBeDefined();
                expect(rev.name).toBeDefined();
                expect(typeof rev.price).toBe('number');
                expect(typeof rev.isEvent).toBe('boolean');
            }
        });
    });

    // ==================== FILES ====================

    describe('mockFiles', () => {
        it('should have all required fields', () => {
            for (const file of mockFiles) {
                expect(file.$id).toBeDefined();
                expect(file.fileName).toBeDefined();
                expect(file.uploader).toBeDefined();
            }
        });
    });

    // ==================== TASKS ====================

    describe('mockTasks', () => {
        it('should have all required fields', () => {
            for (const task of mockTasks) {
                expect(task.$id).toBeDefined();
                expect(task.name).toBeDefined();
                expect(typeof task.is_done).toBe('boolean');
            }
        });

        it('should have at least one completed and one pending task', () => {
            const done = mockTasks.filter(t => t.is_done);
            const pending = mockTasks.filter(t => !t.is_done);
            expect(done.length).toBeGreaterThanOrEqual(1);
            expect(pending.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ==================== STARTING BALANCES ====================

    describe('mockStartingBalances', () => {
        it('should have all required fields', () => {
            for (const balance of mockStartingBalances) {
                expect(balance.$id).toBeDefined();
                expect(typeof balance.amount).toBe('number');
                expect(balance.start_first_sem).toBeDefined();
                expect(balance.end_first_sem).toBeDefined();
                expect(balance.start_second_sem).toBeDefined();
                expect(balance.end_second_sem).toBeDefined();
            }
        });

        it('should have valid date ranges', () => {
            for (const balance of mockStartingBalances) {
                const firstStart = new Date(balance.start_first_sem);
                const firstEnd = new Date(balance.end_first_sem);
                const secondStart = new Date(balance.start_second_sem);
                const secondEnd = new Date(balance.end_second_sem);

                expect(firstStart.getTime()).toBeLessThan(firstEnd.getTime());
                expect(secondStart.getTime()).toBeLessThan(secondEnd.getTime());
                expect(firstEnd.getTime()).toBeLessThan(secondStart.getTime());
            }
        });

        it('should have valid amounts', () => {
            for (const balance of mockStartingBalances) {
                expect(balance.amount).toBeGreaterThan(0);
            }
        });
    });

    // ==================== getMockData HELPER ====================

    describe('getMockData()', () => {
        it('should return accounts for accounts collection', () => {
            expect(getMockData('accounts')).toBe(mockAccounts);
            expect(getMockData('6858feff002fb157e032')).toBe(mockAccounts);
        });

        it('should return students for students collection', () => {
            expect(getMockData('students')).toBe(mockStudents);
            expect(getMockData('6885e221000f3e6a5033')).toBe(mockStudents);
        });

        it('should return events for events collection', () => {
            expect(getMockData('events')).toBe(mockEvents);
            expect(getMockData('6859026800232b07755d')).toBe(mockEvents);
        });

        it('should return payments for payments collection', () => {
            expect(getMockData('payments')).toBe(mockPayments);
            expect(getMockData('6885e333002bfa41803b')).toBe(mockPayments);
        });

        it('should return empty array for unknown collection', () => {
            expect(getMockData('unknown_xyz')).toEqual([]);
        });

        it('should return empty array for empty/undefined', () => {
            expect(getMockData('')).toEqual([]);
            expect(getMockData(null)).toEqual([]);
            expect(getMockData(undefined)).toEqual([]);
        });

        it('should fuzzy match by partial name', () => {
            expect(getMockData('account_something')).toBe(mockAccounts);
            expect(getMockData('event_list')).toBe(mockEvents);
            expect(getMockData('payment_records')).toBe(mockPayments);
            expect(getMockData('student_profiles')).toBe(mockStudents);
            expect(getMockData('starting_balances_list')).toBe(mockStartingBalances);
        });
    });

    // ==================== getMockDashboardStats HELPER ====================

    describe('getMockDashboardStats()', () => {
        it('should return all stat properties', () => {
            const stats = getMockDashboardStats();
            expect(stats.totalAccounts).toBe(mockAccounts.length);
            expect(stats.totalStudents).toBe(mockStudents.length);
            expect(stats.totalOfficers).toBe(mockOfficers.length);
            expect(stats.totalEvents).toBe(mockEvents.length);
            expect(stats.totalFiles).toBe(mockFiles.length);
            expect(stats.totalPayments).toBe(mockPayments.length);
            expect(stats.totalStories).toBe(mockStories.length);
        });

        it('should have correct payment counts', () => {
            const stats = getMockDashboardStats();
            const expectedPaid = mockPayments.filter(p => p.is_paid).length;
            const expectedPending = mockPayments.filter(p => !p.is_paid).length;
            expect(stats.paidPayments).toBe(expectedPaid);
            expect(stats.pendingPayments).toBe(expectedPending);
        });

        it('should have correct revenue and expense totals', () => {
            const stats = getMockDashboardStats();
            const expectedRevenue = mockRevenue.reduce((sum, r) =>
                sum + (r.price * (r.quantity || 1)), 0);
            const expectedExpenses = mockExpenses.reduce((sum, e) =>
                sum + (e.price * (e.quantity || 1)), 0);
            expect(stats.totalRevenue).toBe(expectedRevenue);
            expect(stats.totalExpenses).toBe(expectedExpenses);
        });

        it('should have non-negative values', () => {
            const stats = getMockDashboardStats();
            for (const [key, value] of Object.entries(stats)) {
                if (typeof value === 'number') {
                    expect(value).toBeGreaterThanOrEqual(0);
                }
            }
        });
    });

    // ==================== mockUsers (COMPATIBILITY) ====================

    describe('mockUsers', () => {
        it('should map all accounts to users', () => {
            expect(mockUsers.length).toBe(mockAccounts.length);
        });

        it('should include all required user fields', () => {
            for (const user of mockUsers) {
                expect(user.$id).toBeDefined();
                expect(user.email).toBeDefined();
                expect(user.name).toBeDefined();
                expect(user.type).toBeDefined();
                expect(user.verified).toBeDefined();
            }
        });

        it('should have a user for each credential', () => {
            for (const email of Object.keys(mockCredentials)) {
                const user = mockUsers.find(u =>
                    u.email.toLowerCase() === email.toLowerCase()
                );
                expect(user).toBeDefined();
            }
        });
    });

    // ==================== CROSS-REFERENTIAL INTEGRITY ====================

    describe('Cross-referential integrity', () => {
        it('should have students referenced by accounts', () => {
            for (const account of mockAccounts) {
                if (account.students) {
                    const studentId = account.students.$id;
                    const student = mockStudents.find(s => s.$id === studentId);
                    expect(student).toBeDefined();
                }
            }
        });

        it('should have officers referenced by accounts', () => {
            for (const account of mockAccounts) {
                if (account.officers) {
                    const officerId = account.officers.$id;
                    const officer = mockOfficers.find(o => o.$id === officerId);
                    expect(officer).toBeDefined();
                }
            }
        });

        it('should have officers referencing valid students', () => {
            for (const officer of mockOfficers) {
                const studentId = officer.students?.$id;
                if (studentId) {
                    const student = mockStudents.find(s => s.$id === studentId);
                    expect(student).toBeDefined();
                }
            }
        });

        it('should have stories referencing valid students', () => {
            for (const story of mockStories) {
                const studentId = story.students?.$id;
                if (studentId) {
                    const student = mockStudents.find(s => s.$id === studentId);
                    expect(student).toBeDefined();
                }
            }
        });

        it('should have payments referencing valid students', () => {
            for (const payment of mockPayments) {
                if (payment.students) {
                    const studentId = payment.students.$id;
                    const student = mockStudents.find(s => s.$id === studentId);
                    expect(student).toBeDefined();
                }
            }
        });
    });
});
