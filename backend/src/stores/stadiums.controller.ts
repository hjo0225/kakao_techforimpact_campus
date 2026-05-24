import { Controller, Get, Param } from '@nestjs/common';
import { StoresService } from './stores.service';

@Controller('stadiums')
export class StadiumsController {
  constructor(private readonly storesService: StoresService) {}

  @Get(':stadiumCode/floors')
  findFloors(@Param('stadiumCode') stadiumCode: string) {
    return this.storesService.findFloors(stadiumCode);
  }
}
