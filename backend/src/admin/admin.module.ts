import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminGuard, AdminService],
})
export class AdminModule {}
