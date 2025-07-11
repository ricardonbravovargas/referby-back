import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmpresaAnalyticsService } from './empresa-analytics.service';

@Controller('empresa/analytics')
@UseGuards(JwtAuthGuard)
export class EmpresaAnalyticsController {
  constructor(
    private readonly empresaAnalyticsService: EmpresaAnalyticsService,
  ) {}

  @Get('stats')
  async getEmpresaStats(@Req() req: any) {
    try {
      console.log('Request user:', req.user);

      if (!req.user) {
        throw new ForbiddenException('Usuario no autenticado');
      }

      const userRole = (req.user.role || req.user.rol || '').toLowerCase();
      console.log('User role:', userRole);

      if (userRole !== 'empresa') {
        throw new ForbiddenException(
          'Solo las empresas pueden acceder a estas estadísticas',
        );
      }

      const userId = req.user.id || req.user.sub;
      console.log('User ID:', userId);

      return await this.empresaAnalyticsService.getEmpresaStats(userId);
    } catch (error) {
      console.error('Error en getEmpresaStats:', error);
      throw error;
    }
  }

  @Get('productos')
  async getProductosStats(@Req() req: any) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Usuario no autenticado');
      }

      const userRole = (req.user.role || req.user.rol || '').toLowerCase();

      if (userRole !== 'empresa') {
        throw new ForbiddenException(
          'Solo las empresas pueden acceder a estas estadísticas',
        );
      }

      const userId = req.user.id || req.user.sub;
      return await this.empresaAnalyticsService.getProductosStats(userId);
    } catch (error) {
      console.error('Error en getProductosStats:', error);
      throw error;
    }
  }

  @Get('ventas-recientes')
  async getVentasRecientes(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Usuario no autenticado');
      }

      const userRole = (req.user.role || req.user.rol || '').toLowerCase();

      if (userRole !== 'empresa') {
        throw new ForbiddenException(
          'Solo las empresas pueden acceder a estas estadísticas',
        );
      }

      const userId = req.user.id || req.user.sub;
      return await this.empresaAnalyticsService.getVentasRecientes(
        userId,
        limit,
        offset,
      );
    } catch (error) {
      console.error('Error en getVentasRecientes:', error);
      throw error;
    }
  }

  @Get('vendedores')
  async getVendedoresStats(@Req() req: any) {
    try {
      console.log('Getting vendedores stats, req.user:', req.user);

      if (!req.user) {
        throw new ForbiddenException('Usuario no autenticado');
      }

      const userRole = (req.user.role || req.user.rol || '').toLowerCase();

      if (userRole !== 'empresa') {
        throw new ForbiddenException(
          'Solo las empresas pueden acceder a estas estadísticas',
        );
      }

      const userId = req.user.id || req.user.sub;
      return await this.empresaAnalyticsService.getVendedoresStats(userId);
    } catch (error) {
      console.error('Error en getVendedoresStats:', error);
      throw error;
    }
  }

  @Get('resumen-mensual')
  async getResumenMensual(
    @Req() req: any,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Usuario no autenticado');
      }

      const userRole = (req.user.role || req.user.rol || '').toLowerCase();

      if (userRole !== 'empresa') {
        throw new ForbiddenException(
          'Solo las empresas pueden acceder a estas estadísticas',
        );
      }

      const userId = req.user.id || req.user.sub;
      return await this.empresaAnalyticsService.getResumenMensual(
        userId,
        year,
        month,
      );
    } catch (error) {
      console.error('Error en getResumenMensual:', error);
      throw error;
    }
  }
}
