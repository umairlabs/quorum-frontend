import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Recursively converts all object keys from snake_case to camelCase.
 * Handles nested objects and arrays at any depth.
 */
function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function transformKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(transformKeys);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce(
      (acc: Record<string, unknown>, [k, v]) => {
        acc[toCamelCase(k)] = transformKeys(v);
        return acc;
      },
      {}
    );
  }

  return value;
}

/**
 * Intercepts all HTTP responses and deep-converts snake_case keys → camelCase.
 * This bridges Django REST Framework's snake_case output with Angular's camelCase interfaces.
 */
export const camelCaseInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event) => {
      if (
        event instanceof HttpResponse &&
        event.body !== null &&
        req.responseType === 'json'
      ) {
        return event.clone({ body: transformKeys(event.body) });
      }
      return event;
    })
  );

