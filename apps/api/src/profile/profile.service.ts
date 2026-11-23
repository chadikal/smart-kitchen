import { ConflictException, Injectable } from '@nestjs/common';
import { Language, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilePatch, PublicLanguage } from './profile-update';

export type AccountProfile = {
  id: string;
  displayName: string | null;
  language: PublicLanguage | null;
  welcomeCompleted: boolean;
};

type ProfileRow = {
  id: string;
  displayName: string | null;
  preferredLanguage: Language | null;
  welcomeCompletedAt: Date | null;
};

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async current(subject: string): Promise<AccountProfile> {
    const row = await this.findOrCreate(subject);
    return present(row);
  }

  async update(subject: string, patch: ProfilePatch): Promise<AccountProfile> {
    const existing = await this.findOrCreate(subject);
    const row = await this.prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName: patch.displayName,
        preferredLanguage: patch.language ? toDatabaseLanguage(patch.language) : undefined,
        welcomeCompletedAt:
          patch.welcomeCompleted && !existing.welcomeCompletedAt ? new Date() : undefined,
      },
      select: profileSelect,
    });
    return present(row);
  }

  private async findOrCreate(subject: string): Promise<ProfileRow> {
    const found = await this.prisma.user.findUnique({
      where: { authSubject: subject },
      select: profileSelect,
    });
    if (found) return found;
    try {
      return await this.prisma.user.create({
        data: { authSubject: subject },
        select: profileSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.user.findUnique({
          where: { authSubject: subject },
          select: profileSelect,
        });
        if (raced) return raced;
      }
      throw new ConflictException();
    }
  }
}

const profileSelect = {
  id: true,
  displayName: true,
  preferredLanguage: true,
  welcomeCompletedAt: true,
} as const;

function present(row: ProfileRow): AccountProfile {
  return {
    id: row.id,
    displayName: row.displayName,
    language: row.preferredLanguage === 'EN' ? 'en' : row.preferredLanguage === 'AR' ? 'ar' : null,
    welcomeCompleted: row.welcomeCompletedAt !== null,
  };
}

function toDatabaseLanguage(language: PublicLanguage): Language {
  return language === 'ar' ? 'AR' : 'EN';
}
