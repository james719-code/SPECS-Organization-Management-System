// Mock data aligned with DATABASE.md schema

// Mock credentials for dev login (email -> password)
export const mockCredentials = {
    'admin@specs.org': 'admin123',
    'maria.santos@student.edu': 'officer123',
    'john.doe@student.edu': 'student123',      // Student who IS a volunteer
    'mike.johnson@student.edu': 'student456'   // Student who is NOT a volunteer
};


// Collection: accounts (6858feff002fb157e032)
export const mockAccounts = [
    {
        $id: 'account-admin-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        username: 'admin',
        type: 'admin',
        verified: true,
        students: null,
        admins: { $id: 'admin-1' },
        officers: null
    },
    {
        $id: 'account-officer-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        username: 'msantos',
        type: 'officer',
        verified: true,
        students: { $id: 'student-officer-1' },
        admins: null,
        officers: { $id: 'officer-1' }
    },
    {
        $id: 'account-student-1',
        $createdAt: '2025-10-01T00:00:00.000Z',
        $updatedAt: '2025-12-20T00:00:00.000Z',
        username: 'johndoe',
        type: 'student',
        verified: true,
        students: { $id: 'student-1' },
        admins: null,
        officers: null
    },
    {
        $id: 'account-student-2',
        $createdAt: '2025-10-05T00:00:00.000Z',
        $updatedAt: '2025-12-18T00:00:00.000Z',
        username: 'janesmith',
        type: 'student',
        verified: true,
        students: { $id: 'student-2' },
        admins: null,
        officers: null
    },
    {
        $id: 'account-student-3',
        $createdAt: '2025-10-10T00:00:00.000Z',
        $updatedAt: '2025-12-22T00:00:00.000Z',
        username: 'mikej',
        type: 'student',
        verified: false,
        students: { $id: 'student-3' },
        admins: null,
        officers: null
    }
];

// Collection: students (6885e221000f3e6a5033)
export const mockStudents = [
    {
        $id: 'student-officer-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        name: 'Maria Santos',
        email: 'maria.santos@student.edu',
        section: 'BSCS-4A',
        address: '789 Officer Ave, City',
        yearLevel: 4,
        student_id: 20210001,
        is_volunteer: true,
        volunteer_request_status: 'approved',
        payments: []
    },
    {
        $id: 'student-1',
        $createdAt: '2025-10-01T00:00:00.000Z',
        $updatedAt: '2025-12-20T00:00:00.000Z',
        name: 'John Doe',
        email: 'john.doe@student.edu',
        section: 'BSCS-3A',
        address: '123 Main St, City',
        yearLevel: 3,
        student_id: 20240001,
        is_volunteer: true,
        volunteer_request_status: 'approved',
        payments: ['payment-1']
    },
    {
        $id: 'student-2',
        $createdAt: '2025-10-05T00:00:00.000Z',
        $updatedAt: '2025-12-18T00:00:00.000Z',
        name: 'Jane Smith',
        email: 'jane.smith@student.edu',
        section: 'BSCS-2B',
        address: '456 Oak Ave, City',
        yearLevel: 2,
        student_id: 20240002,
        is_volunteer: false,
        volunteer_request_status: 'pending',
        payments: ['payment-2']
    },
    {
        $id: 'student-3',
        $createdAt: '2025-10-10T00:00:00.000Z',
        $updatedAt: '2025-12-22T00:00:00.000Z',
        name: 'Mike Johnson',
        email: 'mike.johnson@student.edu',
        section: 'BSCS-4A',
        address: '789 Pine Rd, City',
        yearLevel: 4,
        student_id: 20240003,
        is_volunteer: false,
        volunteer_request_status: 'none',
        payments: ['payment-3']
    }
];

// Collection: officers
export const mockOfficers = [
    {
        $id: 'officer-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        students: { $id: 'student-officer-1' },
        isSchedule: true,
        scheduleId: 'schedule-officer-1'
    }
];

// Collection: admins
export const mockAdmins = [
    {
        $id: 'admin-1',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        fullName: 'Admin User',
        email: 'admin@specs.org',
        contactNumber: '+639123456780'
    }
];

