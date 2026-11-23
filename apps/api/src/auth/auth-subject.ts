import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from './auth.guard';

export const AuthSubject = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.authSubject) throw new UnauthorizedException();
  return request.authSubject;
});
