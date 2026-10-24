import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageProvider } from './interface';
import { getFirebaseIdToken } from './firebaseProvider';

interface SupabaseStorageConfig {
    url: string;
    anonKey?: string;
    functionUrl?: string;
    firebaseConfig: any;
}

function safeName(name: string): string {
    return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Supabase Storage adapter. Existing UI components expect synchronous image
 * URLs, so read URLs point to the Edge asset resolver. Uploads/deletes use
 * short-lived signed operations and never expose the service-role key.
 */
export class SupabaseStorageProvider extends IStorageProvider {
    private url: string;
    private functionUrl: string;
    private firebaseConfig: any;
    private client: SupabaseClient | null;

    constructor(config: SupabaseStorageConfig) {
        super();
        this.url = config.url.replace(/\/$/, '');
        this.functionUrl = (config.functionUrl || `${this.url}/functions/v1/specs-api`).replace(/\/$/, '');
        this.firebaseConfig = config.firebaseConfig;
        this.client = config.anonKey ? createClient(this.url, config.anonKey) : null;
    }

    private async request(payload: any): Promise<any> {
        const token = await getFirebaseIdToken(this.firebaseConfig);
        if (!token) throw new Error('You must be signed in to use Storage');
        const response = await fetch(this.functionUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'storage', payload })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Storage operation failed');
        return data;
    }

    async listFiles(bucketId: string, _queries: any[] = []): Promise<{ files: any[]; total: number }> {
        const data = await this.request({ action: 'list', bucket: bucketId });
        return { files: data.files || [], total: data.total || 0 };
    }

    private assetUrl(bucketId: string, fileId: string): string {
        return `${this.functionUrl}/asset?bucket=${encodeURIComponent(bucketId)}&fileId=${encodeURIComponent(fileId)}`;
    }

    getFileView(bucketId: string, fileId: string): string {
        return this.assetUrl(bucketId, fileId);
    }

    getFilePreview(bucketId: string, fileId: string, _width?: number, _height?: number): string {
        return this.assetUrl(bucketId, fileId);
    }

    getFileDownload(bucketId: string, fileId: string): string {
        return this.assetUrl(bucketId, fileId);
    }

    async createFile(bucketId: string, fileId: string, file: File): Promise<any> {
        const id = fileId === 'unique()' ? crypto.randomUUID() : fileId;
        const path = `${id}/${safeName(file.name)}`;
        const signed = await this.request({ action: 'upload', bucket: bucketId, path });
        if (!this.client) throw new Error('VITE_SUPABASE_ANON_KEY is required for uploads');
        const result = await this.client.storage.from(bucketId).uploadToSignedUrl(path, signed.token, file, {
            cacheControl: '3600',
            upsert: false,
        });
        if (result.error) throw result.error;
        return {
            $id: id,
            path,
            name: file.name,
            mimeType: file.type,
            sizeOriginal: file.size,
            bucketId,
            $createdAt: new Date().toISOString()
        };
    }

    async deleteFile(bucketId: string, fileId: string): Promise<void> {
        await this.request({ action: 'delete', bucket: bucketId, path: fileId });
    }
}

export function createSupabaseStorageProvider(config: SupabaseStorageConfig) {
    return new SupabaseStorageProvider(config);
}
