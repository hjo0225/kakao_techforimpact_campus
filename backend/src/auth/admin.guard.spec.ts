import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

describe('AdminGuard', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const createContext = (userId: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId },
        }),
      }),
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('non-admin 사용자를 거부한다', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.USER });
    const guard = new AdminGuard(prisma as never);

    await expect(guard.canActivate(createContext('1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('admin 사용자는 통과시킨다', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
    const guard = new AdminGuard(prisma as never);

    await expect(guard.canActivate(createContext('1'))).resolves.toBe(true);
  });
});
