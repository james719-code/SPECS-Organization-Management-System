export const mockUsers = [
    {
        $id: 'user-admin-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        email: 'admin@specs.org',
        name: 'Admin User',
        username: 'admin',
        fullname: 'Admin User',
        type: 'admin',
        verified: true,
        emailVerification: true,
        students: null,
        yearLevel: 'Staff',
        gender: 'Male',
        haveResume: false,
        haveSchedule: false
    },
    {
        $id: 'user-officer-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        email: 'officer@specs.org',
        name: 'Maria Santos',
        username: 'msantos',
        fullname: 'Maria Santos',
        type: 'officer',
        verified: true,
        emailVerification: true,
        students: null,
        yearLevel: '4th Year',
        gender: 'Female',
        haveResume: true,
        haveSchedule: true
    },
    {
        $id: 'user-student-1',
        $createdAt: '2025-10-01T00:00:00.000Z',
        $updatedAt: '2025-12-20T00:00:00.000Z',
        email: 'john.doe@student.edu',
        name: 'John Doe',
        username: 'johndoe',
        fullname: 'John Doe',
        type: 'student',
        verified: true,
        emailVerification: true,
        students: {
            $id: 'student-1',
            name: 'John Doe',
            studentId: '2024-12345',
            course: 'BS Computer Science',
            year: '3rd Year'
        },
        yearLevel: '3rd Year',
        gender: 'Male',
        haveResume: true,
        haveSchedule: true
    },
    {
        $id: 'user-student-2',
        $createdAt: '2025-10-05T00:00:00.000Z',
        $updatedAt: '2025-12-18T00:00:00.000Z',
        email: 'jane.smith@student.edu',
        name: 'Jane Smith',
        username: 'janesmith',
        fullname: 'Jane Smith',
        type: 'student',
        verified: true,
        emailVerification: true,
        students: {
            $id: 'student-2',
            name: 'Jane Smith',
            studentId: '2024-12346',
            course: 'BS Information Technology',
            year: '2nd Year'
        },
        yearLevel: '2nd Year',
        gender: 'Female',
        haveResume: false,
        haveSchedule: true
    },
    {
        $id: 'user-student-3',
        $createdAt: '2025-10-10T00:00:00.000Z',
        $updatedAt: '2025-12-22T00:00:00.000Z',
        email: 'mike.johnson@student.edu',
        name: 'Mike Johnson',
        username: 'mikej',
        fullname: 'Mike Johnson',
        type: 'student',
        verified: false,
        emailVerification: true,
        students: {
            $id: 'student-3',
            name: 'Mike Johnson',
            studentId: '2024-12347',
            course: 'BS Computer Engineering',
            year: '4th Year'
        },
        yearLevel: '4th Year',
        gender: 'Male',
        haveResume: true,
        haveSchedule: false
    }
];

export const mockStudents = [
    {
        $id: 'student-1',
        $createdAt: '2025-10-01T00:00:00.000Z',
        name: 'John Doe',
        studentId: '2024-12345',
        course: 'BS Computer Science',
        year: '3rd Year',
        section: 'A',
        email: 'john.doe@student.edu',
        phone: '+639123456789',
        address: '123 Main St, City',
        status: 'active',
        membershipStatus: 'paid'
    },
    {
        $id: 'student-2',
        $createdAt: '2025-10-05T00:00:00.000Z',
        name: 'Jane Smith',
        studentId: '2024-12346',
        course: 'BS Information Technology',
        year: '2nd Year',
        section: 'B',
        email: 'jane.smith@student.edu',
        phone: '+639234567890',
        address: '456 Oak Ave, City',
        status: 'active',
        membershipStatus: 'pending'
    },
    {
        $id: 'student-3',
        $createdAt: '2025-10-10T00:00:00.000Z',
        name: 'Mike Johnson',
        studentId: '2024-12347',
        course: 'BS Computer Engineering',
        year: '4th Year',
        section: 'A',
        email: 'mike.johnson@student.edu',
        phone: '+639345678901',
        address: '789 Pine Rd, City',
        status: 'active',
        membershipStatus: 'paid'
    }
];

