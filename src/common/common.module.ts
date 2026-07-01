import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';

@Global()
@Module({
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class CommonModule {}
