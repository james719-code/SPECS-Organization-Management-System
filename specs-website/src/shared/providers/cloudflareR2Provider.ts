/**
 * Cloudflare R2 Storage Provider
 * Implements storage using Cloudflare R2 (S3-compatible)
 * Note: This requires a backend proxy for secure credential handling
 */

import { IStorageProvider } from './interface';

interface R2Config {
    endpoint: string;
    bucketName: string;
    publicUrl: string;
}

/**
 * Cloudflare R2 Storage Provider
 * Uses pre-signed URLs or a proxy endpoint for secure file operations
 */
export class CloudflareR2StorageProvider extends IStorageProvider {
    private endpoint: string;
    private bucketName: string;
    private publicUrl: string;

    constructor(config: R2Config) {
        super();
        this.endpoint = config.endpoint;
        this.bucketName = config.bucketName;
        this.publicUrl = config.publicUrl;
    }

    async listFiles(bucketId?: string, queries: any[] = []): Promise<{ files: any[]; total: number }> {
        const response = await fetch(`${this.endpoint}/api/storage/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: bucketId || this.bucketName, queries })
        });

        if (!response.ok) {
            throw new Error('Failed to list files');
        }

        const data = await response.json();
        return {
            files: data.files || [],
            total: data.total || 0
        };
    }

    getFileView(bucketId: string | null, fileId: string): string {
        return `${this.publicUrl}/${bucketId || this.bucketName}/${fileId}`;
    }

    getFilePreview(bucketId: string | null, fileId: string, _width?: number, _height?: number): string {
        return this.getFileView(bucketId, fileId);
    }

    getFileDownload(bucketId: string | null, fileId: string): string {
        return `${this.endpoint}/api/storage/download?bucket=${bucketId || this.bucketName}&file=${fileId}`;
    }

    async createFile(bucketId: string | null, fileId: string, file: File): Promise<any> {
        const presignResponse = await fetch(`${this.endpoint}/api/storage/presign-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bucket: bucketId || this.bucketName,
                fileId: fileId === 'unique()' ? crypto.randomUUID() : fileId,
                contentType: file.type,
                fileName: file.name
            })
        });

        if (!presignResponse.ok) {
            throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, finalFileId } = await presignResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file');
        }

        return {
            $id: finalFileId,
            $createdAt: new Date().toISOString(),
            name: file.name,
            mimeType: file.type,
            sizeOriginal: file.size,
            bucketId: bucketId || this.bucketName
        };
    }

    async deleteFile(bucketId: string | null, fileId: string): Promise<void> {
        const response = await fetch(`${this.endpoint}/api/storage/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bucket: bucketId || this.bucketName,
                fileId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }
}

/**
 * Create Cloudflare R2 provider from configuration
 */
export function createCloudflareR2Provider(config: R2Config) {
    return {
        auth: null,
        database: null,
        storage: new CloudflareR2StorageProvider(config)
    };
}
