export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
};

type OkResponseOptions = {
  message?: string;
  meta?: Record<string, unknown>;
};

export function ok<T>(
  data: T,
  options?: OkResponseOptions,
): ApiSuccessResponse<T> {
  return {
    success: true,
    message: options?.message ?? 'Request successful',
    data,
    ...(options?.meta ? { meta: options.meta } : {}),
    timestamp: new Date().toISOString(),
  };
}
