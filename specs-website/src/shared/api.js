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

export const api = {
    // --- EVENTS ---
    events: {
        async list(limit = 100, orderDesc = true) {
            const queries = [Query.limit(limit)];
            if (orderDesc) queries.push(Query.orderDesc('date_to_held'));
            return databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, queries);
        },
        async get(eventId) {
            return databases.getDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
        },
        async create(data) {
            return databases.createDocument(DATABASE_ID, COLLECTION_ID_EVENTS, ID.unique(), data);
        },
        async update(eventId, data) {
            return databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, data);
        },
        async delete(eventId) {
            return databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId);
        },
        async markEnded(eventId) {
            return databases.updateDocument(DATABASE_ID, COLLECTION_ID_EVENTS, eventId, { event_ended: true });
        }
    },

    // --- PAYMENTS ---
    payments: {
        async list(limit = 5000) {
            return databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.limit(limit)]);
        },
        async listForStudent(studentId) {
            return databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [
                Query.equal('students', studentId),
                Query.orderDesc('date_paid'),
                Query.limit(100)
            ]);
        },
        async create(data) {
            return databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), data);
        },
        async update(paymentId, data) {
            return databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId, data);
        },
        async delete(paymentId) {
            return databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId);
        },
        async markPaid(payment, recorderId, studentName) {
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
            return databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, payment.$id, { 
                is_paid: true, 
                date_paid: new Date().toISOString() 
            });
        }
    },

    // --- ATTENDANCE ---
    attendance: {
        async listForStudent(studentId) {
            return databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDANCE, [
                Query.equal('students', studentId),
                Query.orderDesc('$createdAt')
            ]);
        },
        async listForEvent(eventId) {
            return databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDANCE, [
                Query.equal('events', eventId),
                Query.limit(5000)
            ]);
        },
        async create(eventId, studentId, officerId, attendanceName) {
            return databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, ID.unique(), {
                events: eventId,
                students: studentId,
                officers: officerId,
                name_attendance: attendanceName
            });
        },
        async delete(attendanceId) {
            return databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ATTENDANCE, attendanceId);
        }
    },

    // --- USERS (Students/Accounts) ---
    users: {
        async getCurrent() {
            return account.get();
        },
        async getAccount(accountId) {
            return databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, accountId);
        },
        async getStudentProfile(studentId) {
            return databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentId);
        },
        async listStudents() {
            // Often we list accounts that are type 'student'
            return databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [
                Query.equal('type', 'student'),
                Query.limit(5000)
            ]);
        }
    },

    // --- STORAGE ---
    files: {
        getFilePreview(fileId) {
            return storage.getFilePreview(BUCKET_ID_EVENT_IMAGES, fileId, 600, 400); // Default preview options
        },
        async uploadEventImage(file) {
            return storage.createFile(BUCKET_ID_EVENT_IMAGES, ID.unique(), file);
        },
        async deleteEventImage(fileId) {
            return storage.deleteFile(BUCKET_ID_EVENT_IMAGES, fileId);
        }
    }
};
