// src/analytics/analytics.controller.ts - CREAR ESTE ARCHIVO
import {
  Controller,
  Get,
  UseGuards,
  Query,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics-service';
import { UserRole } from '../auth/roles.enum';
import { UserAnalyticsResponse } from './analytics.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('users')
  async getUserAnalytics(
    @Req() req: any,
    @Query('roles') roles?: string,
    @Query('dateStart') dateStart?: string,
    @Query('dateEnd') dateEnd?: string,
  ): Promise<UserAnalyticsResponse> {
    // Especifica el tipo de retorno
    const userRole = req.user?.role || req.user?.rol;
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden acceder a analytics',
      );
    }

    const filters = {
      roles: roles ? roles.split(',') : undefined,
      dateStart: dateStart ? new Date(dateStart) : undefined,
      dateEnd: dateEnd ? new Date(dateEnd) : undefined,
    };

    return this.analyticsService.getUserAnalytics(filters);
  }

  @Get('dashboard')
  async getDashboardStats(@Req() req: any) {
    // VERIFICAR QUE SOLO ADMINS PUEDAN ACCEDER
    const userRole = req.user?.role || req.user?.rol;
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden acceder a analytics',
      );
    }

    return this.analyticsService.getDashboardStats();
  }

  @Get('products')
  async getProductAnalytics(@Req() req: any) {
    const userRole = req.user?.role || req.user?.rol;
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden acceder a analytics',
      );
    }

    return this.analyticsService.getProductAnalytics();
  }

  @Get('companies')
  async getCompanyAnalytics(@Req() req: any) {
    const userRole = req.user?.role || req.user?.rol;
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden acceder a analytics',
      );
    }

    return this.analyticsService.getCompanyAnalytics();
  }
}
