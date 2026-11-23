import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import {
  AuthConfigurationError,
  supabaseAuthIssuer,
  supabaseAudience,
  verifySupabaseAccessToken,
} from './supabase-jwt';

@Injectable()
export class SupabaseTokenVerifier {
  private keys?: JWTVerifyGetKey;
  private issuer?: string;

  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<{ subject: string }> {
    const projectUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    if (!projectUrl) throw new AuthConfigurationError('SUPABASE_URL is not set.');
    if (!this.keys || !this.issuer) {
      this.issuer = supabaseAuthIssuer(projectUrl);
      this.keys = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    }
    return verifySupabaseAccessToken(token, {
      issuer: this.issuer,
      audience: supabaseAudience,
      key: this.keys,
    });
  }
}
