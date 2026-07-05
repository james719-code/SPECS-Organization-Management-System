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
  if (error?.message?.includes('missing scopes') || error?.message?.includes('guests')) {
    return ErrorCodes.NOT_AUTHENTICATED;
  }

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

  if (code === ErrorCodes.NOT_AUTHENTICATED) {
    // Clear caches
    try {
      localStorage.removeItem('specs_data_cache');
      localStorage.removeItem('specs_image_cache');
    } catch (e) {
      console.warn('Failed to clear cache on auth failure', e);
    }
    
    // Redirect to login page only if not on a public route
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const isPublic = 
        path === '/' || 
        path === '/login' || 
        path === '/signup' || 
        path === '/forgot-password' || 
        path.startsWith('/story/');
      
      if (!isPublic) {
        console.warn('[API] Unauthenticated request detected. Redirecting to /login.');
        window.location.href = '/login';
      }
    }
  }

  const message = `${operation}: ${error?.message || 'Unknown error'}`;
  return new ApiError(code, message, error);
}
