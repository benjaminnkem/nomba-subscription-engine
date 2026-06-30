import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { buildErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, data } = this.extractErrorDetails(exception);

    response.status(status).json(buildErrorResponse(message, data));
  }

  private extractErrorDetails(exception: unknown): {
    message: string;
    data: unknown;
  } {
    if (!(exception instanceof HttpException)) {
      return {
        message: 'Internal server error',
        data: null,
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        data: null,
      };
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const payload = exceptionResponse as Record<string, unknown>;
      const rawMessage = payload.message;

      if (Array.isArray(rawMessage)) {
        return {
          message: 'Validation failed',
          data: { errors: rawMessage },
        };
      }

      if (typeof rawMessage === 'string') {
        return {
          message: rawMessage,
          data: payload.error ? { error: payload.error } : null,
        };
      }
    }

    return {
      message: 'Request failed',
      data: null,
    };
  }
}