// Collection: events (6859026800232b07755d)
export const mockEvents = [
    {
        $id: 'event-1',
        $createdAt: '2025-12-01T00:00:00.000Z',
        $updatedAt: '2025-12-01T00:00:00.000Z',
        event_name: 'Annual Tech Summit 2026',
        date_to_held: '2026-02-15T09:00:00.000Z',
        added_by: 'account-officer-1',
        image_file: null,
        description: 'Join us for the biggest tech event of the year featuring industry speakers, workshops, and networking opportunities.',
        event_ended: false,
        collab: ['GDSC', 'AWS Cloud Club'],
        related_links: ['https://techsummit.specs.org'],
        meaning: ['Tech Summit', 'Technology Conference']
    },
    {
        $id: 'event-2',
        $createdAt: '2025-11-15T00:00:00.000Z',
        $updatedAt: '2025-11-15T00:00:00.000Z',
        event_name: 'Coding Bootcamp: Web Development',
        date_to_held: '2026-01-20T13:00:00.000Z',
        added_by: 'account-officer-1',
        image_file: null,
        description: 'A hands-on workshop covering modern web development with HTML, CSS, and JavaScript.',
        event_ended: false,
        collab: [],
        related_links: [],
        meaning: []
    },
    {
        $id: 'event-3',
        $createdAt: '2025-10-01T00:00:00.000Z',
        $updatedAt: '2025-12-20T16:00:00.000Z',
        event_name: 'General Assembly Q4 2025',
        date_to_held: '2025-12-20T14:00:00.000Z',
        added_by: 'account-admin-1',
        image_file: null,
        description: 'Monthly general assembly for all SPECS members. Important announcements and updates.',
        event_ended: true,
        collab: [],
        related_links: [],
        meaning: []
    }
];

// Collection: attendance
export const mockAttendance = [
    {
        $id: 'attendance-1',
        $createdAt: '2025-12-20T14:05:00.000Z',
        $updatedAt: '2025-12-20T14:05:00.000Z',
        students: { $id: 'student-1' },
        events: { $id: 'event-3' },
        name_attendance: 'General Assembly Q4 2025',
        officers: [{ $id: 'officer-1' }]
    },
    {
        $id: 'attendance-2',
        $createdAt: '2025-12-20T14:10:00.000Z',
        $updatedAt: '2025-12-20T14:10:00.000Z',
        students: { $id: 'student-2' },
        events: { $id: 'event-3' },
        name_attendance: 'General Assembly Q4 2025',
        officers: [{ $id: 'officer-1' }]
    },
    {
        $id: 'attendance-3',
        $createdAt: '2025-12-20T14:30:00.000Z',
        $updatedAt: '2025-12-20T14:30:00.000Z',
        students: { $id: 'student-3' },
        events: { $id: 'event-3' },
        name_attendance: 'General Assembly Q4 2025',
        officers: [{ $id: 'officer-1' }]
    }
];

// Collection: payments (6885e333002bfa41803b)
export const mockPayments = [
    {
        $id: 'payment-1',
        $createdAt: '2026-01-01T00:00:00.000Z',
        $updatedAt: '2026-01-01T00:00:00.000Z',
        students: { $id: 'student-1' },
        is_event: false,
        activity: 'Membership Fee',
        price: 500,
        item_name: 'SPECS Membership 2nd Sem',
        quantity: 1,
        date_paid: '2026-01-01T00:00:00.000Z',
        events: null,
        officers: { $id: 'officer-1' },
        is_outside_bscs: false,
        non_bscs_name: null,
        is_paid: true,
        modal_paid: 'cash'
    },
    {
        $id: 'payment-2',
        $createdAt: '2025-12-28T00:00:00.000Z',
        $updatedAt: '2025-12-28T00:00:00.000Z',
        students: { $id: 'student-2' },
        is_event: false,
        activity: 'Membership Fee',
        price: 500,
        item_name: 'SPECS Membership 2nd Sem',
        quantity: 1,
        date_paid: null,
        events: null,
        officers: null,
        is_outside_bscs: false,
        non_bscs_name: null,
        is_paid: false,
        modal_paid: null
    },
    {
        $id: 'payment-3',
        $createdAt: '2025-12-20T00:00:00.000Z',
        $updatedAt: '2025-12-20T00:00:00.000Z',
        students: { $id: 'student-3' },
        is_event: true,
        activity: null,
        price: 200,
        item_name: 'Tech Summit Registration',
        quantity: 1,
        date_paid: '2025-12-20T00:00:00.000Z',
        events: { $id: 'event-1' },
        officers: { $id: 'officer-1' },
        is_outside_bscs: false,
        non_bscs_name: null,
        is_paid: true,
        modal_paid: 'gcash'
    }
];

// Collection: expenses (685a5c8700349613807e)
export const mockExpenses = [
    {
        $id: 'expense-1',
        $createdAt: '2025-12-15T00:00:00.000Z',
        $updatedAt: '2025-12-15T00:00:00.000Z',
        price: 1500,
        quantity: 1,
        name: 'Event Supplies',
        date_buy: '2025-12-15T00:00:00.000Z',
        isEvent: true,
        activity_name: null,
        events: { $id: 'event-3' }
    },
    {
        $id: 'expense-2',
        $createdAt: '2025-12-10T00:00:00.000Z',
        $updatedAt: '2025-12-10T00:00:00.000Z',
        price: 500,
        quantity: 100,
        name: 'Printing Materials',
        date_buy: '2025-12-10T00:00:00.000Z',
        isEvent: false,
        activity_name: 'Marketing',
        events: null
    }
];

