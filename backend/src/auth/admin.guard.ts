import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseBigIntId } from '../stores/stores.utils';

interface AuthedRequest {
  user?: {
    userId?: string;
    role?: 'USER' | 'ADMIN';
  };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parseBigIntId(userId, 'userId') },
      select: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    request.user = {
      ...request.user,
      role: user.role,
    };

    return true;
  }
}
