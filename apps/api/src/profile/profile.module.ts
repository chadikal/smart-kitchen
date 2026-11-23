import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/auth.guard';
import { SupabaseTokenVerifier } from '../auth/supabase-token.verifier';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService, SupabaseAuthGuard, SupabaseTokenVerifier],
})
export class ProfileModule {}
