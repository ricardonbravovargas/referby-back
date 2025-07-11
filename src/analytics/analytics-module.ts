// src/analytics/analytics.module.ts - CREAR ESTE ARCHIVO
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics-controller';
import { AnalyticsService } from './analytics-service';
import { User } from '../entities/user.entity';
import { Producto } from '../entities/producto.entitiy';
import { Empresa } from '../entities/empresa.entitiy';

@Module({
  imports: [TypeOrmModule.forFeature([User, Producto, Empresa])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
