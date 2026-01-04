import {
    mockAccounts,
    mockUsers,
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
    mockVolunteerRequests,
    mockCredentials,
    getMockData,
    getMockDashboardStats
} from './mockData.js';

// Simulated network delay (ms)
const MOCK_DELAY = 200;

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class MockApiService {
    constructor() {
        this.currentUser = null;
        this.currentSession = null;
    }

    async getCurrentUser() {
        await delay(MOCK_DELAY);
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }
        return { ...this.currentUser };
    }

    async login(email, password) {
        await delay(MOCK_DELAY);
        const user = mockUsers.find(u => u.email === email);

        if (!user) {
            throw new Error('Invalid credentials - user not found');
        }

        // Validate password against mock credentials
        const expectedPassword = mockCredentials[email];
        if (!expectedPassword || password !== expectedPassword) {
            throw new Error('Invalid credentials - wrong password');
        }

        this.currentUser = user;
        this.currentSession = {
            $id: `session-${Date.now()}`,
            userId: user.$id,
            expire: new Date(Date.now() + 86400000).toISOString()
        };
        return this.currentSession;
    }

    async logout() {
        await delay(MOCK_DELAY);
        this.currentUser = null;
        this.currentSession = null;
        return true;
    }

    async register(email, password, name) {
        await delay(MOCK_DELAY);
        const existingUser = mockUsers.find(u => u.email === email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const newStudent = {
            $id: `student-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            name,
            email,
            section: null,
            address: null,
            yearLevel: 1,
            student_id: Date.now(),
            is_volunteer: false,
            volunteer_request_status: 'none',
            payments: []
        };
        mockStudents.push(newStudent);

        const newAccount = {
            $id: `account-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            username: email.split('@')[0],
            type: 'student',
            verified: false,
            students: { $id: newStudent.$id },
            admins: null,
            officers: null
        };
        mockAccounts.push(newAccount);

        return newAccount;
    }

    async sendVerificationEmail() {
        await delay(MOCK_DELAY);
        console.log('[Mock] Verification email sent');
        return true;
    }

    async sendPasswordResetEmail(email) {
        await delay(MOCK_DELAY);
        console.log('[Mock] Password reset email sent to:', email);
        return true;
    }

    async listDocuments(databaseId, collectionId, queries = []) {
        await delay(MOCK_DELAY);
        let data = getMockData(collectionId);

        // Simple query processing
        queries.forEach(query => {
            if (typeof query === 'object') {
                // Handle Query objects if needed
            }
        });

        return {
            documents: [...data],
            total: data.length
        };
    }

    async getDocument(databaseId, collectionId, documentId) {
        await delay(MOCK_DELAY);
        const data = getMockData(collectionId);
        const doc = data.find(d => d.$id === documentId);

        if (!doc) {
            throw new Error(`Document not found: ${documentId}`);
        }

        return { ...doc };
    }

    async createDocument(databaseId, collectionId, documentId, data) {
        await delay(MOCK_DELAY);
        const collection = getMockData(collectionId);

        const newDoc = {
            $id: documentId || `${collectionId}-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            ...data
        };

        collection.push(newDoc);
        console.log('[Mock] Document created:', collectionId, newDoc.$id);

        return newDoc;
    }

    async updateDocument(databaseId, collectionId, documentId, data) {
        await delay(MOCK_DELAY);
        const collection = getMockData(collectionId);
        const index = collection.findIndex(d => d.$id === documentId);

        if (index === -1) {
            throw new Error(`Document not found: ${documentId}`);
        }

        collection[index] = {
            ...collection[index],
            ...data,
            $updatedAt: new Date().toISOString()
        };

        console.log('[Mock] Document updated:', collectionId, documentId);
        return { ...collection[index] };
    }

    async deleteDocument(databaseId, collectionId, documentId) {
        await delay(MOCK_DELAY);
        const collection = getMockData(collectionId);
        const index = collection.findIndex(d => d.$id === documentId);

        if (index !== -1) {
            collection.splice(index, 1);
            console.log('[Mock] Document deleted:', collectionId, documentId);
        }

        return true;
    }

    async listFiles(bucketId, queries = []) {
        await delay(MOCK_DELAY);
        return {
            files: [...mockFiles],
            total: mockFiles.length
        };
    }

    async getFileView(bucketId, fileId) {
        await delay(MOCK_DELAY);
        return `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/view`;
    }

    async getFileDownload(bucketId, fileId) {
        await delay(MOCK_DELAY);
        return `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/download`;
    }

    async createFile(bucketId, fileId, file) {
        await delay(MOCK_DELAY);
        const newFile = {
            $id: fileId || `file-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            fileName: file.name,
            description: '',
            uploader: this.currentUser?.$id || 'unknown',
            fileID: fileId || `file-${Date.now()}`
        };

        mockFiles.push(newFile);
        console.log('[Mock] File uploaded:', newFile.fileName);

        return newFile;
    }

    async deleteFile(bucketId, fileId) {
        await delay(MOCK_DELAY);
        const index = mockFiles.findIndex(f => f.$id === fileId);

        if (index !== -1) {
            mockFiles.splice(index, 1);
            console.log('[Mock] File deleted:', fileId);
        }

        return true;
    }

    async devLogin(userType = 'admin') {
        const user = mockUsers.find(u => u.type === userType);
        if (user) {
            this.currentUser = user;
            this.currentSession = {
                $id: `session-${Date.now()}`,
                userId: user.$id,
                expire: new Date(Date.now() + 86400000).toISOString()
            };
            return user;
        }
        throw new Error(`No mock user of type: ${userType}`);
    }

    // Get current session
    getSession() {
        return this.currentSession;
    }

    // Check if using mock data
    isMockMode() {
        return true;
    }

    // Get dashboard statistics
    getDashboardStats() {
        return getMockDashboardStats();
    }

    // ==========================================
    // VOLUNTEER MANAGEMENT FUNCTIONS
    // ==========================================

    async requestVolunteerStatus(studentId) {
        await delay(MOCK_DELAY);
        const student = mockStudents.find(s => s.$id === studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        if (student.is_volunteer) {
            throw new Error('Already a volunteer');
        }

        if (student.volunteer_request_status === 'pending') {
            throw new Error('Request already pending');
        }

        student.volunteer_request_status = 'pending';
        student.$updatedAt = new Date().toISOString();

        console.log('[Mock] Volunteer request submitted for:', student.name);
        return { success: true, message: 'Volunteer request submitted' };
    }

    async getVolunteerRequests() {
        await delay(MOCK_DELAY);
        const pendingRequests = mockStudents
            .filter(s => s.volunteer_request_status === 'pending')
            .map(s => ({
                $id: s.$id,
                name: s.name,
                email: s.email,
                section: s.section,
                yearLevel: s.yearLevel,
                student_id: s.student_id,
                requestDate: s.$updatedAt,
                status: 'pending'
            }));

        return {
            documents: pendingRequests,
            total: pendingRequests.length
        };
    }

    async approveVolunteerRequest(studentId, officerId) {
        await delay(MOCK_DELAY);
        const student = mockStudents.find(s => s.$id === studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        student.is_volunteer = true;
        student.volunteer_request_status = 'approved';
        student.$updatedAt = new Date().toISOString();

        console.log('[Mock] Volunteer request approved for:', student.name, 'by officer:', officerId);
        return { success: true, message: 'Volunteer request approved' };
    }

    async rejectVolunteerRequest(studentId, officerId) {
        await delay(MOCK_DELAY);
        const student = mockStudents.find(s => s.$id === studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        student.volunteer_request_status = 'rejected';
        student.$updatedAt = new Date().toISOString();

        console.log('[Mock] Volunteer request rejected for:', student.name, 'by officer:', officerId);
        return { success: true, message: 'Volunteer request rejected' };
    }

    async requestVolunteerBackout(studentId) {
        await delay(MOCK_DELAY);
        const student = mockStudents.find(s => s.$id === studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        if (!student.is_volunteer) {
            throw new Error('Student is not a volunteer');
        }

        student.volunteer_request_status = 'backout_pending';
        student.$updatedAt = new Date().toISOString();

        console.log('[Mock] Volunteer backout request submitted for:', student.name);
        return { success: true, message: 'Backout request submitted' };
    }

    async approveVolunteerBackout(studentId, officerId) {
        await delay(MOCK_DELAY);
        const student = mockStudents.find(s => s.$id === studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        student.is_volunteer = false;
        student.volunteer_request_status = 'none';
        student.$updatedAt = new Date().toISOString();

        console.log('[Mock] Volunteer backout approved for:', student.name, 'by officer:', officerId);
        return { success: true, message: 'Volunteer backout approved' };
    }

    async rejectVolunteerBackout(studentId, officerId) {
        await delay(MOCK_DELAY);
        const student = mockStudents.find(s => s.$id === studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        // Reset to approved status (still a volunteer)
        student.volunteer_request_status = 'approved';
        student.$updatedAt = new Date().toISOString();

        console.log('[Mock] Volunteer backout rejected for:', student.name, 'by officer:', officerId);
        return { success: true, message: 'Backout request rejected - volunteer remains active' };
    }

    // ==========================================
    // STORY/POST MANAGEMENT FUNCTIONS
    // ==========================================

    async createStory(storyData) {
        await delay(MOCK_DELAY);

        const newStory = {
            $id: `story-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            title: storyData.title,
            post_description: storyData.post_description,
            post_details: storyData.post_details,
            image_bucket: storyData.image_bucket || null,
            isAccepted: false,
            related_links: storyData.related_links || [],
            meaning: storyData.meaning || [],
            students: { $id: storyData.studentId }
        };

        mockStories.push(newStory);
        console.log('[Mock] Story created:', newStory.title);
        return newStory;
    }

    async updateStory(storyId, updates) {
        await delay(MOCK_DELAY);
        const index = mockStories.findIndex(s => s.$id === storyId);

        if (index === -1) {
            throw new Error('Story not found');
        }

        mockStories[index] = {
            ...mockStories[index],
            ...updates,
            $updatedAt: new Date().toISOString()
        };

        console.log('[Mock] Story updated:', storyId);
        return { ...mockStories[index] };
    }

    async deleteStory(storyId) {
        await delay(MOCK_DELAY);
        const index = mockStories.findIndex(s => s.$id === storyId);

        if (index !== -1) {
            mockStories.splice(index, 1);
            console.log('[Mock] Story deleted:', storyId);
        }

        return true;
    }

    async getStoriesByStudent(studentId) {
        await delay(MOCK_DELAY);
        const stories = mockStories.filter(s => s.students?.$id === studentId);
        return {
            documents: stories,
            total: stories.length
        };
    }

    async getPendingStories() {
        await delay(MOCK_DELAY);
        const pendingStories = mockStories.filter(s => !s.isAccepted);
        return {
            documents: pendingStories,
            total: pendingStories.length
        };
    }

    async approveStory(storyId, officerId) {
        await delay(MOCK_DELAY);
        const story = mockStories.find(s => s.$id === storyId);

        if (!story) {
            throw new Error('Story not found');
        }

        story.isAccepted = true;
        story.$updatedAt = new Date().toISOString();

        console.log('[Mock] Story approved:', story.title, 'by officer:', officerId);
        return { success: true, message: 'Story approved' };
    }

    async rejectStory(storyId, officerId) {
        await delay(MOCK_DELAY);
        const index = mockStories.findIndex(s => s.$id === storyId);

        if (index === -1) {
            throw new Error('Story not found');
        }

        // For rejection, we remove the story (or could mark as rejected)
        mockStories.splice(index, 1);

        console.log('[Mock] Story rejected and removed:', storyId, 'by officer:', officerId);
        return { success: true, message: 'Story rejected' };
    }

    // ==========================================
    // ADMIN: STUDENT-OFFICER ASSIGNMENT
    // ==========================================

    async assignStudentToOfficer(studentId, adminId) {
        await delay(MOCK_DELAY);

        const student = mockStudents.find(s => s.$id === studentId);
        if (!student) {
            throw new Error('Student not found');
        }

        // Check if already an officer
        const existingOfficer = mockOfficers.find(o => o.students?.$id === studentId);
        if (existingOfficer) {
            throw new Error('Student is already an officer');
        }

        // Create officer record
        const newOfficer = {
            $id: `officer-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            students: { $id: studentId },
            isSchedule: false,
            scheduleId: null
        };

        mockOfficers.push(newOfficer);

        // Update account to reflect officer status
        const account = mockAccounts.find(a => a.students?.$id === studentId);
        if (account) {
            account.type = 'officer';
            account.officers = { $id: newOfficer.$id };
            account.$updatedAt = new Date().toISOString();
        }

        console.log('[Mock] Student assigned as officer:', student.name, 'by admin:', adminId);
        return { success: true, message: 'Student assigned as officer', officerId: newOfficer.$id };
    }

    async removeStudentFromOfficer(officerId, adminId) {
        await delay(MOCK_DELAY);

        const officerIndex = mockOfficers.findIndex(o => o.$id === officerId);
        if (officerIndex === -1) {
            throw new Error('Officer not found');
        }

        const officer = mockOfficers[officerIndex];
        const studentId = officer.students?.$id;

        // Remove officer record
        mockOfficers.splice(officerIndex, 1);

        // Update account back to student
        if (studentId) {
            const account = mockAccounts.find(a => a.students?.$id === studentId);
            if (account) {
                account.type = 'student';
                account.officers = null;
                account.$updatedAt = new Date().toISOString();
            }
        }

        console.log('[Mock] Officer removed:', officerId, 'by admin:', adminId);
        return { success: true, message: 'Officer removed' };
    }

    async getOfficers() {
        await delay(MOCK_DELAY);
        return {
            documents: [...mockOfficers],
            total: mockOfficers.length
        };
    }
}

// Export singleton instance
export const mockApi = new MockApiService();

// Export class for testing
export { MockApiService };
