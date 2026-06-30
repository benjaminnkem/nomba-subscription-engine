import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] ?? uuidv4();
    const traceId = request.headers['x-trace-id'] ?? uuidv4();
    request.requestId = requestId;
    request.traceId = traceId;
    const { method, url } = request;
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const merchantId =
          request.user?.merchantId ?? request.merchantId ?? 'anonymous';
        console.log(
          JSON.stringify({
            requestId,
            traceId,
            merchantId,
            method,
            url,
            duration,
          }),
        );
      }),
    );
  }
}