// Collection: revenue (685a5c7b000cb98504a2)
export const mockRevenue = [
    {
        $id: 'revenue-1',
        $createdAt: '2026-01-01T00:00:00.000Z',
        $updatedAt: '2026-01-01T00:00:00.000Z',
        name: 'Membership Fee (John Doe)',
        isEvent: false,
        event: null,
        activity: 'Membership Fee',
        quantity: 1,
        price: 500,
        date_earned: '2026-01-01T00:00:00.000Z',
        recorder: 'account-officer-1'
    },
    {
        $id: 'revenue-2',
        $createdAt: '2025-12-20T00:00:00.000Z',
        $updatedAt: '2025-12-20T00:00:00.000Z',
        name: 'Tech Summit Registration (Mike Johnson)',
        isEvent: true,
        event: 'event-1',
        activity: null,
        quantity: 1,
        price: 200,
        date_earned: '2025-12-20T00:00:00.000Z',
        recorder: 'account-officer-1'
    }
];

// Collection: stories
export const mockStories = [
    {
        $id: 'story-1',
        $createdAt: '2025-12-15T00:00:00.000Z',
        $updatedAt: '2025-12-16T00:00:00.000Z',
        post_description: 'SPECS member wins national innovation competition with IoT project',
        image_bucket: null,
        isAccepted: true,
        title: 'Student Innovation Award Winner',
        post_details: 'We are proud to announce that John Doe, a 3rd year Computer Science student and active SPECS member, has won the National Student Innovation Award for his groundbreaking IoT project that monitors air quality in urban areas.',
        related_links: ['https://innovation.edu.ph/winners-2025'],
        meaning: ['achievement', 'innovation', 'competition'],
        students: { $id: 'student-1' }
    },
    {
        $id: 'story-2',
        $createdAt: '2025-11-28T00:00:00.000Z',
        $updatedAt: '2025-11-29T00:00:00.000Z',
        post_description: 'Record attendance at SPECS Tech Talk series featuring industry experts',
        image_bucket: null,
        isAccepted: true,
        title: 'Successful Tech Talk Series Concluded',
        post_details: 'The SPECS Tech Talk series concluded last week with record attendance figures. Over 500 students participated across the five sessions, engaging with industry experts from leading tech companies.',
        related_links: [],
        meaning: ['event', 'education', 'tech-talk'],
        students: { $id: 'student-officer-1' }
    },
    {
        $id: 'story-3',
        $createdAt: '2026-01-02T00:00:00.000Z',
        $updatedAt: '2026-01-02T00:00:00.000Z',
        post_description: 'Excited to share my experience at the recent hackathon',
        image_bucket: null,
        isAccepted: false,
        title: 'My First Hackathon Experience',
        post_details: 'Last weekend I participated in my first hackathon and it was an amazing experience. Our team built a mobile app that helps students manage their study schedules more effectively.',
        related_links: [],
        meaning: ['hackathon', 'experience', 'student-life'],
        students: { $id: 'student-1' }
    }
];

// Collection: files (6859013f00315545756c)
export const mockFiles = [
    {
        $id: 'file-1',
        $createdAt: '2026-01-10T00:00:00.000Z',
        $updatedAt: '2026-01-10T00:00:00.000Z',
        fileName: 'Meeting Minutes - January 2026.pdf',
        description: 'General assembly meeting minutes for January 2026',
        uploader: 'account-admin-1',
        fileID: 'file-1'
    },
    {
        $id: 'file-2',
        $createdAt: '2025-09-01T00:00:00.000Z',
        $updatedAt: '2025-09-01T00:00:00.000Z',
        fileName: 'SPECS Constitution 2025.pdf',
        description: 'Official SPECS constitution and bylaws',
        uploader: 'account-admin-1',
        fileID: 'file-2'
    },
    {
        $id: 'file-3',
        $createdAt: '2025-12-28T00:00:00.000Z',
        $updatedAt: '2025-12-28T00:00:00.000Z',
        fileName: 'Budget Report Q4 2025.xlsx',
        description: 'Quarterly budget report for Q4 2025',
        uploader: 'account-officer-1',
        fileID: 'file-3'
    }
];

// Volunteer requests for officer approval
export const mockVolunteerRequests = [
    {
        $id: 'student-2',
        name: 'Jane Smith',
        email: 'jane.smith@student.edu',
        section: 'BSCS-2B',
        yearLevel: 2,
        student_id: 20240002,
        requestDate: '2026-01-02T10:30:00.000Z',
        status: 'pending'
    }
];

