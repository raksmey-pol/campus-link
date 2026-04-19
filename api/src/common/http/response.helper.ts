export function ok<T>(data: T, options?: { message?: string }) {
  return {
    success: true,
    message: options?.message ?? 'OK',
    data,
  };
}
