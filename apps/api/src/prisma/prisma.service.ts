import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Database access for later milestones.
 * The client connects on the first query, so GET /health can run before PostgreSQL is available.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.',
      );
    }

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
