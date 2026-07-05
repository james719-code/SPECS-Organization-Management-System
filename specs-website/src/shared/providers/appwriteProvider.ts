/**
 * Appwrite Provider Implementation
 * Implements auth, database, and storage using Appwrite SDK
 */

import { Client, Account, Databases, Storage, ID } from 'appwrite';
import { IAuthProvider, IDatabaseProvider, IStorageProvider } from './interface';

/**
 * Appwrite Authentication Provider
 */
export class AppwriteAuthProvider extends IAuthProvider {
    private account: Account;

    constructor(client: Client) {
        super();
        this.account = new Account(client);
    }

    async getCurrentUser(): Promise<any> {
        return await this.account.get();
    }

    async login(email: string, password: string): Promise<any> {
        return await this.account.createEmailPasswordSession(email, password);
    }

    async logout(): Promise<void> {
        await this.account.deleteSession('current');
    }

    async register(email: string, password: string, name: string): Promise<any> {
        return await this.account.create(ID.unique(), email, password, name);
    }

    async sendPasswordRecovery(email: string, redirectUrl: string): Promise<void> {
        await this.account.createRecovery(email, redirectUrl);
    }

    async confirmPasswordRecovery(userId: string, secret: string, password: string): Promise<void> {
        await this.account.updateRecovery(userId, secret, password, password);
    }

    async sendVerification(redirectUrl: string): Promise<void> {
        await this.account.createVerification(redirectUrl);
    }

    async confirmVerification(userId: string, secret: string): Promise<void> {
        await this.account.updateVerification(userId, secret);
    }
}

/**
 * Appwrite Database Provider
 */
export class AppwriteDatabaseProvider extends IDatabaseProvider {
    private databases: Databases;

    constructor(client: Client) {
        super();
        this.databases = new Databases(client);
    }

    async listDocuments(databaseId: string, collectionId: string, queries: any[] = []): Promise<{ documents: any[]; total: number }> {
        return await this.databases.listDocuments(databaseId, collectionId, queries);
    }

    async getDocument(databaseId: string, collectionId: string, documentId: string): Promise<any> {
        return await this.databases.getDocument(databaseId, collectionId, documentId);
    }

    async createDocument(databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        return await this.databases.createDocument(databaseId, collectionId, documentId, data);
    }

    async updateDocument(databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        return await this.databases.updateDocument(databaseId, collectionId, documentId, data);
    }

    async deleteDocument(databaseId: string, collectionId: string, documentId: string): Promise<void> {
        await this.databases.deleteDocument(databaseId, collectionId, documentId);
    }
}

/**
 * Appwrite Storage Provider
 */
export class AppwriteStorageProvider extends IStorageProvider {
    private storage: Storage;

    constructor(client: Client) {
        super();
        this.storage = new Storage(client);
    }

    async listFiles(bucketId: string, queries: any[] = []): Promise<{ files: any[]; total: number }> {
        return await this.storage.listFiles(bucketId, queries);
    }

    getFileView(bucketId: string, fileId: string): string {
        return this.storage.getFileView(bucketId, fileId);
    }

    getFilePreview(bucketId: string, fileId: string, width = 600, height = 400): string {
        return this.storage.getFilePreview(bucketId, fileId, width, height);
    }

    getFileDownload(bucketId: string, fileId: string): string {
        return this.storage.getFileDownload(bucketId, fileId);
    }

    async createFile(bucketId: string, fileId: string, file: any): Promise<any> {
        return await this.storage.createFile(bucketId, fileId, file);
    }

    async deleteFile(bucketId: string, fileId: string): Promise<void> {
        await this.storage.deleteFile(bucketId, fileId);
    }
}

/**
 * Create Appwrite providers from configuration
 */
export function createAppwriteProviders(endpoint: string, projectId: string) {
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
