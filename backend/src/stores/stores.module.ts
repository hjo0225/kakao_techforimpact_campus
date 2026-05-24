import { Module } from '@nestjs/common';
import { StadiumsController } from './stadiums.controller';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  controllers: [StadiumsController, StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
