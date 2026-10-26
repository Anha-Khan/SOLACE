/**
 * The response envelope every endpoint returns. Mirrored in openapi.yaml.
 * Success: { success: true,  data: {...}, timestamp, error: null }
 * Error:   { success: false, data: null, timestamp, error: { code, message } }
 */
export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  timestamp: string;
  error: ApiErrorBody | null;
}

export function successEnvelope<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    error: null,
  };
}

export function errorEnvelope(code: string, message: string): ApiEnvelope<never> {
  return {
    success: false,
    data: null,
    timestamp: new Date().toISOString(),
    error: { code, message },
  };
}
