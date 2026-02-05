/**
 * Custom error classes for API operations
 * Provides typed errors for better error handling in UI
 */

/**
 * Base API error class
 */
export class ApiError extends Error {
    /**
     * @param {string} code - Error code for programmatic handling
     * @param {string} message - Human-readable error message
     * @param {Error} [cause] - Original error that caused this
     */
    constructor(code, message, cause = null) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.cause = cause;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Convert to plain object for logging/serialization
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            cause: this.cause?.message
        };
    }
}

/**
 * Error codes for common API failures
 */
export const ErrorCodes = {
    // Network/Connection
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    
    // Authentication
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    
    // Authorization
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    
    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    
    // Server
    SERVER_ERROR: 'SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    
    // Operations
    CREATE_FAILED: 'CREATE_FAILED',
    UPDATE_FAILED: 'UPDATE_FAILED',
    DELETE_FAILED: 'DELETE_FAILED',
    FETCH_FAILED: 'FETCH_FAILED'
};

/**
 * Map Appwrite error codes to our error codes
 * @param {Error} error - Appwrite SDK error
 * @returns {string} Mapped error code
 */
export function mapAppwriteError(error) {
    const code = error?.code || error?.type;
    
    switch (code) {
        case 401:
        case 'user_unauthorized':
            return ErrorCodes.NOT_AUTHENTICATED;
        case 403:
        case 'user_forbidden':
            return ErrorCodes.FORBIDDEN;
        case 404:
        case 'document_not_found':
        case 'collection_not_found':
            return ErrorCodes.NOT_FOUND;
        case 409:
        case 'document_already_exists':
            return ErrorCodes.ALREADY_EXISTS;
        case 400:
        case 'general_argument_invalid':
            return ErrorCodes.VALIDATION_ERROR;
        case 500:
        case 'general_server_error':
            return ErrorCodes.SERVER_ERROR;
        case 503:
            return ErrorCodes.SERVICE_UNAVAILABLE;
        default:
            if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
                return ErrorCodes.NETWORK_ERROR;
            }
            return ErrorCodes.SERVER_ERROR;
    }
}

/**
 * Create an ApiError from an Appwrite error
 * @param {Error} error - Original error
 * @param {string} operation - Description of what operation failed
 * @returns {ApiError}
 */
export function createApiError(error, operation) {
    const code = mapAppwriteError(error);
    const message = `${operation}: ${error?.message || 'Unknown error'}`;
    return new ApiError(code, message, error);
}
