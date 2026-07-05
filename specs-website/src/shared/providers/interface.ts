/**
 * Provider Interfaces
 * Defines the contracts for auth, database, and storage providers
 */

/**
 * Authentication Provider Interface
 */
export class IAuthProvider {
    /**
     * Get the currently authenticated user
     */
    async getCurrentUser(): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Create a session (login)
     */
    async login(email: string, password: string): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Delete current session (logout)
     */
    async logout(): Promise<void> {
        throw new Error('Not implemented');
    }

    /**
     * Create a new user account
     */
    async register(email: string, password: string, name: string): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Send password recovery email
     */
    async sendPasswordRecovery(email: string, redirectUrl: string): Promise<void> {
        throw new Error('Not implemented');
    }

    /**
     * Update password using recovery token
     */
    async confirmPasswordRecovery(userId: string, secret: string, password: string): Promise<void> {
        throw new Error('Not implemented');
    }

    /**
     * Send email verification
     */
    async sendVerification(redirectUrl: string): Promise<void> {
        throw new Error('Not implemented');
    }

    /**
     * Confirm email verification
     */
    async confirmVerification(userId: string, secret: string): Promise<void> {
        throw new Error('Not implemented');
    }
}

/**
 * Database Provider Interface
 */
export class IDatabaseProvider {
    /**
     * List documents from a collection
     */
    async listDocuments(databaseId: string, collectionId: string, queries: any[] = []): Promise<{ documents: any[]; total: number }> {
        throw new Error('Not implemented');
    }

    /**
     * Get a single document
     */
    async getDocument(databaseId: string, collectionId: string, documentId: string): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Create a document
     */
    async createDocument(databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Update a document
     */
    async updateDocument(databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Delete a document
     */
    async deleteDocument(databaseId: string, collectionId: string, documentId: string): Promise<void> {
        throw new Error('Not implemented');
    }
}

/**
 * Storage Provider Interface
 */
export class IStorageProvider {
    /**
     * List files in a bucket
     */
    async listFiles(bucketId: string, queries: any[] = []): Promise<{ files: any[]; total: number }> {
        throw new Error('Not implemented');
    }

    /**
     * Get file for viewing (URL)
     */
    getFileView(bucketId: string, fileId: string): string | Promise<string> {
        throw new Error('Not implemented');
    }

    /**
     * Get file preview (for images)
     */
    getFilePreview(bucketId: string, fileId: string, width?: number, height?: number): string | Promise<string> {
        throw new Error('Not implemented');
    }

    /**
     * Get file for download (URL)
     */
    getFileDownload(bucketId: string, fileId: string): string | Promise<string> {
        throw new Error('Not implemented');
    }

    /**
     * Upload a file
     */
    async createFile(bucketId: string, fileId: string, file: any): Promise<any> {
        throw new Error('Not implemented');
    }

    /**
     * Delete a file
     */
    async deleteFile(bucketId: string, fileId: string): Promise<void> {
        throw new Error('Not implemented');
    }
}
