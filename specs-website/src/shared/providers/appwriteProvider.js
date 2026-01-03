/**
 * Appwrite Provider Implementation
 * Implements auth, database, and storage using Appwrite SDK
 */

import { Client, Account, Databases, Storage, ID } from 'appwrite';
import { IAuthProvider, IDatabaseProvider, IStorageProvider } from './interface.js';

/**
 * Appwrite Authentication Provider
 */
export class AppwriteAuthProvider extends IAuthProvider {
    constructor(client) {
        super();
        this.account = new Account(client);
    }

    async getCurrentUser() {
        return await this.account.get();
    }

    async login(email, password) {
        return await this.account.createEmailPasswordSession(email, password);
    }

    async logout() {
        return await this.account.deleteSession('current');
    }

    async register(email, password, name) {
        return await this.account.create(ID.unique(), email, password, name);
    }

    async sendPasswordRecovery(email, redirectUrl) {
        return await this.account.createRecovery(email, redirectUrl);
    }

    async confirmPasswordRecovery(userId, secret, password) {
        return await this.account.updateRecovery(userId, secret, password, password);
    }

    async sendVerification(redirectUrl) {
        return await this.account.createVerification(redirectUrl);
    }

    async confirmVerification(userId, secret) {
        return await this.account.updateVerification(userId, secret);
    }
}

/**
 * Appwrite Database Provider
 */
export class AppwriteDatabaseProvider extends IDatabaseProvider {
    constructor(client) {
        super();
        this.databases = new Databases(client);
    }

    async listDocuments(databaseId, collectionId, queries = []) {
        return await this.databases.listDocuments(databaseId, collectionId, queries);
    }

    async getDocument(databaseId, collectionId, documentId) {
        return await this.databases.getDocument(databaseId, collectionId, documentId);
    }

    async createDocument(databaseId, collectionId, documentId, data) {
        return await this.databases.createDocument(databaseId, collectionId, documentId, data);
    }

    async updateDocument(databaseId, collectionId, documentId, data) {
        return await this.databases.updateDocument(databaseId, collectionId, documentId, data);
    }

    async deleteDocument(databaseId, collectionId, documentId) {
        return await this.databases.deleteDocument(databaseId, collectionId, documentId);
    }
}

/**
 * Appwrite Storage Provider
 */
export class AppwriteStorageProvider extends IStorageProvider {
    constructor(client) {
        super();
        this.storage = new Storage(client);
    }

    async listFiles(bucketId, queries = []) {
        return await this.storage.listFiles(bucketId, queries);
    }

    getFileView(bucketId, fileId) {
        return this.storage.getFileView(bucketId, fileId);
    }

    getFilePreview(bucketId, fileId, width = 600, height = 400) {
        return this.storage.getFilePreview(bucketId, fileId, width, height);
    }

    getFileDownload(bucketId, fileId) {
        return this.storage.getFileDownload(bucketId, fileId);
    }

    async createFile(bucketId, fileId, file) {
        return await this.storage.createFile(bucketId, fileId, file);
    }

    async deleteFile(bucketId, fileId) {
        return await this.storage.deleteFile(bucketId, fileId);
    }
}

/**
 * Create Appwrite providers from configuration
 * @param {string} endpoint - Appwrite endpoint URL
 * @param {string} projectId - Appwrite project ID
 * @returns {{auth: AppwriteAuthProvider, database: AppwriteDatabaseProvider, storage: AppwriteStorageProvider, client: Client}}
 */
export function createAppwriteProviders(endpoint, projectId) {
    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId);

    return {
        client,
        auth: new AppwriteAuthProvider(client),
        database: new AppwriteDatabaseProvider(client),
        storage: new AppwriteStorageProvider(client)
    };
}
