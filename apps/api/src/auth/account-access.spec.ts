import { GUARDS_METADATA } from '@nestjs/common/constants';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AccessTokenError, AuthConfigurationError } from './supabase-jwt';
import { SupabaseAuthGuard } from './auth.guard';
import { SupabaseTokenVerifier } from './supabase-token.verifier';
import { ProfileController } from '../profile/profile.controller';
import { ProfileService } from '../profile/profile.service';
import { CatalogController } from '../recipes/catalog.controller';
import { RecipesController } from '../recipes/recipes.controller';

describe('guest recipe routes', () => {
  it('leaves public recipe and catalog routes unauthenticated', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RecipesController)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, CatalogController)).toBeUndefined();
    for (const method of ['list', 'home', 'detail'] as const) {
      expect(Reflect.getMetadata(GUARDS_METADATA, RecipesController.prototype[method])).toBeUndefined();
    }
  });
});

describe('account token rejection', () => {
  let app: INestApplication<App>;
  const current = jest.fn();
  const verify = jest.fn();

  beforeEach(async () => {
    current.mockReset();
    verify.mockReset();
    verify.mockImplementation((token: string) => {
      if (token === 'good-token') return Promise.resolve({ subject: '11111111-1111-4111-8111-111111111111' });
      if (token === 'unconfigured') return Promise.reject(new AuthConfigurationError('SUPABASE_URL is not set.'));
      return Promise.reject(new AccessTokenError());
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        SupabaseAuthGuard,
        { provide: ProfileService, useValue: { current, update: jest.fn() } },
        { provide: SupabaseTokenVerifier, useValue: { verify } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a missing token and a token the verifier refuses', async () => {
    await request(app.getHttpServer()).get('/account').expect(401);
    await request(app.getHttpServer()).get('/account').set('Authorization', 'Bearer forged').expect(401);
    expect(current).not.toHaveBeenCalled();
  });

  it('passes only the verified subject to the profile', async () => {
    current.mockResolvedValue({ id: 'user-1', displayName: null, language: null, welcomeCompleted: false });
    await request(app.getHttpServer())
      .get('/account')
      .set('Authorization', 'Bearer good-token')
      .expect(200)
      .expect({ id: 'user-1', displayName: null, language: null, welcomeCompleted: false });
    expect(current).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('reports missing auth configuration separately from a rejected token', async () => {
    await request(app.getHttpServer()).get('/account').set('Authorization', 'Bearer unconfigured').expect(503);
    expect(current).not.toHaveBeenCalled();
    expect(new UnauthorizedException().getStatus()).toBe(401);
  });
});
