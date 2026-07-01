import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_AUTH_KEY } from '../decorators/api-key-auth.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresApiKey = this.reflector.getAllAndOverride<boolean>(
      API_KEY_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiresApiKey) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    if (!request.merchantId) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
