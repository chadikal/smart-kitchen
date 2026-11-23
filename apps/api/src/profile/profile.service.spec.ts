import { Language } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

type Row = {
  id: string;
  authSubject: string | null;
  displayName: string | null;
  preferredLanguage: Language | null;
  welcomeCompletedAt: Date | null;
  email?: string;
};

function memory() {
  const rows: Row[] = [];
  const calls: unknown[] = [];
  const prisma = {
    user: {
      async findUnique(args: { where: { authSubject?: string; id?: string } }) {
        calls.push(args);
        return rows.find((row) => row.authSubject === args.where.authSubject || row.id === args.where.id) ?? null;
      },
      async create(args: { data: { authSubject: string; email?: string } }) {
        calls.push(args);
        if ('email' in args.data) throw new Error('email is not an identity');
        const row: Row = {
          id: `user-${rows.length + 1}`,
          authSubject: args.data.authSubject,
          displayName: null,
          preferredLanguage: null,
          welcomeCompletedAt: null,
        };
        rows.push(row);
        return row;
      },
      async update(args: { where: { id: string }; data: Partial<Row> }) {
        calls.push(args);
        const row = rows.find((item) => item.id === args.where.id);
        if (!row) throw new Error('missing');
        if (args.data.displayName !== undefined) row.displayName = args.data.displayName;
        if (args.data.preferredLanguage !== undefined) row.preferredLanguage = args.data.preferredLanguage;
        if (args.data.welcomeCompletedAt !== undefined) row.welcomeCompletedAt = args.data.welcomeCompletedAt;
        return row;
      },
    },
  };
  return { prisma: prisma as unknown as PrismaService, rows, calls };
}

describe('profile identity', () => {
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';

  it('creates separate users for separate subjects and never looks up email', async () => {
    const store = memory();
    const profiles = new ProfileService(store.prisma);
    const left = await profiles.current(first);
    const again = await profiles.current(first);
    const right = await profiles.current(second);

    expect(again.id).toBe(left.id);
    expect(right.id).not.toBe(left.id);
    expect(JSON.stringify(store.calls)).not.toContain('email');
    expect(store.rows.map((row) => row.authSubject)).toEqual([first, second]);
  });

  it('keeps an existing user id and completes welcome only for that subject', async () => {
    const store = memory();
    store.rows.push({
      id: 'existing-owner',
      authSubject: first,
      displayName: null,
      preferredLanguage: null,
      welcomeCompletedAt: null,
    });
    const profiles = new ProfileService(store.prisma);
    const completed = await profiles.update(first, { displayName: 'Nour', language: 'ar', welcomeCompleted: true });
    const other = await profiles.current(second);

    expect(completed).toEqual({
      id: 'existing-owner',
      displayName: 'Nour',
      language: 'ar',
      welcomeCompleted: true,
    });
    expect(store.rows[0]?.id).toBe('existing-owner');
    expect(other.welcomeCompleted).toBe(false);
    const completedAt = store.rows[0]?.welcomeCompletedAt;
    const repeated = await profiles.update(first, { welcomeCompleted: true });
    expect(repeated.welcomeCompleted).toBe(true);
    expect(store.rows[0]?.welcomeCompletedAt).toBe(completedAt);
  });
});
