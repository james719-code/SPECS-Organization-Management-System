export class ApiError extends Error {
  code: string;
  cause: any;
  timestamp: string;

  constructor(code: string, message: string, cause: any = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      cause: this.cause?.message || String(this.cause)
    };
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CREATE_FAILED: 'CREATE_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  FETCH_FAILED: 'FETCH_FAILED'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function mapAppwriteError(error: any): ErrorCode {
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

export function createApiError(error: any, operation: string): ApiError {
  const code = mapAppwriteError(error);
  const message = `${operation}: ${error?.message || 'Unknown error'}`;
  return new ApiError(code, message, error);
}
