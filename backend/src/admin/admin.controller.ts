import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

type AdminBody = Record<string, unknown>;

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('store-slots')
  listStoreSlots(@Query() query: AdminBody) {
    return this.adminService.listStoreSlots(query);
  }

  @Post('store-slots')
  createStoreSlot(@Body() body: AdminBody) {
    return this.adminService.createStoreSlot(body);
  }

  @Patch('store-slots/:id')
  patchStoreSlot(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchStoreSlot(id, body);
  }

  @Delete('store-slots/:id')
  deleteStoreSlot(@Param('id') id: string) {
    return this.adminService.deleteStoreSlot(id);
  }

  @Get('tenant-stores')
  listTenantStores() {
    return this.adminService.listTenantStores();
  }

  @Post('tenant-stores')
  createTenantStore(@Body() body: AdminBody) {
    return this.adminService.createTenantStore(body);
  }

  @Patch('tenant-stores/:id')
  patchTenantStore(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchTenantStore(id, body);
  }

  @Delete('tenant-stores/:id')
  deleteTenantStore(@Param('id') id: string) {
    return this.adminService.deleteTenantStore(id);
  }

  @Post('tenant-stores/:tenantStoreId/menu-items')
  createTenantMenuItem(
    @Param('tenantStoreId') tenantStoreId: string,
    @Body() body: AdminBody,
  ) {
    return this.adminService.createTenantMenuItem(tenantStoreId, body);
  }

  @Get('store-assignments')
  listStoreAssignments() {
    return this.adminService.listStoreAssignments();
  }

  @Post('store-assignments')
  createStoreAssignment(@Body() body: AdminBody) {
    return this.adminService.createStoreAssignment(body);
  }

  @Patch('store-assignments/:id')
  patchStoreAssignment(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchStoreAssignment(id, body);
  }

  @Delete('store-assignments/:id')
  deleteStoreAssignment(@Param('id') id: string) {
    return this.adminService.deleteStoreAssignment(id);
  }

  @Post('store-assignments/:assignmentId/menu-offerings')
  createStoreMenuOffering(
    @Param('assignmentId') assignmentId: string,
    @Body() body: AdminBody,
  ) {
    return this.adminService.createStoreMenuOffering(assignmentId, body);
  }

  @Post('store-assignments/:assignmentId/operating-rules')
  createStoreOperatingRule(
    @Param('assignmentId') assignmentId: string,
    @Body() body: AdminBody,
  ) {
    return this.adminService.createStoreOperatingRule(assignmentId, body);
  }

  @Get('tenant-menu-items')
  listTenantMenuItems() {
    return this.adminService.listTenantMenuItems();
  }

  @Patch('tenant-menu-items/:id')
  patchTenantMenuItem(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchTenantMenuItem(id, body);
  }

  @Delete('tenant-menu-items/:id')
  deleteTenantMenuItem(@Param('id') id: string) {
    return this.adminService.deleteTenantMenuItem(id);
  }

  @Get('store-menu-offerings')
  listStoreMenuOfferings() {
    return this.adminService.listStoreMenuOfferings();
  }

  @Patch('store-menu-offerings/:id')
  patchStoreMenuOffering(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchStoreMenuOffering(id, body);
  }

  @Delete('store-menu-offerings/:id')
  deleteStoreMenuOffering(@Param('id') id: string) {
    return this.adminService.deleteStoreMenuOffering(id);
  }

  @Get('store-operating-rules')
  listStoreOperatingRules() {
    return this.adminService.listStoreOperatingRules();
  }

  @Patch('store-operating-rules/:id')
  patchStoreOperatingRule(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchStoreOperatingRule(id, body);
  }

  @Delete('store-operating-rules/:id')
  deleteStoreOperatingRule(@Param('id') id: string) {
    return this.adminService.deleteStoreOperatingRule(id);
  }

  @Get('store-notices')
  listStoreNotices() {
    return this.adminService.listStoreNotices();
  }

  @Post('store-notices')
  createStoreNotice(@Body() body: AdminBody) {
    return this.adminService.createStoreNotice(body);
  }

  @Patch('store-notices/:id')
  patchStoreNotice(@Param('id') id: string, @Body() body: AdminBody) {
    return this.adminService.patchStoreNotice(id, body);
  }

  @Delete('store-notices/:id')
  deleteStoreNotice(@Param('id') id: string) {
    return this.adminService.deleteStoreNotice(id);
  }
}