export const mockEvents = [
    {
        $id: 'event-1',
        $createdAt: '2025-12-01T00:00:00.000Z',
        event_name: 'Annual Tech Summit 2026',
        title: 'Annual Tech Summit 2026',
        description: 'Join us for the biggest tech event of the year featuring industry speakers, workshops, and networking opportunities.',
        date_to_held: '2026-02-15T09:00:00.000Z',
        date_end: '2026-02-15T17:00:00.000Z',
        location: 'Main Auditorium',
        image_file: null,
        added_by: 'user-officer-1',
        event_ended: false,
        collab: ['GDSC', 'AWS Cloud Club']
    },
    {
        $id: 'event-2',
        $createdAt: '2025-11-15T00:00:00.000Z',
        event_name: 'Coding Bootcamp: Web Development',
        title: 'Coding Bootcamp: Web Development',
        description: 'A hands-on workshop covering modern web development with HTML, CSS, and JavaScript.',
        date_to_held: '2026-01-20T13:00:00.000Z',
        date_end: '2026-01-20T18:00:00.000Z',
        location: 'Computer Lab 3',
        image_file: null,
        added_by: 'user-officer-1',
        event_ended: false,
        collab: []
    },
    {
        $id: 'event-3',
        $createdAt: '2025-10-01T00:00:00.000Z',
        event_name: 'General Assembly Q4 2025',
        title: 'General Assembly Q4 2025',
        description: 'Monthly general assembly for all SPECS members. Important announcements and updates.',
        date_to_held: '2025-12-20T14:00:00.000Z',
        date_end: '2025-12-20T16:00:00.000Z',
        location: 'Lecture Hall A',
        image_file: null,
        added_by: 'user-admin-1',
        event_ended: true,
        collab: []
    }
];

export const mockStories = [
    {
        $id: 'story-1',
        $createdAt: '2025-12-15T00:00:00.000Z',
        title: 'Student Innovation Award Winner',
        summary: 'SPECS member wins national innovation competition with IoT project',
        content: 'We are proud to announce that John Doe, a 3rd year Computer Science student and active SPECS member, has won the National Student Innovation Award.',
        imageUrl: null,
        author: 'SPECS Media Team',
        publishedAt: '2025-12-15T00:00:00.000Z',
        tags: ['achievement', 'innovation', 'competition'],
        featured: true
    },
    {
        $id: 'story-2',
        $createdAt: '2025-11-28T00:00:00.000Z',
        title: 'Successful Tech Talk Series Concluded',
        summary: 'Record attendance at SPECS Tech Talk series featuring industry experts',
        content: 'The SPECS Tech Talk series concluded last week with record attendance figures. Over 500 students participated across the five sessions.',
        imageUrl: null,
        author: 'SPECS Media Team',
        publishedAt: '2025-11-28T00:00:00.000Z',
        tags: ['event', 'education', 'tech-talk'],
        featured: false
    }
];

export const mockPayments = [
    {
        $id: 'payment-1',
        $createdAt: '2026-01-01T00:00:00.000Z',
        students: 'student-1',
        is_event: false,
        events: null,
        activity: 'Membership Fee',
        item_name: 'SPECS Membership 2nd Sem',
        quantity: 1,
        price: 500,
        is_paid: true,
        date_paid: '2026-01-01T00:00:00.000Z'
    },
    {
        $id: 'payment-2',
        $createdAt: '2025-12-28T00:00:00.000Z',
        students: 'student-2',
        is_event: false,
        events: null,
        activity: 'Membership Fee',
        item_name: 'SPECS Membership 2nd Sem',
        quantity: 1,
        price: 500,
        is_paid: false,
        date_paid: null
    },
    {
        $id: 'payment-3',
        $createdAt: '2025-12-20T00:00:00.000Z',
        students: 'student-3',
        is_event: true,
        events: 'event-1',
        activity: null,
        item_name: 'Tech Summit Registration',
        quantity: 1,
        price: 200,
        is_paid: true,
        date_paid: '2025-12-20T00:00:00.000Z'
    }
];

export const mockRevenue = [
    {
        $id: 'revenue-1',
        $createdAt: '2026-01-01T00:00:00.000Z',
        name: 'Membership Fee (John Doe)',
        isEvent: false,
        event: null,
        activity: 'Membership Fee',
        quantity: 1,
        price: 500,
        date_earned: '2026-01-01T00:00:00.000Z',
        recorder: 'user-officer-1'
    },
    {
        $id: 'revenue-2',
        $createdAt: '2025-12-20T00:00:00.000Z',
        name: 'Tech Summit Registration (Mike Johnson)',
        isEvent: true,
        event: 'event-1',
        activity: null,
        quantity: 1,
        price: 200,
        date_earned: '2025-12-20T00:00:00.000Z',
        recorder: 'user-officer-1'
    }
];

