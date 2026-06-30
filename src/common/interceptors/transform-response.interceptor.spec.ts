import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  const reflector = new Reflector();
  const interceptor = new TransformResponseInterceptor(reflector);

  const createContext = (method = 'GET'): ExecutionContext =>
    ({
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ method }),
      }),
    }) as ExecutionContext;

  const createHandler = (value: unknown) => ({
    handle: () => of(value),
  });

  it('wraps handler data in the standard response shape', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(createContext('GET'), createHandler({ id: '1' })),
    );

    expect(result).toEqual({
      status: 'success',
      data: { id: '1' },
      message: 'Request successful',
    });
  });

  it('does not double-wrap responses that are already structured', async () => {
    const structured = {
      status: 'success' as const,
      data: { ok: true },
      message: 'Already wrapped',
    };

    const result = await lastValueFrom(
      interceptor.intercept(createContext('GET'), createHandler(structured)),
    );

    expect(result).toBe(structured);
  });

  it('uses null for undefined handler results', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(createContext('POST'), createHandler(undefined)),
    );

    expect(result).toEqual({
      status: 'success',
      data: null,
      message: 'Resource created successfully',
    });
  });
});
