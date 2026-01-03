/**
 * Cloudflare R2 Storage Provider
 * Implements storage using Cloudflare R2 (S3-compatible)
 * Note: This requires a backend proxy for secure credential handling
 */

import { IStorageProvider } from './interface.js';

/**
 * Cloudflare R2 Storage Provider
 * Uses pre-signed URLs or a proxy endpoint for secure file operations
 */
export class CloudflareR2StorageProvider extends IStorageProvider {
    constructor(config) {
        super();
        this.endpoint = config.endpoint;
        this.bucketName = config.bucketName;
        this.publicUrl = config.publicUrl;
        // Note: Access keys should never be exposed to the browser
        // Use a backend proxy to generate signed URLs
    }

    async listFiles(bucketId, queries = []) {
        // This would typically call a backend API that interfaces with R2
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

    getFileView(bucketId, fileId) {
        // Return public URL for viewing
        return `${this.publicUrl}/${bucketId || this.bucketName}/${fileId}`;
    }

    getFilePreview(bucketId, fileId, width = 600, height = 400) {
        // R2 doesn't have built-in image transformation
        // You would use Cloudflare Images or a third-party service
        return this.getFileView(bucketId, fileId);
    }

    getFileDownload(bucketId, fileId) {
        // For downloads, you might need a signed URL
        return `${this.endpoint}/api/storage/download?bucket=${bucketId || this.bucketName}&file=${fileId}`;
    }

    async createFile(bucketId, fileId, file) {
        // Get a pre-signed upload URL from backend
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

        // Upload directly to R2 using pre-signed URL
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

    async deleteFile(bucketId, fileId) {
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
 * @param {Object} config - R2 configuration
 * @returns {{storage: CloudflareR2StorageProvider}}
 */
export function createCloudflareR2Provider(config) {
    return {
        auth: null, // R2 is storage only
        database: null,
        storage: new CloudflareR2StorageProvider(config)
    };
}