export const mockExpenses = [
    {
        $id: 'expense-1',
        $createdAt: '2025-12-15T00:00:00.000Z',
        name: 'Event Supplies',
        isEvent: true,
        event: 'event-3',
        activity_name: null,
        quantity: 1,
        price: 1500,
        date_buy: '2025-12-15T00:00:00.000Z',
        recorder: 'user-officer-1'
    },
    {
        $id: 'expense-2',
        $createdAt: '2025-12-10T00:00:00.000Z',
        name: 'Printing Materials',
        isEvent: false,
        event: null,
        activity_name: 'Marketing',
        quantity: 100,
        price: 500,
        date_buy: '2025-12-10T00:00:00.000Z',
        recorder: 'user-admin-1'
    }
];

export const mockFiles = [
    {
        $id: 'file-1',
        fileName: 'Meeting Minutes - January 2026.pdf',
        name: 'Meeting Minutes - January 2026.pdf',
        mimeType: 'application/pdf',
        sizeOriginal: 245678,
        $createdAt: '2026-01-10T00:00:00.000Z',
        fileID: 'file-1',
        uploader: 'user-admin-1',
        description: 'General assembly meeting minutes for January 2026'
    },
    {
        $id: 'file-2',
        fileName: 'SPECS Constitution 2025.pdf',
        name: 'SPECS Constitution 2025.pdf',
        mimeType: 'application/pdf',
        sizeOriginal: 512340,
        $createdAt: '2025-09-01T00:00:00.000Z',
        fileID: 'file-2',
        uploader: 'user-admin-1',
        description: 'Official SPECS constitution and bylaws'
    },
    {
        $id: 'file-3',
        fileName: 'Budget Report Q4 2025.xlsx',
        name: 'Budget Report Q4 2025.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeOriginal: 89450,
        $createdAt: '2025-12-28T00:00:00.000Z',
        fileID: 'file-3',
        uploader: 'user-officer-1',
        description: 'Quarterly budget report for Q4 2025'
    }
];

export const mockAttendance = [
    {
        $id: 'attendance-1',
        events: 'event-3',
        students: 'student-1',
        officers: 'user-officer-1',
        name_attendance: 'General Assembly Q4 2025',
        $createdAt: '2025-12-20T14:05:00.000Z'
    },
    {
        $id: 'attendance-2',
        events: 'event-3',
        students: 'student-2',
        officers: 'user-officer-1',
        name_attendance: 'General Assembly Q4 2025',
        $createdAt: '2025-12-20T14:10:00.000Z'
    },
    {
        $id: 'attendance-3',
        events: 'event-3',
        students: 'student-3',
        officers: 'user-officer-1',
        name_attendance: 'General Assembly Q4 2025',
        $createdAt: '2025-12-20T14:30:00.000Z'
    }
];

export function getMockData(collectionId) {
    const collections = {
        'accounts': mockUsers,
        'students': mockStudents,
        'events': mockEvents,
        'stories': mockStories,
        'payments': mockPayments,
        'revenue': mockRevenue,
        'expenses': mockExpenses,
        'files': mockFiles,
        'attendance': mockAttendance
    };

    return collections[collectionId] || [];
}

export function getMockDashboardStats() {
    return {
        totalAccounts: mockUsers.length,
        totalStudents: mockUsers.filter(u => u.type === 'student').length,
        totalOfficers: mockUsers.filter(u => u.type === 'officer').length,
        verifiedAccounts: mockUsers.filter(u => u.verified).length,
        pendingAccounts: mockUsers.filter(u => !u.verified).length,
        totalEvents: mockEvents.length,
        upcomingEvents: mockEvents.filter(e => !e.event_ended).length,
        completedEvents: mockEvents.filter(e => e.event_ended).length,
        totalFiles: mockFiles.length,
        totalPayments: mockPayments.length,
        paidPayments: mockPayments.filter(p => p.is_paid).length,
        pendingPayments: mockPayments.filter(p => !p.is_paid).length,
        totalRevenue: mockRevenue.reduce((sum, r) => sum + (r.price * r.quantity), 0),
        totalExpenses: mockExpenses.reduce((sum, e) => sum + (e.price * e.quantity), 0)
    };
}
