import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthSubject } from '../auth/auth-subject';
import { SupabaseAuthGuard } from '../auth/auth.guard';
import { parseProfilePatch, ProfileInputError } from './profile-update';
import { AccountProfile, ProfileService } from './profile.service';

@Controller('account')
@UseGuards(SupabaseAuthGuard)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  current(@AuthSubject() subject: string): Promise<AccountProfile> {
    return this.profiles.current(subject);
  }

  @Patch()
  update(@AuthSubject() subject: string, @Body() body: unknown): Promise<AccountProfile> {
    try {
      return this.profiles.update(subject, parseProfilePatch(body));
    } catch (error) {
      if (error instanceof ProfileInputError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
