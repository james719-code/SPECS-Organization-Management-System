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
        // Restore session from storage if it exists (survives page navigation)
        this._restoreSession();
    }

    _restoreSession() {
        try {
            const storedEmail = sessionStorage.getItem('mock_user_email');
            if (storedEmail) {
                const user = mockUsers.find(u => u.email === storedEmail);
                if (user) {
                    this.currentUser = user;
                    this.currentSession = {
                        $id: `session-restored-${Date.now()}`,
                        userId: user.$id,
                        expire: new Date(Date.now() + 86400000).toISOString()
                    };
                    console.log('[Mock] Session restored for:', storedEmail);
                }
            }
        } catch (e) {
            // sessionStorage may be blocked
            console.warn('[Mock] Could not restore session:', e.message);
        }
    }

    _saveSession(email) {
        try {
            sessionStorage.setItem('mock_user_email', email);
        } catch (e) {
            console.warn('[Mock] Could not save session:', e.message);
        }
    }

    _clearSession() {
        try {
            sessionStorage.removeItem('mock_user_email');
        } catch (e) {
            console.warn('[Mock] Could not clear session:', e.message);
        }
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
        // Persist session for page navigation
        this._saveSession(email);
        return this.currentSession;
    }

    async logout() {
        await delay(MOCK_DELAY);
        this.currentUser = null;
        this.currentSession = null;
        this._clearSession();
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

    /**
     * Parse an Appwrite Query string into its components
     * Query format: "method(\"field\", value)" or "method(value)"
     * @param {string} queryStr - Query string from Appwrite SDK
     * @returns {Object|null} Parsed query object or null
     */
    _parseQuery(queryStr) {
        const str = typeof queryStr === 'string' ? queryStr : String(queryStr);
        
        // Match: method("field", value) or method("field", [values]) or method(value)
        const match = str.match(/^(\w+)\((.+)\)$/);
        if (!match) return null;

        const method = match[1];
        const argsStr = match[2];

        // Parse arguments - could be "field", value or just value
        const args = [];
        let current = '';
        let inString = false;
        let inArray = false;
        let stringChar = '';
        
        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            
            if (!inString && !inArray && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && argsStr[i - 1] !== '\\') {
                inString = false;
                stringChar = '';
            } else if (!inString && char === '[') {
                inArray = true;
                current += char;
            } else if (!inString && char === ']') {
                inArray = false;
                current += char;
            } else if (!inString && !inArray && char === ',') {
                args.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) {
            args.push(current.trim());
        }

        // Parse individual values
        const parsedArgs = args.map(arg => {
            arg = arg.trim();
            // String
            if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                return arg.slice(1, -1);
            }
            // Array
            if (arg.startsWith('[') && arg.endsWith(']')) {
                try {
                    return JSON.parse(arg);
                } catch {
                    return arg;
                }
            }
            // Number
            if (!isNaN(arg)) {
                return Number(arg);
            }
            // Boolean
            if (arg === 'true') return true;
            if (arg === 'false') return false;
            return arg;
        });

        return { method, args: parsedArgs };
    }

    /**
     * Apply parsed queries to filter/sort/limit data
     * @param {Array} data - Array of documents
     * @param {Array} queries - Array of query strings or objects
     * @returns {Object} Result with filtered documents, total count, and pagination info
     */
    _applyQueries(data, queries) {
        let result = [...data];
        const totalBeforeFilter = data.length;
        let limit = null;
        let offset = 0;

        for (const query of queries) {
            const parsed = this._parseQuery(query);
            if (!parsed) continue;

            const { method, args } = parsed;

            switch (method) {
                case 'equal':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        result = result.filter(doc => {
                            const docValue = doc[field];
                            // Handle relationship fields (e.g., students with $id)
                            if (docValue && typeof docValue === 'object' && docValue.$id) {
                                return docValue.$id === value;
                            }
                            // Handle array values
                            if (Array.isArray(value)) {
                                return value.includes(docValue);
                            }
                            return docValue === value;
                        });
                    }
                    break;

                case 'notEqual':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        result = result.filter(doc => doc[field] !== value);
                    }
                    break;

                case 'greaterThan':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        result = result.filter(doc => doc[field] > value);
                    }
                    break;

                case 'greaterThanEqual':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        result = result.filter(doc => doc[field] >= value);
                    }
                    break;

                case 'lessThan':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        result = result.filter(doc => doc[field] < value);
                    }
                    break;

                case 'lessThanEqual':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        result = result.filter(doc => doc[field] <= value);
                    }
                    break;

                case 'search':
                    if (args.length >= 2) {
                        const [field, value] = args;
                        const searchTerm = String(value).toLowerCase();
                        result = result.filter(doc => 
                            String(doc[field] || '').toLowerCase().includes(searchTerm)
                        );
                    }
                    break;

                case 'orderDesc':
                    if (args.length >= 1) {
                        const field = args[0];
                        result.sort((a, b) => {
                            const aVal = a[field];
                            const bVal = b[field];
                            if (aVal < bVal) return 1;
                            if (aVal > bVal) return -1;
                            return 0;
                        });
                    }
                    break;

                case 'orderAsc':
                    if (args.length >= 1) {
                        const field = args[0];
                        result.sort((a, b) => {
                            const aVal = a[field];
                            const bVal = b[field];
                            if (aVal < bVal) return -1;
                            if (aVal > bVal) return 1;
                            return 0;
                        });
                    }
                    break;

                case 'limit':
                    if (args.length >= 1) {
                        limit = Number(args[0]);
                    }
                    break;

                case 'offset':
                    if (args.length >= 1) {
                        offset = Number(args[0]);
                    }
                    break;

                case 'cursorAfter':
                case 'cursorBefore':
                    // Cursor-based pagination - find the document and slice from there
                    if (args.length >= 1) {
                        const cursorId = args[0];
                        const cursorIndex = result.findIndex(doc => doc.$id === cursorId);
                        if (cursorIndex !== -1) {
                            if (method === 'cursorAfter') {
                                result = result.slice(cursorIndex + 1);
                            } else {
                                result = result.slice(0, cursorIndex);
                            }
                        }
                    }
                    break;
            }
        }

        // Store total after filtering but before pagination
        const totalAfterFilter = result.length;

        // Apply offset and limit last
        if (offset > 0) {
            result = result.slice(offset);
        }
        if (limit !== null && limit > 0) {
            result = result.slice(0, limit);
        }

        return {
            documents: result,
            total: totalAfterFilter,
            limit,
            offset
        };
    }

    async listDocuments(databaseId, collectionId, queries = []) {
        await delay(MOCK_DELAY);
        let data = getMockData(collectionId);

        // Apply query processing
        const { documents, total, limit, offset } = this._applyQueries(data, queries);

        return {
            documents,
            total
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
