import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { VisitCardShareController } from './visit-card-share.controller';
import { VisitCardsController } from './visit-cards.controller';
import { VisitCardsService } from './visit-cards.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [VisitCardsController, VisitCardShareController],
  providers: [VisitCardsService],
})
export class VisitCardsModule {}
