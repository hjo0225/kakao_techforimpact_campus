import { Controller, Get, Param, Query } from '@nestjs/common';
import { FindStoresDto } from './dto/find-stores.dto';
import { FindTenantStoresDto } from './dto/find-tenant-stores.dto';
import { StoresService } from './stores.service';

@Controller()
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('stores')
  findStores(@Query() query: FindStoresDto) {
    return this.storesService.findStores(query);
  }

  @Get('stores/:assignmentId')
  findStoreDetail(@Param('assignmentId') assignmentId: string) {
    return this.storesService.findStoreDetail(assignmentId);
  }

  @Get('tenant-stores')
  findTenantStores(@Query() query: FindTenantStoresDto) {
    return this.storesService.findTenantStores(query);
  }
}
