import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [VerifyController],
  providers: [VerifyService],
})
export class VerifyModule {}
