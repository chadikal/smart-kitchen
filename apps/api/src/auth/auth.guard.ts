import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthConfigurationError } from './supabase-jwt';
import { SupabaseTokenVerifier } from './supabase-token.verifier';

export type AuthenticatedRequest = Request & { authSubject?: string };

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly tokens: SupabaseTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = bearerToken(header);
    if (!token) throw new UnauthorizedException();
    try {
      const verified = await this.tokens.verify(token);
      request.authSubject = verified.subject;
      return true;
    } catch (error) {
      if (error instanceof AuthConfigurationError) throw new ServiceUnavailableException();
      throw new UnauthorizedException();
    }
  }
}

export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, extra] = header.split(' ');
  if (scheme !== 'Bearer' || !token || extra !== undefined || token.length > 8192) return null;
  return token;
}
