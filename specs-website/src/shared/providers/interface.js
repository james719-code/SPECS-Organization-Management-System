/**
 * Provider Interfaces
 * Defines the contracts for auth, database, and storage providers
 */

/**
 * Authentication Provider Interface
 * @interface
 */
export class IAuthProvider {
    /**
     * Get the currently authenticated user
     * @returns {Promise<Object>} User object
     * @throws {Error} If not authenticated
     */
    async getCurrentUser() {
        throw new Error('Not implemented');
    }

    /**
     * Create a session (login)
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Session object
     */
    async login(email, password) {
        throw new Error('Not implemented');
    }

    /**
     * Delete current session (logout)
     * @returns {Promise<void>}
     */
    async logout() {
        throw new Error('Not implemented');
    }

    /**
     * Create a new user account
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} name - User name
     * @returns {Promise<Object>} User object
     */
    async register(email, password, name) {
        throw new Error('Not implemented');
    }

    /**
     * Send password recovery email
     * @param {string} email - User email
     * @param {string} redirectUrl - URL to redirect after recovery
     * @returns {Promise<void>}
     */
    async sendPasswordRecovery(email, redirectUrl) {
        throw new Error('Not implemented');
    }

    /**
     * Update password using recovery token
     * @param {string} userId - User ID
     * @param {string} secret - Recovery secret
     * @param {string} password - New password
     * @returns {Promise<void>}
     */
    async confirmPasswordRecovery(userId, secret, password) {
        throw new Error('Not implemented');
    }

    /**
     * Send email verification
     * @param {string} redirectUrl - URL to redirect after verification
     * @returns {Promise<void>}
     */
    async sendVerification(redirectUrl) {
        throw new Error('Not implemented');
    }

    /**
     * Confirm email verification
     * @param {string} userId - User ID
     * @param {string} secret - Verification secret
     * @returns {Promise<void>}
     */
    async confirmVerification(userId, secret) {
        throw new Error('Not implemented');
    }
}

/**
 * Database Provider Interface
 * @interface
 */
export class IDatabaseProvider {
    /**
     * List documents from a collection
     * @param {string} databaseId - Database ID
     * @param {string} collectionId - Collection ID
     * @param {Array} queries - Query objects
     * @returns {Promise<{documents: Array, total: number}>}
     */
    async listDocuments(databaseId, collectionId, queries = []) {
        throw new Error('Not implemented');
    }

    /**
     * Get a single document
     * @param {string} databaseId - Database ID
     * @param {string} collectionId - Collection ID
     * @param {string} documentId - Document ID
     * @returns {Promise<Object>}
     */
    async getDocument(databaseId, collectionId, documentId) {
        throw new Error('Not implemented');
    }

    /**
     * Create a document
     * @param {string} databaseId - Database ID
     * @param {string} collectionId - Collection ID
     * @param {string} documentId - Document ID (or 'unique()')
     * @param {Object} data - Document data
     * @returns {Promise<Object>}
     */
    async createDocument(databaseId, collectionId, documentId, data) {
        throw new Error('Not implemented');
    }

    /**
     * Update a document
     * @param {string} databaseId - Database ID
     * @param {string} collectionId - Collection ID
     * @param {string} documentId - Document ID
     * @param {Object} data - Data to update
     * @returns {Promise<Object>}
     */
    async updateDocument(databaseId, collectionId, documentId, data) {
        throw new Error('Not implemented');
    }

    /**
     * Delete a document
     * @param {string} databaseId - Database ID
     * @param {string} collectionId - Collection ID
     * @param {string} documentId - Document ID
     * @returns {Promise<void>}
     */
    async deleteDocument(databaseId, collectionId, documentId) {
        throw new Error('Not implemented');
    }
}

/**
 * Storage Provider Interface
 * @interface
 */
export class IStorageProvider {
    /**
     * List files in a bucket
     * @param {string} bucketId - Bucket ID
     * @param {Array} queries - Query objects
     * @returns {Promise<{files: Array, total: number}>}
     */
    async listFiles(bucketId, queries = []) {
        throw new Error('Not implemented');
    }

    /**
     * Get file for viewing (URL)
     * @param {string} bucketId - Bucket ID
     * @param {string} fileId - File ID
     * @returns {string|Promise<string>} File URL
     */
    getFileView(bucketId, fileId) {
        throw new Error('Not implemented');
    }

    /**
     * Get file preview (for images)
     * @param {string} bucketId - Bucket ID
     * @param {string} fileId - File ID
     * @param {number} width - Preview width
     * @param {number} height - Preview height
     * @returns {string|Promise<string>} Preview URL
     */
    getFilePreview(bucketId, fileId, width, height) {
        throw new Error('Not implemented');
    }

    /**
     * Get file for download (URL)
     * @param {string} bucketId - Bucket ID
     * @param {string} fileId - File ID
     * @returns {string|Promise<string>} Download URL
     */
    getFileDownload(bucketId, fileId) {
        throw new Error('Not implemented');
    }

    /**
     * Upload a file
     * @param {string} bucketId - Bucket ID
     * @param {string} fileId - File ID (or 'unique()')
     * @param {File} file - File object
     * @returns {Promise<Object>} File metadata
     */
    async createFile(bucketId, fileId, file) {
        throw new Error('Not implemented');
    }

    /**
     * Delete a file
     * @param {string} bucketId - Bucket ID
     * @param {string} fileId - File ID
     * @returns {Promise<void>}
     */
    async deleteFile(bucketId, fileId) {
        throw new Error('Not implemented');
    }
}
