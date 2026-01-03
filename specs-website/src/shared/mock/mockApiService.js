import {
    mockUsers,
    mockStudents,
    mockEvents,
    mockStories,
    mockPayments,
    mockFiles,
    mockAttendance,
    getMockData
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
        if (user) {
            this.currentUser = user;
            this.currentSession = {
                $id: `session-${Date.now()}`,
                userId: user.$id,
                expire: new Date(Date.now() + 86400000).toISOString()
            };
            return this.currentSession;
        }
        throw new Error('Invalid credentials');
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

        const newUser = {
            $id: `user-${Date.now()}`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            email,
            name,
            username: email.split('@')[0],
            type: 'student',
            verified: false,
            students: null
        };

        mockUsers.push(newUser);
        return newUser;
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
            name: file.name,
            mimeType: file.type,
            sizeOriginal: file.size,
            bucketId
        };

        mockFiles.push(newFile);
        console.log('[Mock] File uploaded:', newFile.name);

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
}

// Export singleton instance
export const mockApi = new MockApiService();

// Export class for testing
export { MockApiService };
