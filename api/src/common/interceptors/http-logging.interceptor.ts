import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 6;
const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'password',
  'password_hash',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'idtoken',
  'id_token',
  'token',
  'secret',
  'jwt_secret',
  'jwt_refresh_secret',
]);

function resolveResourceRoute(request: Request): string {
  const routePath = request.route?.path;

  if (typeof routePath === 'string') {
    const normalizedBase = request.baseUrl ?? '';
    return `${normalizedBase}${routePath}` || '/';
  }

  return request.path ?? request.url;
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
}

function sanitizeForLog(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'symbol'
  ) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Buffer) {
    return `[Buffer(${value.length})]`;
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return `[Array(${value.length})]`;
    }

    return value.map((item) => sanitizeForLog(item, depth + 1, seen));
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;

    if (seen.has(objectValue)) {
      return '[Circular]';
    }

    seen.add(objectValue);

    if (depth >= MAX_DEPTH) {
      return '[Object]';
    }

    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(objectValue)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObject[key] = REDACTED_VALUE;
      } else {
        sanitizedObject[key] = sanitizeForLog(nestedValue, depth + 1, seen);
      }
    }

    return sanitizedObject;
  }

  return '[UnserializableValue]';
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const startedAt = Date.now();
    const method = request.method;
    const resourceRoute = resolveResourceRoute(request);
    const requestPath = request.originalUrl ?? request.url;

    const requestLogPayload = {
      method,
      resourceRoute,
      requestPath,
      payload: sanitizeForLog({
        params: request.params,
        query: request.query,
        body: request.body,
      }),
      headers: sanitizeForLog({
        authorization: request.headers.authorization,
        'user-agent': request.headers['user-agent'],
        'x-request-id': request.headers['x-request-id'],
      }),
    };

    this.logger.log(`REQUEST ${JSON.stringify(requestLogPayload)}`);

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          const durationMs = Date.now() - startedAt;
          const responseLogPayload = {
            method,
            resourceRoute,
            requestPath,
            statusCode: response.statusCode,
            durationMs,
            response: sanitizeForLog(data),
          };

          this.logger.log(`RESPONSE ${JSON.stringify(responseLogPayload)}`);
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - startedAt;
          const statusCode = response.statusCode;

          const errorPayload =
            error instanceof Error
              ? { name: error.name, message: error.message }
              : error;

          this.logger.error(
            `ERROR ${JSON.stringify({
              method,
              resourceRoute,
              requestPath,
              statusCode,
              durationMs,
              error: sanitizeForLog(errorPayload),
            })}`,
            error instanceof Error ? error.stack : undefined,
          );
        },
      }),
    );
  }
}