// Backward compatibility: Export mockUsers that maps to mockAccounts with user-friendly data
export const mockUsers = mockAccounts.map(acc => {
    const student = mockStudents.find(s => acc.students?.$id === s.$id);
    const admin = mockAdmins.find(a => acc.admins?.$id === a.$id);

    return {
        $id: acc.$id,
        $createdAt: acc.$createdAt,
        $updatedAt: acc.$updatedAt,
        email: student?.email || admin?.email || `${acc.username}@specs.org`,
        name: student?.name || admin?.fullName || acc.username,
        username: acc.username,
        fullname: student?.name || admin?.fullName || acc.username,
        type: acc.type,
        verified: acc.verified,
        emailVerification: acc.verified,
        students: acc.students,
        yearLevel: student ? `${student.yearLevel}${getOrdinalSuffix(student.yearLevel)} Year` : 'Staff',
        is_volunteer: student?.is_volunteer || false,
        volunteer_request_status: student?.volunteer_request_status || 'none'
    };
});

function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// Helper to get mock data by collection ID
export function getMockData(collectionId) {
    // Handle undefined or empty collection IDs
    if (!collectionId) {
        console.warn('[Mock] getMockData called with empty collectionId');
        return [];
    }

    const collectionIdLower = collectionId.toLowerCase();

    // Mapping of collection IDs and names to mock data
    const collections = {
        // Accounts
        'accounts': mockAccounts,
        '6858feff002fb157e032': mockAccounts,
        // Students
        'students': mockStudents,
        '6885e221000f3e6a5033': mockStudents,
        // Officers
        'officers': mockOfficers,
        // Admins
        'admins': mockAdmins,
        // Events
        'events': mockEvents,
        '6859026800232b07755d': mockEvents,
        // Attendance
        'attendance': mockAttendance,
        // Payments
        'payments': mockPayments,
        '6885e333002bfa41803b': mockPayments,
        // Expenses
        'expenses': mockExpenses,
        '685a5c8700349613807e': mockExpenses,
        // Revenue
        'revenue': mockRevenue,
        '685a5c7b000cb98504a2': mockRevenue,
        // Stories
        'stories': mockStories,
        // Files
        'files': mockFiles,
        '6859013f00315545756c': mockFiles,
        // Volunteer requests
        'volunteer_requests': mockVolunteerRequests
    };

    // Try exact match first
    if (collections[collectionId]) {
        return collections[collectionId];
    }

    // Try fuzzy matching by partial name (handles undefined env vars)
    if (collectionIdLower.includes('account')) return mockAccounts;
    if (collectionIdLower.includes('student')) return mockStudents;
    if (collectionIdLower.includes('officer')) return mockOfficers;
    if (collectionIdLower.includes('admin')) return mockAdmins;
    if (collectionIdLower.includes('event')) return mockEvents;
    if (collectionIdLower.includes('attendance')) return mockAttendance;
    if (collectionIdLower.includes('payment')) return mockPayments;
    if (collectionIdLower.includes('expense')) return mockExpenses;
    if (collectionIdLower.includes('revenue')) return mockRevenue;
    if (collectionIdLower.includes('stor')) return mockStories;
    if (collectionIdLower.includes('file')) return mockFiles;
    if (collectionIdLower.includes('volunteer')) return mockVolunteerRequests;

    console.warn('[Mock] No mock data found for collection:', collectionId);
    return [];
}

// Dashboard statistics helper
export function getMockDashboardStats() {
    return {
        totalAccounts: mockAccounts.length,
        totalStudents: mockStudents.length,
        totalOfficers: mockOfficers.length,
        verifiedAccounts: mockAccounts.filter(a => a.verified).length,
        pendingAccounts: mockAccounts.filter(a => !a.verified).length,
        totalEvents: mockEvents.length,
        upcomingEvents: mockEvents.filter(e => !e.event_ended).length,
        completedEvents: mockEvents.filter(e => e.event_ended).length,
        totalFiles: mockFiles.length,
        totalPayments: mockPayments.length,
        paidPayments: mockPayments.filter(p => p.is_paid).length,
        pendingPayments: mockPayments.filter(p => !p.is_paid).length,
        totalRevenue: mockRevenue.reduce((sum, r) => sum + (r.price * r.quantity), 0),
        totalExpenses: mockExpenses.reduce((sum, e) => sum + (e.price * e.quantity), 0),
        totalVolunteers: mockStudents.filter(s => s.is_volunteer).length,
        pendingVolunteerRequests: mockStudents.filter(s => s.volunteer_request_status === 'pending').length,
        totalStories: mockStories.length,
        pendingStories: mockStories.filter(s => !s.isAccepted).length,
        approvedStories: mockStories.filter(s => s.isAccepted).length
    };
}
