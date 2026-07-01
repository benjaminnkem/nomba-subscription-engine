import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const requestId = request.headers['x-request-id'] ?? uuidv4();
    const traceId = request.headers['x-trace-id'] ?? uuidv4();
    request.requestId = requestId;
    request.traceId = traceId;

    const { method, url } = request;
    const merchantId =
      request.user?.merchantId ?? request.merchantId ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const duration = Date.now() - start;
        const status = response.statusCode ?? 500;
        const message = this.formatLogMessage({
          method,
          url,
          status,
          duration,
          merchantId,
          requestId,
          traceId,
        });

        if (status >= 400) {
          this.logger.warn(message);
        } else {
          this.logger.log(message);
        }
      }),
    );
  }

  private formatLogMessage({
    method,
    url,
    status,
    duration,
    merchantId,
    requestId,
    traceId,
  }: {
    method: string;
    url: string;
    status: number;
    duration: number;
    merchantId: string;
    requestId: string;
    traceId: string;
  }): string {
    const methodLabel = method.padEnd(7);
    const statusLabel = String(status).padStart(3);
    const durationLabel = `${duration}ms`.padStart(7);

    return [
      `[HTTP] ${methodLabel} ${url}`,
      `${statusLabel} ${durationLabel}`,
      `merchant=${merchantId}`,
      `requestId=${requestId}`,
      `traceId=${traceId}`,
    ].join(' | ');
  }
}
