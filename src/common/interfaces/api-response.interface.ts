export type ApiResponseStatus = 'success' | 'error';

export interface ApiResponse<T = unknown> {
  status: ApiResponseStatus;
  data: T;
  message: string;
}

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.status === 'success' || candidate.status === 'error') &&
    'data' in candidate &&
    typeof candidate.message === 'string'
  );
}

export function buildSuccessResponse<T>(
  data: T,
  message: string,
): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
  };
}

export function buildErrorResponse(
  message: string,
  data: unknown = null,
): ApiResponse<unknown> {
  return {
    status: 'error',
    data,
    message,
  };
}
